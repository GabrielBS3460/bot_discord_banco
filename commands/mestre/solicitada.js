const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("solicitada")
        .setDescription("Comando desativado."),

    async execute({ interaction }) {
        return interaction.reply({
            content: "🚫 **Comando Desativado:** O comando `/solicitada` foi desativado.",
            flags: MessageFlags.Ephemeral
        });
    }
};
