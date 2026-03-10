const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("entregar")
        .setDescription("Entrega um item para o personagem de outro jogador.")
        .addUserOption(option =>
            option.setName("destinatario").setDescription("O jogador que vai receber o item").setRequired(true)
        ),

    async execute({ interaction, getPersonagemAtivo }) {
        try {
            const destinatarioUser = interaction.options.getUser("destinatario");

            if (destinatarioUser.bot) {
                return interaction.reply({
                    content: "🚫 Você não pode entregar itens para um bot.",
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

            const modalId = `modal_entregar_${interaction.id}`;
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle(`Entrega para ${charDestinatario.nome}`)
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_nome_item")
                            .setLabel("Nome do Item")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_links")
                            .setLabel("Links (um por linha)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

            await interaction.showModal(modal);

            const modalSubmit = await interaction
                .awaitModalSubmit({
                    filter: i => i.customId === modalId && i.user.id === interaction.user.id,
                    time: 120000
                })
                .catch(() => null);

            if (!modalSubmit) return;

            const nomeItem = modalSubmit.fields.getTextInputValue("inp_nome_item");
            const linksTexto = modalSubmit.fields.getTextInputValue("inp_links");

            const listaLinks = linksTexto
                .split(/\n|,/)
                .map(l => l.trim())
                .filter(l => l.length > 0);

            const linksFormatados = listaLinks.map(l => `🔗 ${l}`).join("\n");

            await TransacaoService.registrarEntregaItem(charDestinatario.id, nomeItem);

            const embed = new EmbedBuilder()
                .setColor("#9B59B6")
                .setTitle("🎁 Item Entregue!")
                .setDescription(`**${interaction.user.username}** entregou um item para **${charDestinatario.nome}**.`)
                .addFields({ name: "📦 Item", value: nomeItem }, { name: "🔗 Links", value: linksFormatados })
                .setTimestamp();

            await modalSubmit.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando entregar:", err);

            if (interaction.isRepliable() && !interaction.replied) {
                await interaction
                    .reply({
                        content: "❌ Ocorreu um erro ao entregar o item.",
                        flags: MessageFlags.Ephemeral
                    })
                    .catch(() => {});
            }
        }
    }
};
