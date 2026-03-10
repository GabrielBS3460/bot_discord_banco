const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gasto")
        .setDescription("Registra um gasto em Kwanzas no seu extrato.")
        .addNumberOption(option =>
            option.setName("valor").setDescription("O valor do gasto (ex: 50.5)").setRequired(true).setMinValue(0.1)
        )
        .addStringOption(option => option.setName("motivo").setDescription("O motivo do gasto").setRequired(true)),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const valorGasto = interaction.options.getNumber("valor");
        const motivo = interaction.options.getString("motivo");

        try {
            const personagem = await getPersonagemAtivo(interaction.user.id);

            if (!personagem) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const personagemAtualizado = await TransacaoService.registrarGasto(personagem, valorGasto, motivo);

            const gastoEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("💸 Gasto Registrado")
                .addFields(
                    { name: "Personagem", value: personagem.nome, inline: true },
                    { name: "Valor", value: `- ${formatarMoeda(valorGasto)}`, inline: true },
                    { name: "Novo Saldo", value: `**${formatarMoeda(personagemAtualizado.saldo)}**` },
                    { name: "Motivo", value: motivo }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [gastoEmbed] });
        } catch (err) {
            if (err.message === "SALDO_INSUFICIENTE") {
                return interaction.reply({
                    content: `❌ Você não tem saldo suficiente!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            console.error("Erro no comando gasto:", err);

            const erroMsg = {
                content: "❌ Ocorreu um erro ao tentar registrar seu gasto.",
                flags: MessageFlags.Ephemeral
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
