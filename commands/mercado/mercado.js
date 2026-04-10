const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const MercadoRepository = require("../../repositories/MercadoRepository.js");
const ItensRepository = require("../../repositories/ItensRepository.js");
const MercadoService = require("../../services/MercadoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mercado")
        .setDescription("Sistema do Mercado Global.")
        .addSubcommand(sub =>
            sub
                .setName("anunciar")
                .setDescription("Coloca um item da sua mochila à venda para outros jogadores.")
                .addNumberOption(opt =>
                    opt.setName("preco").setDescription("Preço total em Kwanzas (K$)").setRequired(true).setMinValue(1)
                )
        )
        .addSubcommand(sub =>
            sub.setName("comprar").setDescription("Abre o mural de anúncios para comprar itens de outros jogadores.")
        )
        .addSubcommand(sub =>
            sub.setName("meus_anuncios").setDescription("Veja seus itens à venda e cancele anúncios se desejar.")
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo para acessar o mercado.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (subcomando === "anunciar") {
                const preco = interaction.options.getNumber("preco");
                const inventario = await ItensRepository.buscarInventario(char.id);

                if (!inventario || inventario.length === 0) {
                    return interaction.reply({
                        content: "🎒 Sua mochila está vazia. Não há nada para vender.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const menuItens = new StringSelectMenuBuilder()
                    .setCustomId(`menu_anunciar_mercado_${interaction.id}`)
                    .setPlaceholder(`Selecione o item para vender por ${formatarMoeda(preco)}`);

                inventario.slice(0, 25).forEach(item => {
                    menuItens.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${item.nome} (Qtd: ${item.quantidade})`)
                            .setDescription(`Tipo: ${item.tipo}`)
                            .setValue(item.id.toString())
                    );
                });

                const msg = await interaction.reply({
                    content: `⚖️ **Anunciar no Mercado**\nSelecione o item que deseja anunciar por **${formatarMoeda(preco)}**:`,
                    components: [new ActionRowBuilder().addComponents(menuItens)],
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                collector.on("collect", async iSelect => {
                    if (iSelect.isStringSelectMenu()) {
                        const itemId = parseInt(iSelect.values[0]);
                        const itemSelecionado = inventario.find(i => i.id === itemId);

                        if (!itemSelecionado) return;

                        const modalId = `modal_qtd_mercado_${iSelect.id}`;
                        const modal = new ModalBuilder()
                            .setCustomId(modalId)
                            .setTitle("Quantidade a Vender")
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("inp_qtd_mercado")
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

                            let qtd = parseInt(submit.fields.getTextInputValue("inp_qtd_mercado"));

                            if (isNaN(qtd) || qtd <= 0 || qtd > itemSelecionado.quantidade) {
                                return submit.reply({
                                    content: "🚫 Quantidade inválida.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            await ItensRepository.removerItem(itemSelecionado.id, qtd);
                            await MercadoRepository.criarAnuncio(
                                char.id,
                                char.nome,
                                itemSelecionado.nome,
                                itemSelecionado.tipo,
                                qtd,
                                itemSelecionado.descricao,
                                preco
                            );

                            await msg.edit({ components: [] }).catch(() => null);
                            await submit.reply({
                                content: `✅ **${qtd}x ${itemSelecionado.nome}** foi enviado para o Mercado por **${formatarMoeda(preco)}**!`,
                                flags: MessageFlags.Ephemeral
                            });

                            const embedPublico = new EmbedBuilder()
                                .setColor("#D4AF37")
                                .setTitle("📢 Novo Item no Mercado!")
                                .setDescription(
                                    `**${char.nome}** acabou de colocar um item à venda. Use \`/mercado comprar\` para ver a vitrine.`
                                )
                                .addFields(
                                    { name: "📦 Item", value: `${qtd}x **${itemSelecionado.nome}**`, inline: true },
                                    { name: "💰 Preço", value: formatarMoeda(preco), inline: true }
                                );
                            await interaction.channel.send({ embeds: [embedPublico] });

                            collector.stop();
                        } catch (err) {
                            console.error("Erro no modal de anúncio:", err);
                        }
                    }
                });
            } else if (subcomando === "comprar") {
                const anuncios = await MercadoRepository.buscarAnuncios();
                const vitrine = anuncios.filter(a => a.vendedor_id !== char.id);

                if (vitrine.length === 0) {
                    return interaction.reply({
                        content: "🏚️ O mercado está completamente vazio no momento.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                let paginaAtual = 0;
                const itensPorPagina = 25;
                const totalPaginas = Math.ceil(vitrine.length / itensPorPagina);

                const gerarComponentes = pagina => {
                    const inicio = pagina * itensPorPagina;
                    const itensPagina = vitrine.slice(inicio, inicio + itensPorPagina);

                    const menuCompra = new StringSelectMenuBuilder()
                        .setCustomId(`menu_comprar_mercado_${interaction.id}`)
                        .setPlaceholder(`Selecione um item (Página ${pagina + 1} de ${totalPaginas})`);

                    itensPagina.forEach(anuncio => {
                        menuCompra.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${anuncio.quantidade}x ${anuncio.item_nome}`)
                                .setDescription(`Vend: ${anuncio.vendedor_nome} | K$ ${anuncio.preco}`)
                                .setValue(anuncio.id.toString())
                        );
                    });

                    const rowMenu = new ActionRowBuilder().addComponents(menuCompra);
                    const componentes = [rowMenu];

                    if (totalPaginas > 1) {
                        const rowBotoes = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`btn_ant_${interaction.id}`)
                                .setLabel("◀️ Anterior")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(pagina === 0),
                            new ButtonBuilder()
                                .setCustomId(`btn_prox_${interaction.id}`)
                                .setLabel("Próxima ▶️")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(pagina === totalPaginas - 1)
                        );
                        componentes.push(rowBotoes);
                    }

                    return componentes;
                };

                const msg = await interaction.reply({
                    content: `🛒 **Mercado Global**\nSeu Saldo: **${formatarMoeda(char.saldo)}**\n*Navegue pelas páginas e selecione o item (a compra é imediata):*`,
                    components: gerarComponentes(paginaAtual),
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 120000
                });

                collector.on("collect", async iAction => {
                    if (iAction.isButton()) {
                        if (iAction.customId === `btn_ant_${interaction.id}`) {
                            paginaAtual--;
                        } else if (iAction.customId === `btn_prox_${interaction.id}`) {
                            paginaAtual++;
                        }
                        await iAction.update({ components: gerarComponentes(paginaAtual) });
                    } else if (iAction.isStringSelectMenu() && iAction.customId.startsWith("menu_comprar_mercado")) {
                        const anuncioId = parseInt(iAction.values[0]);

                        const anuncioSelecionado = vitrine.find(a => a.id === anuncioId);

                        if (!anuncioSelecionado) {
                            return iAction.reply({
                                content: "🚫 Anúncio não encontrado ou já expirado.",
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        const precoUnitario = anuncioSelecionado.preco / anuncioSelecionado.quantidade;

                        const modalId = `mod_compra_${iAction.id}`;
                        const modal = new ModalBuilder()
                            .setCustomId(modalId)
                            .setTitle(`Comprar: ${anuncioSelecionado.item_nome.substring(0, 30)}`)
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("inp_qtd_compra")
                                        .setLabel(
                                            `Máx: ${anuncioSelecionado.quantidade} | Unidade: K$ ${precoUnitario.toFixed(2)}`
                                        )
                                        .setStyle(TextInputStyle.Short)
                                        .setValue("1")
                                        .setRequired(true)
                                )
                            );

                        await iAction.showModal(modal);

                        try {
                            const submit = await iAction.awaitModalSubmit({
                                filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                                time: 60000
                            });

                            const qtdCompra = parseInt(submit.fields.getTextInputValue("inp_qtd_compra"));

                            if (isNaN(qtdCompra) || qtdCompra <= 0 || qtdCompra > anuncioSelecionado.quantidade) {
                                return submit.reply({
                                    content: "🚫 Quantidade inválida.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            await submit.deferUpdate();

                            try {
                                const { vendedor, custoTotal } = await MercadoService.comprarItem(
                                    char.id,
                                    anuncioId,
                                    qtdCompra
                                );

                                const precoPago = custoTotal || precoUnitario * qtdCompra;

                                await submit.followUp({
                                    content: `🛍️ **Compra Concluída!**\nVocê comprou **${qtdCompra}x ${anuncioSelecionado.item_nome}** por **${formatarMoeda(precoPago)}**.\nO item já está no seu inventário!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                const discordIdVendedor = vendedor.usuario_id || vendedor.discord_id;
                                await interaction.channel.send({
                                    content: `🤝 **Negócio Fechado no Mercado!** <@${discordIdVendedor}>\n**${char.nome}** comprou **${qtdCompra}x ${anuncioSelecionado.item_nome}** por **${formatarMoeda(precoPago)}** e o dinheiro já está na sua conta!`
                                });

                                await msg.edit({ components: [] }).catch(() => null);
                                collector.stop();
                            } catch (err) {
                                let erroMsg = "❌ Erro ao realizar a compra.";
                                if (err.message === "SALDO_INSUFICIENTE")
                                    erroMsg = "🚫 Você não tem saldo suficiente para comprar essa quantidade.";
                                if (err.message === "ANUNCIO_NAO_ENCONTRADO")
                                    erroMsg = "🚫 Este item já foi vendido ou retirado do mercado.";

                                await submit.followUp({ content: erroMsg, flags: MessageFlags.Ephemeral });
                            }
                            // eslint-disable-next-line no-unused-vars
                        } catch (err) {
                            // Ignora o erro se o usuário fechar o modal ou demorar mais de 60 segundos
                        }
                    }
                });
            } else if (subcomando === "meus_anuncios") {
                const meusAnuncios = await MercadoRepository.buscarAnunciosPorVendedor(char.id);

                if (meusAnuncios.length === 0) {
                    return interaction.reply({
                        content: "📋 Você não possui nenhum item anunciado no mercado no momento.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const menuMeus = new StringSelectMenuBuilder()
                    .setCustomId(`menu_meus_mercado_${interaction.id}`)
                    .setPlaceholder("Selecione um anúncio para CANCELAR");

                meusAnuncios.slice(0, 25).forEach(anuncio => {
                    menuMeus.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${anuncio.quantidade}x ${anuncio.item_nome}`)
                            .setDescription(`Preço: ${formatarMoeda(anuncio.preco)} | Clique para recolher`)
                            .setValue(anuncio.id.toString())
                    );
                });

                const msg = await interaction.reply({
                    content: `📦 **Seus Anúncios Ativos**\n*Selecione um item abaixo se desejar retirá-lo do mercado e devolvê-locpara sua mochila:*`,
                    components: [new ActionRowBuilder().addComponents(menuMeus)],
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                collector.on("collect", async iSelect => {
                    await iSelect.deferUpdate();
                    const anuncioId = parseInt(iSelect.values[0]);

                    try {
                        const anuncioCancelado = await MercadoService.cancelarAnuncio(char.id, anuncioId);

                        await iSelect.followUp({
                            content: `🔙 **Anúncio Cancelado!**\n**${anuncioCancelado.quantidade}x ${anuncioCancelado.item_nome}** foi retirado do mercado e devolvido para a sua mochila.`,
                            flags: MessageFlags.Ephemeral
                        });

                        await msg.edit({ components: [] }).catch(() => null);
                        collector.stop();
                        // eslint-disable-next-line no-unused-vars
                    } catch (err) {
                        await iSelect.followUp({
                            content: "❌ Ocorreu um erro ao cancelar o anúncio. Ele pode já ter sido vendido.",
                            flags: MessageFlags.Ephemeral
                        });
                    }
                });
            }
        } catch (err) {
            console.error("Erro no comando mercado:", err);
            const msgErro = { content: "❌ Ocorreu um erro interno no Mercado.", flags: MessageFlags.Ephemeral };
            interaction.replied
                ? await interaction.followUp(msgErro).catch(() => {})
                : await interaction.reply(msgErro).catch(() => {});
        }
    }
};
