const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const catarseRepo = require("../../repositories/CatarseRepository.js");
const catarseService = require("../../services/CatarseService.js");

function formatMoney(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function formatMonths(value) {
    return `${value.toFixed(1).replace(".", ",")} meses`;
}

function buildRoleCountsText(roleConfigs, roleCounts, noEligibleRole) {
    const lines = roleConfigs.map(item => {
        const count = roleCounts.get(item.cargo_nome) || 0;
        return `${item.cargo_nome}: ${count}`;
    });
    if (noEligibleRole > 0) lines.push(`Sem cargo elegível: ${noEligibleRole}`);
    return lines.length > 0 ? lines.join("\n") : "Nenhum cargo configurado.";
}

function buildTopPaidText(subscribers) {
    const topPaid = [...subscribers]
        .map(item => ({
            nome: String(item.nome || item.email || "Sem nome").trim() || "Sem nome",
            totalPago: Number(item.totalPago)
        }))
        .filter(item => Number.isFinite(item.totalPago))
        .sort((a, b) => b.totalPago - a.totalPago)
        .slice(0, 3);

    if (topPaid.length === 0) return "Nenhum valor disponível.";

    return topPaid.map((item, index) => `${index + 1}. ${item.nome} - ${formatMoney(item.totalPago)}`).join("\n");
}

function buildSummaryEmbed(stats) {
    return new EmbedBuilder()
        .setColor(0x1c7ed6)
        .setTitle("Resumo Das Assinaturas Do Catarse")
        .addFields(
            { name: "Total de assinaturas", value: String(stats.totalSubscriptions), inline: true },
            { name: "Assinaturas ativas", value: String(stats.activeSubscriptions), inline: true },
            { name: "Emails conectados", value: String(stats.connectedEmails), inline: true },
            {
                name: "Tempo médio de apoio",
                value: stats.averageMonths !== null ? formatMonths(stats.averageMonths) : "Indisponível",
                inline: true
            },
            {
                name: "Top 3 por total pago",
                value: buildTopPaidText(stats.subscribers),
                inline: false
            },
            {
                name: "Assinaturas por cargo",
                value: buildRoleCountsText(stats.roleConfigs, stats.roleCounts, stats.noEligibleRole),
                inline: false
            }
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

    const [subscribers, linkedEmails] = await Promise.all([catarseRepo.listarAssinantes(), catarseRepo.listarEmails()]);

    const roleConfigs = catarseService.getRoleConfigs();
    const roleCounts = new Map(roleConfigs.map(item => [item.cargo_nome, 0]));

    let totalMonths = 0,
        validMonthsCount = 0,
        noEligibleRole = 0;

    for (const subscriber of subscribers) {
        const months = Number(subscriber.mesesAssinante);
        if (Number.isFinite(months) && months >= 0) {
            totalMonths += months;
            validMonthsCount++;

            const targetRole = catarseService.getTargetRoleConfig(months, roleConfigs);
            if (targetRole) {
                roleCounts.set(targetRole.cargo_nome, (roleCounts.get(targetRole.cargo_nome) || 0) + 1);
            } else {
                noEligibleRole++;
            }
        } else {
            noEligibleRole++;
        }
    }

    const activeSubscriptions = subscribers.filter(
        item =>
            String(item.status || "")
                .trim()
                .toLowerCase() === "ativa"
    ).length;

    const stats = {
        totalSubscriptions: subscribers.length,
        activeSubscriptions,
        connectedEmails: new Set(linkedEmails.map(item => catarseService.normalizeEmail(item.email)).filter(Boolean))
            .size,
        averageMonths: validMonthsCount > 0 ? totalMonths / validMonthsCount : null,

        roleConfigs,
        roleCounts,
        subscribers,
        noEligibleRole
    };

    return interaction.editReply({ embeds: [buildSummaryEmbed(stats)] });
}

module.exports = {
    data: new SlashCommandBuilder().setName("admin-catarse-resumo").setDescription("Resumo das assinaturas do Catarse"),
    execute
};
