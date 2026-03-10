const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const BaseService = require("../../services/BaseService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-rodar-manutencao")
        .setDescription("Roda a cobrança mensal de manutenção de todas as bases (Apenas Admins)."),

    async execute({ interaction, ID_CARGO_ADMIN }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({
                content: "🚫 Apenas a prefeitura (Admins) pode cobrar impostos.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply();

        try {
            const result = await BaseService.processarManutencaoGeral();

            const embed = new EmbedBuilder()
                .setTitle("🧹 Relatório de Manutenção Mensal")
                .setColor("#2F3136")
                .addFields(
                    { name: "✅ Pagas", value: `${result.pagas} bases`, inline: true },
                    { name: "⚠️ Inadimplentes", value: `${result.inadimplentes} bases`, inline: true },
                    { name: "🏚️ Cômodos Danificados", value: `${result.degradadas} novos danos`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await interaction.editReply("❌ Erro ao processar manutenção.");
        }
    }
};
