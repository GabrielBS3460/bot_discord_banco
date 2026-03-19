const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");
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

        const charDestinatario = await getPersonagemAtivo(destinatarioUser.id);
        if (!charDestinatario) {
            return interaction.reply({
                content: `🚫 O usuário **${destinatarioUser.username}** não tem um personagem ativo.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const modalId = `mod_loot_${destinatarioUser.id}_${valor}_${interaction.id}`;
        const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle(`Loot para ${charDestinatario.nome}`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("inp_motivo")
                        .setLabel("Motivo do Loot (Ex: Missão X, Evento Y)")
                        .setPlaceholder("Descreva brevemente o que gerou esse tesouro...")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(100)
                )
            );

        await interaction.showModal(modal);

        try {
            const submit = await interaction.awaitModalSubmit({
                filter: i => i.customId === modalId,
                time: 60000
            });

            await submit.deferReply();

            const motivo = submit.fields.getTextInputValue("inp_motivo");

            await TransacaoService.registrarLootMestre(charDestinatario.id, valor, interaction.user.username, motivo);

            const embed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle("🏆 Loot Concedido")
                .setDescription(`*${motivo}*`)
                .addFields(
                    { name: "👤 Personagem", value: charDestinatario.nome, inline: true },
                    { name: "💰 Valor", value: `**${formatarMoeda(valor)}**`, inline: true }
                )
                .setFooter({ text: `Concedido por ${interaction.user.username}` })
                .setTimestamp();

            return await submit.editReply({ embeds: [embed] });
        } catch (err) {
            if (err.code === "InteractionCollectorError") return;
            console.error("Erro no processamento do loot:", err);
        }
    }
};
