const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");
const ItensRepository = require("../../repositories/ItensRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("venda-npc")
        .setDescription("Vende um item do seu inventário para um comerciante NPC.")
        .addNumberOption(option =>
            option
                .setName("valor")
                .setDescription("Valor total da venda em Kwanzas (ex: 50 ou 50.5)")
                .setRequired(true)
                .setMinValue(0.1)
        )
        .addStringOption(opt =>
            opt
                .setName("filtro")
                .setDescription("Filtrar por um tipo específico de item")
                .setRequired(false)
                .addChoices(
                    { name: "🍔 Alimentos", value: "Alimento" },
                    { name: "🎒 Consumíveis", value: "Consumíveis" },
                    { name: "🛡️ Itens Permanentes", value: "Itens Permanentes" },
                    { name: "🏹 Munição", value: "Munição" },
                    { name: "⚒️ Melhorias", value: "Melhorias" },
                    { name: "✨ Item Mágico / Encantamento", value: "Item Mágico" },
                    { name: "🧪 Poções e Pergaminhos", value: "Poções/Pergaminhos" }
                )
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const valorVenda = interaction.options.getNumber("valor");
        const filtro = interaction.options.getString("filtro");

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            let inventario = await ItensRepository.buscarInventario(char.id);

            if (!inventario || inventario.length === 0) {
                return interaction.reply({
                    content: "🎒 Seu inventário está vazio. Você não tem nada para vender ao NPC.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (filtro) {
                if (filtro === "Poções/Pergaminhos") {
                    inventario = inventario.filter(i => i.tipo.includes("Poções/Pergaminhos"));
                } else if (filtro === "Item Mágico") {
                    inventario = inventario.filter(i => i.tipo === "Item Mágico" || i.tipo === "Encantamento");
                } else {
                    inventario = inventario.filter(i => i.tipo === filtro);
                }

                if (inventario.length === 0) {
                    return interaction.reply({
                        content: `🎒 Você não possui nenhum item da categoria **${filtro}** na mochila para vender.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            const menuItens = new StringSelectMenuBuilder()
                .setCustomId(`menu_venda_npc_${interaction.id}`)
                .setPlaceholder("Selecione o item que deseja vender...");

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

            const msgMenu = await interaction.reply({
                content: `🛒 **Mercador NPC**\nSelecione o item da sua mochila que você está vendendo por **${formatarMoeda(valorVenda)}**:`,
                components: [rowMenu],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collectorMenu = msgMenu.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collectorMenu.on("collect", async iSelect => {
                if (iSelect.isStringSelectMenu() && iSelect.customId.startsWith("menu_venda_npc_")) {
                    const itemId = parseInt(iSelect.values[0]);
                    const itemSelecionado = inventario.find(item => item.id === itemId);

                    if (!itemSelecionado)
                        return iSelect.reply({ content: "Item não encontrado.", flags: MessageFlags.Ephemeral });

                    const modalId = `modal_qtd_venda_npc_${iSelect.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle("Quantidade a Vender")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_qtd_npc")
                                    .setLabel(`Quantidade (Máx: ${itemSelecionado.quantidade})`)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("1")
                                    .setRequired(true)
                            )
                        );

                    await iSelect.showModal(modal);

                    try {
                        const submit = await iSelect.awaitModalSubmit({
                            filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                            time: 60000
                        });

                        await submit.deferReply({ flags: MessageFlags.Ephemeral });

                        let qtd = parseInt(submit.fields.getTextInputValue("inp_qtd_npc"));

                        if (isNaN(qtd) || qtd <= 0) {
                            return submit.editReply("🚫 Quantidade inválida.");
                        }

                        if (qtd > itemSelecionado.quantidade) {
                            return submit.editReply(
                                `🚫 Você tem apenas **${itemSelecionado.quantidade}x** de **${itemSelecionado.nome}**.`
                            );
                        }

                        await ItensRepository.removerItem(itemSelecionado.id, qtd);
                        await TransacaoService.registrarVendaNpc(char.id, valorVenda);

                        const nomeItemFormatado = `${qtd}x ${itemSelecionado.nome}`;

                        const embed = new EmbedBuilder()
                            .setColor("#2ECC71")
                            .setTitle("💰 Venda para NPC")
                            .addFields(
                                { name: "Personagem", value: char.nome, inline: true },
                                { name: "Valor Recebido", value: formatarMoeda(valorVenda), inline: true },
                                { name: "Item Vendido", value: nomeItemFormatado }
                            )
                            .setFooter({ text: "O item foi vendido para um comerciante NPC e removido do inventário." })
                            .setTimestamp();

                        if (
                            itemSelecionado.descricao &&
                            /\.(jpeg|jpg|gif|png|webp)$/i.test(itemSelecionado.descricao)
                        ) {
                            const linkEncontrado = itemSelecionado.descricao.match(/https?:\/\/[^\s]+/);
                            if (linkEncontrado) embed.setThumbnail(linkEncontrado[0]);
                        }

                        await interaction.channel.send({ embeds: [embed] });

                        await submit.editReply({
                            content: `✅ Venda concluída! **${formatarMoeda(valorVenda)}** foram adicionados ao seu saldo.`,
                            components: []
                        });
                        await msgMenu.edit({ components: [] }).catch(() => null);

                        collectorMenu.stop();
                    } catch (err) {
                        if (err.code !== "InteractionCollectorError") {
                            console.error("Erro no modal de venda NPC:", err);
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Erro no comando venda-npc:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao registrar a venda.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
