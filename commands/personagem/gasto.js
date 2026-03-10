const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gasto")
        .setDescription("Registra um gasto em Kwanzas no seu extrato.")
        .addNumberOption(option =>
            option.setName("valor").setDescription("O valor do gasto (ex: 50.5)").setRequired(true).setMinValue(0.1)
        )
        .addStringOption(option => option.setName("motivo").setDescription("O motivo do gasto").setRequired(true)),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda }) {
        const valorGasto = interaction.options.getNumber("valor");
        const motivo = interaction.options.getString("motivo");

        try {
            const personagem = await getPersonagemAtivo(interaction.user.id);

            if (!personagem) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    ephemeral: true
                });
            }

            if (personagem.saldo < valorGasto) {
                return interaction.reply({
                    content: `❌ Você não tem saldo suficiente! Saldo de **${personagem.nome}**: **${formatarMoeda(personagem.saldo)}**.`,
                    ephemeral: true
                });
            }

            const [updatedPersonagem] = await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: personagem.id },
                    data: { saldo: { decrement: valorGasto } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: personagem.id,
                        descricao: motivo,
                        valor: valorGasto,
                        tipo: "GASTO"
                    }
                })
            ]);

            const gastoEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("💸 Gasto Registrado")
                .addFields(
                    { name: "Personagem", value: personagem.nome, inline: true },
                    { name: "Valor", value: `- ${formatarMoeda(valorGasto)}`, inline: true },
                    { name: "Novo Saldo", value: `**${formatarMoeda(updatedPersonagem.saldo)}**` },
                    { name: "Motivo", value: motivo }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [gastoEmbed] });
        } catch (err) {
            console.error("Erro no comando gasto:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao tentar registrar seu gasto.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
