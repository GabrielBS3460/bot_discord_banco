const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
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
        .setName("venda")
        .setDescription("Propõe a venda de um item do seu inventário para outro jogador.")
        .addUserOption(option =>
            option.setName("comprador").setDescription("O jogador que vai comprar o item").setRequired(true)
        )
        .addNumberOption(option =>
            option.setName("valor").setDescription("O valor total da venda em Kwanzas").setRequired(true).setMinValue(0.1)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const vendedorUser = interaction.user;
        const compradorUser = interaction.options.getUser("comprador");
        const valorVenda = interaction.options.getNumber("valor");

        if (compradorUser.bot)
            return interaction.reply({ content: "🚫 Bots não compram itens.", flags: MessageFlags.Ephemeral });
        
        if (compradorUser.id === vendedorUser.id)
            return interaction.reply({
                content: "🚫 Você não pode vender itens para si mesmo.",
                flags: MessageFlags.Ephemeral
            });

        try {
            const [charVendedor, charComprador] = await Promise.all([
                getPersonagemAtivo(vendedorUser.id),
                getPersonagemAtivo(compradorUser.id)
            ]);

            if (!charVendedor)
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
                
            if (!charComprador)
                return interaction.reply({
                    content: `🚫 O comprador **${compradorUser.username}** não tem um personagem ativo.`,
                    flags: MessageFlags.Ephemeral
                });

            if (charComprador.saldo < valorVenda) {
                return interaction.reply({
                    content: `🚫 **${charComprador.nome}** não tem saldo suficiente para essa compra (Saldo: ${formatarMoeda(charComprador.saldo)}).`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const inventario = await ItensRepository.buscarInventario(charVendedor.id);

            if (!inventario || inventario.length === 0) {
                return interaction.reply({
                    content: "🎒 Seu inventário está vazio. Você não tem nada para vender.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const menuItens = new StringSelectMenuBuilder()
                .setCustomId(`menu_venda_item_${interaction.id}`)
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
                content: `🛒 **Mercado Aberto**\nSelecione o item que deseja vender para **${charComprador.nome}** pelo valor de **${formatarMoeda(valorVenda)}**:`,
                components: [rowMenu],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collectorMenu = msgMenu.createMessageComponentCollector({
                filter: i => i.user.id === vendedorUser.id,
                time: 60000
            });

            collectorMenu.on("collect", async iSelect => {
                if (iSelect.isStringSelectMenu() && iSelect.customId.startsWith("menu_venda_item_")) {
                    const itemId = parseInt(iSelect.values[0]);
                    const itemSelecionado = inventario.find(item => item.id === itemId);

                    if (!itemSelecionado) return iSelect.reply({ content: "Item não encontrado.", flags: MessageFlags.Ephemeral });

                    const modalId = `modal_qtd_venda_${iSelect.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle("Quantidade a Vender")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_qtd_venda")
                                    .setLabel(`Quantidade (Máx: ${itemSelecionado.quantidade})`)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("1")
                                    .setRequired(true)
                            )
                        );

                    await iSelect.showModal(modal);

                    try {
                        const submit = await iSelect.awaitModalSubmit({
                            filter: m => m.customId === modalId && m.user.id === vendedorUser.id,
                            time: 60000
                        });

                        await submit.deferReply({ flags: MessageFlags.Ephemeral });

                        let qtd = parseInt(submit.fields.getTextInputValue("inp_qtd_venda"));

                        if (isNaN(qtd) || qtd <= 0) {
                            return submit.editReply("🚫 Quantidade inválida.");
                        }

                        if (qtd > itemSelecionado.quantidade) {
                            return submit.editReply(`🚫 Você tem apenas **${itemSelecionado.quantidade}x** de **${itemSelecionado.nome}**.`);
                        }

                        await msgMenu.edit({ components: [] }).catch(() => null);
                        await submit.editReply({ content: `⏳ A proposta de venda de **${qtd}x ${itemSelecionado.nome}** foi enviada publicamente. Aguardando o comprador...` });
                        collectorMenu.stop();

                        const nomeItemFormatado = `${qtd}x ${itemSelecionado.nome}`;

                        const propostaEmbed = new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("❓ Proposta de Venda")
                            .setDescription(`**${charVendedor.nome}** quer vender **${nomeItemFormatado}** para **${charComprador.nome}**.`)
                            .addFields(
                                { name: "Valor", value: formatarMoeda(valorVenda) },
                                { name: "Comprador", value: `Aguardando confirmação de ${charComprador.nome}...` }
                            )
                            .setFooter({ text: "Expira em 60 segundos." });

                        if (itemSelecionado.descricao && /\.(jpeg|jpg|gif|png|webp)$/i.test(itemSelecionado.descricao)) {
                            const linkEncontrado = itemSelecionado.descricao.match(/https?:\/\/[^\s]+/);
                            if (linkEncontrado) propostaEmbed.setThumbnail(linkEncontrado[0]);
                        }

                        const botoes = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("confirmar_venda_item")
                                .setLabel("Comprar")
                                .setStyle(ButtonStyle.Success)
                                .setEmoji("✔️"),
                            new ButtonBuilder()
                                .setCustomId("cancelar_venda_item")
                                .setLabel("Cancelar")
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji("✖️")
                        );

                        const msgProposta = await interaction.channel.send({
                            content: `<@${compradorUser.id}>`,
                            embeds: [propostaEmbed],
                            components: [botoes]
                        });

                        const collectorVenda = msgProposta.createMessageComponentCollector({
                            filter: iBtn => iBtn.user.id === compradorUser.id || iBtn.user.id === vendedorUser.id,
                            time: 60000
                        });

                        collectorVenda.on("collect", async iBtn => {
                            await iBtn.deferUpdate();

                            if (iBtn.customId === "cancelar_venda_item") {
                                const canceladoEmbed = new EmbedBuilder()
                                    .setColor("#FF0000")
                                    .setTitle("✖️ Venda Cancelada")
                                    .setDescription(`A venda de **${nomeItemFormatado}** foi cancelada por ${iBtn.user.username}.`);

                                await msgProposta.edit({ content: null, embeds: [canceladoEmbed], components: [] });
                                return collectorVenda.stop("cancelado");
                            }

                            if (iBtn.customId === "confirmar_venda_item") {
                                if (iBtn.user.id !== compradorUser.id) {
                                    return iBtn.followUp({
                                        content: "🚫 Apenas o comprador pode aceitar a venda.",
                                        flags: MessageFlags.Ephemeral
                                    });
                                }

                                try {
                                    await TransacaoService.executarVendaItemRP(
                                        charVendedor.id,
                                        charComprador.id,
                                        charVendedor.nome,
                                        charComprador.nome,
                                        nomeItemFormatado,
                                        valorVenda
                                    );

                                    await ItensRepository.removerItem(itemSelecionado.id, qtd);
                                    await ItensRepository.adicionarItem(
                                        charComprador.id,
                                        itemSelecionado.nome,
                                        itemSelecionado.tipo,
                                        qtd,
                                        itemSelecionado.descricao
                                    );

                                    const sucesso = new EmbedBuilder()
                                        .setColor("#00FF00")
                                        .setTitle("✅ Venda Concluída")
                                        .setDescription(`**${nomeItemFormatado}** foi transferido com sucesso!`)
                                        .addFields(
                                            { name: "Vendedor", value: charVendedor.nome, inline: true },
                                            { name: "Comprador", value: charComprador.nome, inline: true },
                                            { name: "Valor", value: formatarMoeda(valorVenda) }
                                        );

                                    if (propostaEmbed.data.thumbnail) sucesso.setThumbnail(propostaEmbed.data.thumbnail.url);

                                    await msgProposta.edit({ content: null, embeds: [sucesso], components: [] });
                                    collectorVenda.stop("concluido");
                                } catch (err) {
                                    if (err.message === "SALDO_COMPRADOR_INSUFICIENTE") {
                                        await msgProposta.edit({
                                            content: "❌ O comprador não tem mais saldo suficiente para finalizar a transação.",
                                            embeds: [],
                                            components: []
                                        });
                                        return collectorVenda.stop("sem_saldo");
                                    }

                                    console.error("Erro na transação de venda de item:", err);
                                    await msgProposta.edit({
                                        content: "❌ Ocorreu um erro ao processar a venda no banco de dados.",
                                        embeds: [],
                                        components: []
                                    });
                                }
                            }
                        });

                        collectorVenda.on("end", (collected, reason) => {
                            if (reason === "time") {
                                const expiradoEmbed = new EmbedBuilder()
                                    .setColor("#808080")
                                    .setTitle("⌛ Proposta Expirada")
                                    .setDescription(`A oferta de venda de **${nomeItemFormatado}** expirou porque o comprador não respondeu.`);

                                msgProposta.edit({ content: null, embeds: [expiradoEmbed], components: [] }).catch(() => {});
                            }
                        });

                    } catch (err) {
                        console.error("Erro no modal de venda:", err);
                    }
                }
            });

        } catch (err) {
            console.error("Erro ao processar venda:", err);
            const erroMsg = {
                content: "❌ Ocorreu um erro ao iniciar a proposta de venda.",
                flags: MessageFlags.Ephemeral
            };
            interaction.replied
                ? await interaction.followUp(erroMsg).catch(() => {})
                : await interaction.reply(erroMsg).catch(() => {});
        }
    }
};