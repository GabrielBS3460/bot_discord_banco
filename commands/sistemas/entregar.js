const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const TransacaoService = require("../../services/TransacaoService.js");
const ItensRepository = require("../../repositories/ItensRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("entregar")
        .setDescription("Entrega um item do seu inventário para outro personagem.")
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

            if (destinatarioUser.id === interaction.user.id) {
                return interaction.reply({
                    content: "🚫 Você não pode entregar itens para si mesmo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const charRemetente = await getPersonagemAtivo(interaction.user.id);
            const charDestinatario = await getPersonagemAtivo(destinatarioUser.id);

            if (!charRemetente) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!charDestinatario) {
                return interaction.reply({
                    content: `🚫 O usuário **${destinatarioUser.username}** não tem um personagem ativo.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const inventario = await ItensRepository.buscarInventario(charRemetente.id);

            if (!inventario || inventario.length === 0) {
                return interaction.reply({
                    content: "🎒 Seu inventário está vazio. Não há nada para entregar.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const menuItens = new StringSelectMenuBuilder()
                .setCustomId(`menu_entregar_item_${interaction.id}`)
                .setPlaceholder("Selecione o item que deseja entregar...");

            const itensMenu = inventario.slice(0, 25);
            itensMenu.forEach(item => {
                menuItens.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.nome} (Qtd: ${item.quantidade})`)
                        .setDescription(`Tipo: ${item.tipo}`)
                        .setValue(item.id.toString()) 
                );
            });

            const rowMenu = new ActionRowBuilder().addComponents(menuItens);

            const msg = await interaction.reply({
                content: `📦 **Transferência de Itens**\nSelecione o item da sua mochila que deseja entregar para **${charDestinatario.nome}**:`,
                components: [rowMenu],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async i => {
                if (i.isStringSelectMenu() && i.customId.startsWith("menu_entregar_item_")) {
                    const itemId = parseInt(i.values[0]);
                    const itemSelecionado = inventario.find(item => item.id === itemId);

                    if (!itemSelecionado) return i.reply({ content: "Item não encontrado.", flags: MessageFlags.Ephemeral });

                    const modalId = `modal_qtd_entregar_${i.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle("Quantidade para Entrega")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_qtd")
                                    .setLabel(`Quantidade (Máx: ${itemSelecionado.quantidade})`)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("1")
                                    .setRequired(true)
                            )
                        );

                    await i.showModal(modal);

                    try {
                        const submit = await i.awaitModalSubmit({
                            filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                            time: 60000
                        });

                        await submit.deferReply({ flags: MessageFlags.Ephemeral });

                        let qtd = parseInt(submit.fields.getTextInputValue("inp_qtd"));

                        if (isNaN(qtd) || qtd <= 0) {
                            return submit.editReply("🚫 Quantidade inválida.");
                        }

                        if (qtd > itemSelecionado.quantidade) {
                            return submit.editReply(`🚫 Você tem apenas **${itemSelecionado.quantidade}x** de **${itemSelecionado.nome}**.`);
                        }

                        
                        await ItensRepository.removerItem(itemSelecionado.id, qtd);

                        await ItensRepository.adicionarItem(
                            charDestinatario.id,
                            itemSelecionado.nome,
                            itemSelecionado.tipo,
                            qtd,
                            itemSelecionado.descricao
                        );

                        try {
                            await TransacaoService.registrarEntregaItem(charDestinatario.id, `${qtd}x ${itemSelecionado.nome} (de ${charRemetente.nome})`);
                        } catch (err) {
                            console.log("Erro ao registrar no TransacaoService", err);
                        }

                        const embed = new EmbedBuilder()
                            .setColor("#9B59B6")
                            .setTitle("🎁 Item Entregue!")
                            .setDescription(`**${charRemetente.nome}** passou um item para as mãos de **${charDestinatario.nome}**.`)
                            .addFields({ name: "📦 Item", value: `${qtd}x **${itemSelecionado.nome}**` })
                            .setTimestamp();

                        await interaction.channel.send({ embeds: [embed] });

                        await submit.editReply({ 
                            content: `✅ Você entregou ${qtd}x **${itemSelecionado.nome}** para ${charDestinatario.nome} com sucesso!`, 
                            components: [] 
                        });

                        await msg.edit({ components: [] }).catch(() => null);
                        collector.stop();

                    } catch (err) {
                        console.error("Erro no submit do modal de entrega:", err);
                    }
                }
            });

        } catch (err) {
            console.error("Erro no comando entregar:", err);

            if (interaction.isRepliable() && !interaction.replied) {
                await interaction
                    .reply({
                        content: "❌ Ocorreu um erro ao preparar a entrega.",
                        flags: MessageFlags.Ephemeral
                    })
                    .catch(() => {});
            }
        }
    }
};
