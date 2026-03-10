const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const PersonagemService = require("../../services/PersonagemService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cadastrar")
        .setDescription("Cadastra um novo personagem no sistema.")
        .addStringOption(option => option.setName("nome").setDescription("O nome do seu personagem").setRequired(true)),

    async execute({ interaction }) {
        const nomePersonagem = interaction.options.getString("nome");
        const discordId = interaction.user.id;

        try {
            const { novoPersonagem, ativadoAutomaticamente } = await PersonagemService.criarNovoPersonagem(
                discordId,
                nomePersonagem
            );

            if (ativadoAutomaticamente) {
                return interaction.reply({
                    content: `✅ Personagem **${novoPersonagem.nome}** criado e selecionado como ativo!`
                });
            } else {
                return interaction.reply({
                    content: `✅ Personagem **${novoPersonagem.nome}** criado! Use \`/personagem trocar\` para jogar com ele.`
                });
            }
        } catch (err) {
            if (err.message === "LIMITE_PERSONAGENS") {
                return interaction.reply({
                    content: "🚫 Você já atingiu o limite de **3 personagens**!",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (err.message === "NOME_DUPLICADO") {
                return interaction.reply({
                    content: "⚠️ Já existe um personagem com este nome no servidor. Por favor, escolha outro.",
                    flags: MessageFlags.Ephemeral
                });
            }

            console.error("Erro ao cadastrar:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao criar o personagem.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
