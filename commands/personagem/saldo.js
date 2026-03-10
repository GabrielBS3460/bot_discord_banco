const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("saldo")
        .setDescription("Verifica o saldo atual de Kwanzas do seu personagem ativo."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        try {
            const personagem = await getPersonagemAtivo(interaction.user.id);

            if (!personagem) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("💰 Saldo do Personagem")
                .setDescription(`**${personagem.nome}** possui ${formatarMoeda(personagem.saldo)}`);

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando saldo:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao buscar o seu saldo.", flags: MessageFlags.Ephemeral };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
