const { SlashCommandBuilder, EmbedBuilder, MessageFlags, AttachmentBuilder } = require("discord.js");
const catarseService = require("../../services/CatarseService.js");

function buildErrorLogContent(summary) {
    const lines = [
        "Log de erros do sync de cargos do Catarse",
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        `Processados: ${summary.processed}`,
        `Com Match: ${summary.matched}`,
        `Cargos Atribuídos: ${summary.roleAssigned}`,
        `Remoção Apenas: ${summary.roleRemovedOnly}`,
        `Sem Cargo Elegível: ${summary.noEligibleRole}`,
        `Usuário Não Encontrado: ${summary.userNotFound}`,
        `Sem Email Correspondente: ${summary.noEmailMatch}`,
        `Total de Erros: ${summary.errors.length}`,
        ""
    ];

    if (summary.errors.length === 0) {
        lines.push("Nenhum erro registrado.");
        return lines.join("\n");
    }

    summary.errors.forEach((error, index) => {
        lines.push(
            `${index + 1}. userId: ${error.userId || "-"}`,
            `   email: ${error.email || "-"}`,
            `   message: ${error.message || "-"}`,
            ""
        );
    });

    return lines.join("\n");
}

function buildErrorLogAttachment(summary) {
    const content = buildErrorLogContent(summary);
    return new AttachmentBuilder(Buffer.from(content, "utf8"), {
        name: `catarse-sync-erros-${Date.now()}.txt`
    });
}

function buildSyncSummaryEmbed(summary) {
    const missingRolesText =
        summary.missingRoles.length > 0
            ? summary.missingRoles.map(item => `${item.cargo_nome} (${item.cargo_id})`).join("\n")
            : "Nenhum";

    return new EmbedBuilder()
        .setColor(0x2b8a3e)
        .setTitle("Sync De Cargos Do Catarse Concluída")
        .addFields(
            { name: "Processados", value: String(summary.processed), inline: true },
            { name: "Com Match", value: String(summary.matched), inline: true },
            { name: "Cargos Atribuídos", value: String(summary.roleAssigned), inline: true },
            { name: "Remoção Apenas", value: String(summary.roleRemovedOnly), inline: true },
            { name: "Sem Cargo Elegível", value: String(summary.noEligibleRole), inline: true },
            { name: "Usuário Não Encontrado", value: String(summary.userNotFound), inline: true },
            { name: "Sem Email Correspondente", value: String(summary.noEmailMatch), inline: true },
            { name: "Cargos Não Encontrados", value: missingRolesText, inline: false },
            { name: "Erros", value: String(summary.errors.length), inline: true }
        )
        .setTimestamp();
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

    await interaction.deferReply({ ephemeral: true });

    try {
        const summary = await catarseService.syncCatarseRoles(interaction.client, interaction.guildId);
        const payload = { embeds: [buildSyncSummaryEmbed(summary)] };

        if (summary.errors.length > 0) {
            const attachment = buildErrorLogAttachment(summary);
            payload.content = "📎 O relatório de erros foi enviado em anexo.";

            try {
                await interaction.user.send({
                    content: "Relatório de erros do sync de cargos do Catarse.",
                    files: [attachment]
                });
            } catch {
                payload.content = "📎 Não consegui mandar DM; o relatório de erros vai junto nesta resposta.";
                payload.files = [attachment];
            }
        }

        return interaction.editReply(payload);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao executar sync de cargos.";
        return interaction.editReply({ content: message, embeds: [] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-catarse-sync")
        .setDescription("Sincroniza cargos do Catarse com base nos emails conectados"),
    execute
};
