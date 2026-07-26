const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const catarseService = require("../../services/CatarseService.js");

function buildSyncSummaryEmbed(summary) {
    const missingRolesText = summary.missingRoles.length > 0
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
            { name: "Erros", value: String(summary.errors.length), inline: true },
        )
        .setTimestamp();
}

async function execute({ interaction }) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const summary = await catarseService.syncCatarseRoles(interaction.client, interaction.guildId);
        return interaction.editReply({ embeds: [buildSyncSummaryEmbed(summary)] });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao executar sync de cargos.";
        return interaction.editReply({ content: message, embeds: [] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-catarse-sync")
        .setDescription("Sincroniza cargos do Catarse com base nos emails conectados"),
    execute,
};
