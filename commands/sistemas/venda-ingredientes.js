const {
    SlashCommandBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("venda-ingredientes")
        .setDescription("Inicia uma negociação de ingredientes com outro jogador.")
        .addUserOption(option =>
            option
                .setName("comprador")
                .setDescription("O jogador para quem você quer vender o ingrediente")
                .setRequired(true)
        ),

    async execute({ interaction, prisma, getPersonagemAtivo }) {
        try {
            const compradorUser = interaction.options.getUser("comprador");

            if (compradorUser.id === interaction.user.id) {
                return interaction.reply({ content: "🚫 Você não pode vender para si mesmo.", ephemeral: true });
            }

            if (compradorUser.bot) {
                return interaction.reply({ content: "🚫 Bots não compram itens.", ephemeral: true });
            }

            const vendedorChar = await getPersonagemAtivo(interaction.user.id);
            const compradorChar = await getPersonagemAtivo(compradorUser.id);

            if (!vendedorChar) {
                return interaction.reply({ content: "🚫 Você não tem personagem ativo.", ephemeral: true });
            }

            if (!compradorChar) {
                return interaction.reply({
                    content: `🚫 **${compradorUser.username}** não tem personagem ativo.`,
                    ephemeral: true
                });
            }

            const estoque = vendedorChar.estoque_ingredientes || {};
            const itensDisponiveis = Object.keys(estoque).filter(k => estoque[k] > 0);

            if (itensDisponiveis.length === 0) {
                return interaction.reply({ content: "🎒 Seu inventário de ingredientes está vazio.", ephemeral: true });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`menu_venda_p2p_${interaction.id}`)
                .setPlaceholder("📦 Selecione o item para vender");

            itensDisponiveis.slice(0, 25).forEach(item => {
                menu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(item)
                        .setDescription(`Em estoque: ${estoque[item]}`)
                        .setValue(item)
                );
            });

            const row = new ActionRowBuilder().addComponents(menu);

            const msg = await interaction.reply({
                content: `🤝 **Preparando Venda para ${compradorChar.nome}**\nSelecione o item do seu estoque:`,
                components: [row],
                ephemeral: true,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId === `menu_venda_p2p_${interaction.id}`,
                time: 60000
            });

            collector.on("collect", async i => {
                if (!i.isStringSelectMenu()) return;

                const itemSelecionado = i.values[0];
                const qtdMax = estoque[itemSelecionado];

                const modal = new ModalBuilder()
                    .setCustomId(`modal_venda_p2p_${interaction.id}`)
                    .setTitle(`Vender ${itemSelecionado.substring(0, 30)}`);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_qtd")
                            .setLabel(`Quantidade (máx ${qtdMax})`)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_preco")
                            .setLabel("Preço total da venda (K$)")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

                await i.showModal(modal);

                try {
                    const modalSubmit = await i.awaitModalSubmit({
                        filter: m =>
                            m.customId === `modal_venda_p2p_${interaction.id}` && m.user.id === interaction.user.id,
                        time: 60000
                    });

                    const qtdVenda = parseInt(modalSubmit.fields.getTextInputValue("inp_qtd"));
                    const precoString = modalSubmit.fields.getTextInputValue("inp_preco").replace(",", ".");
                    const precoVenda = parseFloat(precoString);

                    if (isNaN(qtdVenda) || qtdVenda <= 0 || qtdVenda > qtdMax) {
                        return modalSubmit.reply({ content: "🚫 Quantidade inválida.", flags: MessageFlags.Ephemeral });
                    }

                    if (isNaN(precoVenda) || precoVenda < 0) {
                        return modalSubmit.reply({ content: "🚫 Preço inválido.", flags: MessageFlags.Ephemeral });
                    }

                    await modalSubmit.update({
                        content: "✅ Oferta enviada para o canal! Aguarde o comprador aceitar.",
                        components: []
                    });
                    collector.stop();

                    const rowConfirm = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("btn_aceitar_venda")
                            .setLabel(`Comprar por K$ ${precoVenda}`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId("btn_recusar_venda")
                            .setLabel("Recusar / Cancelar")
                            .setStyle(ButtonStyle.Danger)
                    );

                    const ofertaMsg = await interaction.channel.send({
                        content:
                            `📣 **Oferta de Venda P2P**\n\n` +
                            `👤 Vendedor: ${vendedorChar.nome} (<@${interaction.user.id}>)\n` +
                            `👤 Comprador: ${compradorChar.nome} (<@${compradorUser.id}>)\n\n` +
                            `📦 Item: ${qtdVenda}x ${itemSelecionado}\n` +
                            `💰 Valor: K$ ${precoVenda}`,
                        components: [rowConfirm]
                    });

                    const confirmCollector = ofertaMsg.createMessageComponentCollector({
                        filter: btn => btn.user.id === compradorUser.id || btn.user.id === interaction.user.id,
                        time: 120000
                    });

                    confirmCollector.on("collect", async iBtn => {
                        try {
                            if (iBtn.user.id === interaction.user.id && iBtn.customId === "btn_recusar_venda") {
                                await iBtn.update({
                                    content: "❌ Venda cancelada pelo vendedor.",
                                    components: []
                                });
                                return confirmCollector.stop();
                            }

                            if (iBtn.user.id !== compradorUser.id) {
                                return iBtn.reply({
                                    content: "Apenas o comprador pode aceitar a oferta.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            if (iBtn.customId === "btn_recusar_venda") {
                                await iBtn.update({
                                    content: "❌ Venda recusada pelo comprador.",
                                    components: []
                                });
                                return confirmCollector.stop();
                            }

                            if (iBtn.customId === "btn_aceitar_venda") {
                                await iBtn.deferUpdate();

                                const vFinal = await prisma.personagens.findUnique({ where: { id: vendedorChar.id } });
                                const cFinal = await prisma.personagens.findUnique({ where: { id: compradorChar.id } });

                                const estoqueV = vFinal.estoque_ingredientes || {};

                                if (!estoqueV[itemSelecionado] || estoqueV[itemSelecionado] < qtdVenda) {
                                    return iBtn.editReply({
                                        content:
                                            "🚫 O vendedor não tem mais a quantidade exigida desse item no estoque.",
                                        components: []
                                    });
                                }

                                if (cFinal.saldo < precoVenda) {
                                    return iBtn.editReply({
                                        content: "🚫 O comprador não tem saldo suficiente para finalizar a compra.",
                                        components: []
                                    });
                                }

                                estoqueV[itemSelecionado] -= qtdVenda;
                                if (estoqueV[itemSelecionado] <= 0) delete estoqueV[itemSelecionado];

                                const estoqueC = cFinal.estoque_ingredientes || {};
                                estoqueC[itemSelecionado] = (estoqueC[itemSelecionado] || 0) + qtdVenda;

                                await prisma.$transaction([
                                    prisma.personagens.update({
                                        where: { id: vFinal.id },
                                        data: {
                                            estoque_ingredientes: estoqueV,
                                            saldo: { increment: precoVenda }
                                        }
                                    }),
                                    prisma.personagens.update({
                                        where: { id: cFinal.id },
                                        data: {
                                            estoque_ingredientes: estoqueC,
                                            saldo: { decrement: precoVenda }
                                        }
                                    }),
                                    prisma.transacao.create({
                                        data: {
                                            personagem_id: vFinal.id,
                                            descricao: `Vendeu ${qtdVenda}x ${itemSelecionado} para ${cFinal.nome}`,
                                            valor: precoVenda,
                                            tipo: "RECOMPENSA"
                                        }
                                    }),
                                    prisma.transacao.create({
                                        data: {
                                            personagem_id: cFinal.id,
                                            descricao: `Comprou ${qtdVenda}x ${itemSelecionado} de ${vFinal.nome}`,
                                            valor: precoVenda,
                                            tipo: "GASTO"
                                        }
                                    })
                                ]);

                                await iBtn.editReply({
                                    content:
                                        `✅ **Negócio Fechado!**\n\n` +
                                        `**${vFinal.nome}** vendeu **${qtdVenda}x ${itemSelecionado}**\n` +
                                        `**${cFinal.nome}** pagou **K$ ${precoVenda}**`,
                                    components: []
                                });

                                confirmCollector.stop();
                            }
                        } catch (err) {
                            console.error("Erro na confirmação da venda:", err);
                            try {
                                await iBtn.editReply({
                                    content: "❌ Erro ao processar a venda no banco de dados.",
                                    components: []
                                });
                            } catch {
                                /* empty */
                            }
                        }
                    });

                    confirmCollector.on("end", async collected => {
                        if (collected.size === 0) {
                            try {
                                await ofertaMsg.edit({
                                    content: "⏱️ A oferta expirou por falta de resposta.",
                                    components: []
                                });
                            } catch {
                                /* empty */
                            }
                        }
                    });
                    // eslint-disable-next-line no-unused-vars
                } catch (err) {
                    console.log("Modal da venda expirou ou deu erro.");
                }
            });
        } catch (err) {
            console.error("Erro no comando venda-ingredientes:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao iniciar a venda.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
