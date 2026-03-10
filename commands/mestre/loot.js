const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loot")
        .setDescription("Concede uma quantia de dinheiro (Loot) para um jogador.")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que vai receber o loot").setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName("valor")
                .setDescription("Valor em Kwanzas a ser concedido")
                .setRequired(true)
                .setMinValue(0.1)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const destinatarioUser = interaction.options.getUser("jogador");
        const valor = interaction.options.getNumber("valor");

        if (destinatarioUser.bot) {
            return interaction.reply({
                content: "🚫 Você não pode enviar loot para um bot.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const charDestinatario = await getPersonagemAtivo(destinatarioUser.id);

            if (!charDestinatario) {
                return interaction.reply({
                    content: `🚫 O usuário **${destinatarioUser.username}** não tem um personagem ativo.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await TransacaoService.registrarLootMestre(charDestinatario.id, valor, interaction.user.username);

            const embed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle("🏆 Loot Concedido")
                .addFields(
                    {
                        name: "Jogador",
                        value: charDestinatario.nome,
                        inline: true
                    },
                    {
                        name: "Valor Recebido",
                        value: `**${formatarMoeda(valor)}**`,
                        inline: true
                    }
                )
                .setFooter({
                    text: `Concedido por ${interaction.user.username}`
                })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando loot:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao conceder o loot.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
