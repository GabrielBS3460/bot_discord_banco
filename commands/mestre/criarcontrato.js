const { SlashCommandBuilder } = require("discord.js");

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

    async execute({ interaction, prisma }) {
        try {
            const nomeMissao = interaction.options.getString("nome");
            const nd = interaction.options.getInteger("nd");
            const vagas = interaction.options.getInteger("vagas");

            await prisma.missoes.create({
                data: {
                    nome: nomeMissao,
                    nd: nd,
                    vagas: vagas,
                    criador_id: interaction.user.id,
                    status: "ABERTA"
                }
            });

            await interaction.reply({
                content:
                    `✅ **Contrato Criado!**\n` +
                    `📜 **${nomeMissao}** (ND ${nd})\n` +
                    `👥 Vagas: ${vagas}\n\n` +
                    `Jogadores, usem \`/inscrever missao:${nomeMissao}\` para participar!`
            });
        } catch (err) {
            if (err.code === "P2002") {
                return interaction.reply({
                    content: "⚠️ Já existe um contrato com esse nome. Por favor, escolha um nome diferente.",
                    ephemeral: true
                });
            }

            console.error("Erro no comando criarcontrato:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao criar o contrato.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
