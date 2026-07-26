const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
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
                inline: true,
            },
            {
                name: "Maior valor pago",
                value: stats.richestSubscriber
                    ? `${stats.richestSubscriber.nome || "Sem nome"} (${stats.richestSubscriber.email || "sem email"})\n${formatMoney(stats.richestSubscriber.totalPago)}`
                    : "Indisponível",
                inline: false,
            },
            {
                name: "Assinaturas por cargo",
                value: buildRoleCountsText(stats.roleConfigs, stats.roleCounts, stats.noEligibleRole),
                inline: false,
            },
        )
        .setTimestamp();
}

async function execute({ interaction }) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Este comando é restrito a administradores.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ ephemeral: true });

    const [subscribers, linkedEmails] = await Promise.all([
        catarseRepo.listarAssinantes(),
        catarseRepo.listarEmails(),
    ]);

    const roleConfigs = catarseService.getRoleConfigs();
    const roleCounts = new Map(roleConfigs.map(item => [item.cargo_nome, 0]));

    let totalMonths = 0, validMonthsCount = 0, noEligibleRole = 0;
    let richestSubscriber = null, richestTotalPago = -Infinity;

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

        const totalPago = Number(subscriber.totalPago);
        if (Number.isFinite(totalPago) && totalPago > richestTotalPago) {
            richestTotalPago = totalPago;
            richestSubscriber = subscriber;
        }
    }

    const activeSubscriptions = subscribers.filter(
        item => String(item.status || "").trim().toLowerCase() === "ativa",
    ).length;

    const stats = {
        totalSubscriptions: subscribers.length,
        activeSubscriptions,
        connectedEmails: new Set(linkedEmails.map(item => catarseService.normalizeEmail(item.email)).filter(Boolean)).size,
        averageMonths: validMonthsCount > 0 ? totalMonths / validMonthsCount : null,
        richestSubscriber,
        roleConfigs,
        roleCounts,
        noEligibleRole,
    };

    return interaction.editReply({ embeds: [buildSummaryEmbed(stats)] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-catarse-resumo")
        .setDescription("Resumo das assinaturas do Catarse")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute,
};
