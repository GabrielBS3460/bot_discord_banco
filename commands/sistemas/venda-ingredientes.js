const {
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

    name: "venda-ingredientes",

    async execute({
        message,
        prisma,
        getPersonagemAtivo
    }) {

        const compradorUser = message.mentions.users.first();

        if (!compradorUser)
            return message.reply("⚠️ Mencione o comprador. Ex: `!venda-ingredientes @Fulano`");

        if (compradorUser.id === message.author.id)
            return message.reply("🚫 Você não pode vender para si mesmo.");

        if (compradorUser.bot)
            return message.reply("🚫 Bots não compram itens.");

        const vendedorChar = await getPersonagemAtivo(message.author.id);
        const compradorChar = await getPersonagemAtivo(compradorUser.id);

        if (!vendedorChar)
            return message.reply("🚫 Você não tem personagem ativo.");

        if (!compradorChar)
            return message.reply(`🚫 **${compradorUser.username}** não tem personagem ativo.`);

        const estoque = vendedorChar.estoque_ingredientes || {};
        const itensDisponiveis = Object.keys(estoque).filter(k => estoque[k] > 0);

        if (itensDisponiveis.length === 0)
            return message.reply("🎒 Seu inventário de ingredientes está vazio.");

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`menu_venda_p2p_${message.id}`)
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

        const msg = await message.reply({

            content:
                `🤝 **Nova Venda**\n` +
                `👤 Vendedor: ${vendedorChar.nome}\n` +
                `👤 Comprador: ${compradorChar.nome}\n\n` +
                `Selecione o item:`,

            components: [row]

        });

        const collector = msg.createMessageComponentCollector({

            filter: i =>
                i.user.id === message.author.id &&
                i.customId === `menu_venda_p2p_${message.id}`,

            time: 60000

        });

        collector.on("collect", async i => {

            if (!i.isStringSelectMenu()) return;

            const itemSelecionado = i.values[0];
            const qtdMax = estoque[itemSelecionado];

            const modal = new ModalBuilder()
                .setCustomId(`modal_venda_p2p_${message.id}`)
                .setTitle(`Vender ${itemSelecionado}`);

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
                        .setLabel("Preço total (K$)")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)

                )

            );

            await i.showModal(modal);

            try {

                const modalSubmit = await i.awaitModalSubmit({

                    filter: m =>
                        m.customId === `modal_venda_p2p_${message.id}` &&
                        m.user.id === message.author.id,

                    time: 60000

                });

                const qtdVenda = parseInt(
                    modalSubmit.fields.getTextInputValue("inp_qtd")
                );

                const precoVenda = parseFloat(
                    modalSubmit.fields.getTextInputValue("inp_preco")
                );

                if (isNaN(qtdVenda) || qtdVenda <= 0 || qtdVenda > qtdMax)
                    return modalSubmit.reply({
                        content: "🚫 Quantidade inválida.",
                        flags: MessageFlags.Ephemeral
                    });

                if (isNaN(precoVenda) || precoVenda < 0)
                    return modalSubmit.reply({
                        content: "🚫 Preço inválido.",
                        flags: MessageFlags.Ephemeral
                    });

                const rowConfirm = new ActionRowBuilder().addComponents(

                    new ButtonBuilder()
                        .setCustomId("btn_aceitar_venda")
                        .setLabel(`Comprar por K$ ${precoVenda}`)
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId("btn_recusar_venda")
                        .setLabel("Recusar")
                        .setStyle(ButtonStyle.Danger)

                );

                await modalSubmit.update({

                    content:
                        `📣 **Oferta de Venda**\n\n` +
                        `👤 Vendedor: ${vendedorChar.nome}\n` +
                        `👤 Comprador: <@${compradorUser.id}>\n\n` +
                        `📦 Item: ${qtdVenda}x ${itemSelecionado}\n` +
                        `💰 Valor: K$ ${precoVenda}`,

                    components: [rowConfirm]

                });

                const confirmCollector = msg.createMessageComponentCollector({

                    filter: btn =>
                        btn.user.id === compradorUser.id ||
                        btn.user.id === message.author.id,

                    time: 120000

                });

                confirmCollector.on("collect", async iBtn => {

                    try {

                        if (
                            iBtn.user.id === message.author.id &&
                            iBtn.customId === "btn_recusar_venda"
                        ) {

                            await iBtn.update({
                                content: "❌ Venda cancelada pelo vendedor.",
                                components: []
                            });

                            return confirmCollector.stop();

                        }

                        if (iBtn.user.id !== compradorUser.id)
                            return iBtn.reply({
                                content: "Apenas o comprador pode aceitar.",
                                flags: MessageFlags.Ephemeral
                            });

                        if (iBtn.customId === "btn_recusar_venda") {

                            await iBtn.update({
                                content: "❌ Venda recusada.",
                                components: []
                            });

                            return confirmCollector.stop();

                        }

                        if (iBtn.customId === "btn_aceitar_venda") {

                            await iBtn.deferUpdate();

                            const vFinal = await prisma.personagens.findUnique({
                                where: { id: vendedorChar.id }
                            });

                            const cFinal = await prisma.personagens.findUnique({
                                where: { id: compradorChar.id }
                            });

                            const estoqueV = vFinal.estoque_ingredientes || {};

                            if (
                                !estoqueV[itemSelecionado] ||
                                estoqueV[itemSelecionado] < qtdVenda
                            )
                                return iBtn.editReply({
                                    content: "🚫 O vendedor não tem mais esse item.",
                                    components: []
                                });

                            if (cFinal.saldo < precoVenda)
                                return iBtn.editReply({
                                    content: "🚫 Saldo insuficiente.",
                                    components: []
                                });

                            estoqueV[itemSelecionado] -= qtdVenda;
                            if (estoqueV[itemSelecionado] <= 0)
                                delete estoqueV[itemSelecionado];

                            const estoqueC = cFinal.estoque_ingredientes || {};
                            estoqueC[itemSelecionado] =
                                (estoqueC[itemSelecionado] || 0) + qtdVenda;

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
                                })

                            ]);

                            await iBtn.editReply({

                                content:
                                    `✅ **Negócio Fechado!**\n\n` +
                                    `${vFinal.nome} vendeu **${qtdVenda}x ${itemSelecionado}**\n` +
                                    `${cFinal.nome} pagou **K$ ${precoVenda}**`,

                                components: []

                            });

                            confirmCollector.stop();

                        }

                    }
                    catch (err) {

                        console.error("Erro venda:", err);

                        try {
                            await iBtn.editReply({
                                content: "❌ Erro ao processar a venda.",
                                components: []
                            });
                        } catch {}

                    }

                });

            }
            catch {}

        });

    }

};