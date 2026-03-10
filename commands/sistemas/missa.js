const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("missa")
        .setDescription("Cobra o dízimo dos fiéis e transfere para o Clérigo.")
        .addNumberOption(option =>
            option
                .setName("valor_total")
                .setDescription("O valor TOTAL arrecadado (será dividido entre os fiéis)")
                .setRequired(true)
                .setMinValue(0.1)
        )
        .addUserOption(option => option.setName("fiel1").setDescription("Fiel pagante 1").setRequired(true))
        .addUserOption(option => option.setName("fiel2").setDescription("Fiel pagante 2").setRequired(false))
        .addUserOption(option => option.setName("fiel3").setDescription("Fiel pagante 3").setRequired(false))
        .addUserOption(option => option.setName("fiel4").setDescription("Fiel pagante 4").setRequired(false))
        .addUserOption(option => option.setName("fiel5").setDescription("Fiel pagante 5").setRequired(false))
        .addUserOption(option => option.setName("fiel6").setDescription("Fiel pagante 6").setRequired(false)),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const valorTotal = interaction.options.getNumber("valor_total");

        const fiéisUsers = [];
        for (let i = 1; i <= 6; i++) {
            const user = interaction.options.getUser(`fiel${i}`);
            if (user && user.id !== interaction.user.id && !user.bot) {
                if (!fiéisUsers.some(u => u.id === user.id)) {
                    fiéisUsers.push(user);
                }
            }
        }

        if (fiéisUsers.length === 0) {
            return interaction.reply({
                content: "🚫 Você precisa informar pelo menos 1 fiel válido (bots e você mesmo são ignorados).",
                flags: MessageFlags.Ephemeral
            });
        }

        const participantesIds = fiéisUsers.map(u => u.id);
        const custoIndividual = valorTotal / participantesIds.length;

        try {
            const charClerigo = await getPersonagemAtivo(interaction.user.id);

            if (!charClerigo) {
                return interaction.reply({
                    content: "🚫 Você (Clérigo) não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            let charsPagantes = [];

            for (const id of participantesIds) {
                const char = await getPersonagemAtivo(id);
                const userDiscord = fiéisUsers.find(u => u.id === id);

                if (!char) {
                    return interaction.reply({
                        content: `🚫 O usuário **${userDiscord.username}** não tem um personagem ativo.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (char.saldo < custoIndividual) {
                    return interaction.reply({
                        content: `💸 **${char.nome}** (de ${userDiscord.username}) não tem saldo suficiente para pagar a parte dele (K$ ${custoIndividual.toFixed(2)}).`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                charsPagantes.push(char);
            }

            await TransacaoService.processarMissa(
                charClerigo.id,
                charClerigo.nome,
                charsPagantes,
                valorTotal,
                custoIndividual
            );

            const lista = charsPagantes.map(p => `• ${p.nome}`).join("\n");

            const embed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("🙏 Missa Realizada")
                .addFields(
                    { name: "Clérigo", value: `${charClerigo.nome} (+${formatarMoeda(valorTotal)})` },
                    { name: "Custo por Fiel", value: formatarMoeda(custoIndividual) },
                    { name: "Fiéis Presentes", value: lista }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando missa:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao processar a missa.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
