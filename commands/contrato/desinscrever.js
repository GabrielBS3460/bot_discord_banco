const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ContratoService = require("../../services/ContratoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("desinscrever")
        .setDescription("Cancela sua inscrição em um contrato de missão.")
        .addStringOption(opt =>
            opt.setName("missao")
                .setDescription("Nome exacto da missão")
                .setRequired(true)
        ),

    async execute({ interaction, getPersonagemAtivo }) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char) {
                return interaction.editReply("🚫 Você precisa ter um personagem ativo para se desinscrever.");
            }

            const missaoNome = interaction.options.getString("missao");
            const missao = await ContratoService.desinscreverPersonagem(char.id, missaoNome);

            return interaction.editReply(`✅ **${char.nome}** foi desinscrito com sucesso da missão **${missao.nome}**!`);
        } catch (err) {
            if (err.message === "MISSAO_NAO_ENCONTRADA") {
                return interaction.editReply("🚫 Nenhuma missão encontrada com esse nome.");
            }
            if (err.message === "MISSAO_FECHADA") {
                return interaction.editReply("🚫 Não é possível se desinscrever de uma missão que já foi iniciada ou concluída.");
            }
            if (err.message === "NAO_INSCRITO") {
                return interaction.editReply("🚫 Seu personagem ativo não estava inscrito nessa missão.");
            }
            console.error("Erro no comando desinscrever:", err);
            return interaction.editReply("❌ Ocorreu um erro ao cancelar a inscrição.");
        }
    }
};
