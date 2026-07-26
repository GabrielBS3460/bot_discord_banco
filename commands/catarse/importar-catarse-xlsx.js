const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const XLSX = require("xlsx");
const catarseRepo = require("../../repositories/CatarseRepository.js");
const catarseService = require("../../services/CatarseService.js");

const COL = {
    nomeCompleto: 0, emailCatarse: 4, pagamentoMensal: 5,
    totalPago: 8, statusAssinatura: 9, dataInicio: 12,
};

function parseDateValue(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "number") {
        const dateCode = XLSX.SSF.parse_date_code(value);
        if (!dateCode) return null;
        return new Date(dateCode.y, dateCode.m - 1, dateCode.d, dateCode.H, dateCode.M, dateCode.S);
    }
    const text = String(value).trim();
    if (!text) return null;

    const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (brDate) {
        const day = Number(brDate[1]), month = Number(brDate[2]), year = Number(brDate[3].length === 2 ? `20${brDate[3]}` : brDate[3]);
        const parsed = new Date(year, month - 1, day);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateMonths(startDate) {
    if (!startDate) return null;
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    if (diffMs < 0) return 0;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Number((diffDays / 30.4375).toFixed(1));
}

async function readAttachmentBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Não foi possível baixar o arquivo da planilha.");
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

function mapRowToRecord(row) {
    const nomeCompleto = String(row[COL.nomeCompleto] || "").trim();
    const email = catarseService.normalizeEmail(row[COL.emailCatarse]);
    const totalPago = catarseService.parseCurrencyLike(row[COL.totalPago]);
    const pagamentoMensal = catarseService.parseCurrencyLike(row[COL.pagamentoMensal]);
    const status = String(row[COL.statusAssinatura] || "").trim();
    const dataInicioDate = parseDateValue(row[COL.dataInicio]);

    return {
        id: email,
        nome: nomeCompleto,
        email,
        pagamentoMensal,
        totalPago,
        status,
        dataDeInicio: dataInicioDate ? dataInicioDate.toISOString().slice(0, 10) : null,
        mesesAssinante: calculateMonths(dataInicioDate),
    };
}

async function execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD, ID_CARGO_CORRETOR }) {
    const temPermissao =
        interaction.member.roles.cache.has(ID_CARGO_ADMIN) ||
        interaction.member.roles.cache.has(ID_CARGO_MOD) ||
        interaction.member.roles.cache.has(ID_CARGO_CORRETOR);

    if (!temPermissao) {
        return interaction.reply({
            content: "🚫 Você não tem permissão para usar este comando.",
            flags: MessageFlags.Ephemeral
        });
    }

    const attachment = interaction.options.getAttachment("arquivo", true);
    const fileName = String(attachment.name || "").toLowerCase();

    if (!fileName.endsWith(".xlsx")) {
        return interaction.reply({ content: "Envie um arquivo .xlsx.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const buffer = await readAttachmentBuffer(attachment.url);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
        return interaction.editReply({ content: "A planilha está vazia." });
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: "" });

    const existingRows = await catarseRepo.listarAssinantes();
    const existingById = new Map(existingRows.map(item => [item.id, item]));

    let inserted = 0, updated = 0, skipped = 0;
    const emailsValidos = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const hasData = [row[COL.nomeCompleto], row[COL.emailCatarse], row[COL.pagamentoMensal],
            row[COL.totalPago], row[COL.statusAssinatura], row[COL.dataInicio]]
            .some(value => String(value || "").trim() !== "");

        if (!hasData) continue;

        const record = mapRowToRecord(row);
        if (!record.email || !catarseService.isValidEmail(record.email)) { skipped++; continue; }

        emailsValidos.push(record.email);
        await catarseRepo.upsertAssinante(record);
        if (existingById.has(record.id)) updated++;
        else inserted++;
    }

    const [emailsRemovidos, assinantesRemovidos] = await Promise.all([
        catarseRepo.removerEmailsForaDaLista(emailsValidos),
        catarseRepo.removerAssinantesForaDaLista(emailsValidos),
    ]);

    let syncSummary = null, syncError = null;
    try {
        syncSummary = await catarseService.syncCatarseRoles(interaction.client, interaction.guildId);
    } catch (error) {
        syncError = error instanceof Error ? error.message : "Erro ao sincronizar cargos.";
    }

    const embed = new EmbedBuilder()
        .setColor(0x1c7ed6)
        .setTitle("Importação De Assinantes Concluída")
        .addFields(
            { name: "Inseridos", value: String(inserted), inline: true },
            { name: "Atualizados", value: String(updated), inline: true },
            { name: "Ignorados", value: String(skipped), inline: true },
            { name: "Emails Removidos", value: String(emailsRemovidos), inline: true },
            { name: "Assinantes Removidos", value: String(assinantesRemovidos), inline: true },
            { name: "Sync Processados", value: String(syncSummary ? syncSummary.processed : 0), inline: true },
            { name: "Sync Cargos Atribuídos", value: String(syncSummary ? syncSummary.roleAssigned : 0), inline: true },
            { name: "Sync Erros", value: String(syncSummary ? syncSummary.errors.length : 0), inline: true },
        )
        .setTimestamp();

    if (syncError) {
        embed.addFields({ name: "Aviso", value: `Importação concluída, mas a sync de cargos falhou: ${syncError}`, inline: false });
    }

    return interaction.editReply({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-catarse-importar")
        .setDescription("Importa assinantes de uma planilha XLSX")
        .addAttachmentOption(option =>
            option.setName("arquivo").setDescription("Planilha .xlsx com dados de assinantes").setRequired(true),
        ),
    execute,
};
