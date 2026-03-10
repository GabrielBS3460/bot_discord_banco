const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ContratoService = require("../../services/ContratoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("criarcontrato")
        .setDescription("Cria um novo contrato/missão para os jogadores se inscreverem.")
        .addStringOption(option =>
            option.setName("nome").setDescription("Nome do contrato (ex: Resgate na Floresta)").setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("nd").setDescription("Nível de Desafio (ND) da missão").setRequired(true).setMinValue(1)
        )
        .addIntegerOption(option =>
            option
                .setName("vagas")
                .setDescription("Quantidade de vagas disponíveis na equipe")
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute({ interaction }) {
        const nomeMissao = interaction.options.getString("nome");
        const nd = interaction.options.getInteger("nd");
        const vagas = interaction.options.getInteger("vagas");
        const criadorId = interaction.user.id;

        try {
            await ContratoService.criarNovoContrato(nomeMissao, nd, vagas, criadorId);

            await interaction.reply({
                content:
                    `✅ **Contrato Criado!**\n` +
                    `📜 **${nomeMissao}** (ND ${nd})\n` +
                    `👥 Vagas: ${vagas}\n\n` +
                    `Jogadores, usem \`/inscrever missao:${nomeMissao}\` para participar!`
            });
        } catch (err) {
            if (err.message === "CONTRATO_DUPLICADO") {
                return interaction.reply({
                    content: "⚠️ Já existe um contrato com esse nome. Por favor, escolha um nome diferente.",
                    flags: MessageFlags.Ephemeral
                });
            }

            console.error("Erro no comando criarcontrato:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao criar o contrato.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
