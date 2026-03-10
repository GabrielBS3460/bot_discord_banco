const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ContratoService = require("../../services/ContratoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inscrever")
        .setDescription("Inscreve seu personagem em uma missão/contrato aberto.")
        .addStringOption(option => option.setName("missao").setDescription("Nome exato do contrato").setRequired(true)),

    async execute({ interaction, getPersonagemAtivo }) {
        const nomeMissao = interaction.options.getString("missao");

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            await ContratoService.inscreverPersonagem(char, nomeMissao);

            return interaction.reply({
                content: `✅ **${char.nome}** se inscreveu na missão **${nomeMissao}**!\n*Aguarde o sorteio pelo mestre no painel da missão.*`
            });
        } catch (err) {
            let msg = "❌ Ocorreu um erro ao se inscrever.";

            if (err.message === "MISSAO_NAO_ENCONTRADA") msg = "🚫 Missão não encontrada. Verifique o nome.";
            if (err.message === "MISSAO_FECHADA") msg = "🚫 Esta missão não está aceitando inscrições.";
            if (err.message === "JA_INSCRITO") msg = "⚠️ Você já está inscrito nesta missão.";

            if (err.message === "NIVEL_INCOMPATIVEL") {
                const { min, max, atual } = err.cause;
                msg = `🚫 Nível incompatível! Seu nível (**${atual}**) deve estar entre **${min}** e **${max}**.`;
            }

            return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
