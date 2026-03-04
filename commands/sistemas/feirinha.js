const {
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder
} = require("discord.js");

module.exports = {

    name: "feirinha",

    async execute({
        message,
        prisma,
        getPersonagemAtivo,
        DB_CULINARIA
    }) {

        const char = await getPersonagemAtivo(message.author.id);

        if (!char)
            return message.reply("Você não tem personagem ativo.");

        const listaPericias = char.pericias || [];

        if (!listaPericias.includes("Ofício Cozinheiro")) {
            return message.reply(
                "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para escolher os ingredientes mais frescos!"
            );
        }

        const agora = new Date();
        const ultimaGeracao = char.feira_data_geracao
            ? new Date(char.feira_data_geracao)
            : new Date(0);

        const diffDias =
            (agora - ultimaGeracao) / (1000 * 60 * 60 * 24);

        let itensLoja = char.feira_itens || [];

        if (diffDias >= 7 || !itensLoja || itensLoja.length === 0) {

            const todosIngredientes =
                Object.keys(DB_CULINARIA.INGREDIENTES);

            const sorteados = [];

            for (let i = 0; i < 15; i++) {

                const nome =
                    todosIngredientes[
                        Math.floor(
                            Math.random() *
                                todosIngredientes.length
                        )
                    ];

                sorteados.push({
                    nome: nome,
                    preco: DB_CULINARIA.INGREDIENTES[nome]
                });

            }

            itensLoja = sorteados;

            await prisma.personagens.update({
                where: { id: char.id },
                data: {
                    feira_itens: itensLoja,
                    feira_data_geracao: agora
                }
            });

        }

        const montarMenu = lista => {

            if (lista.length === 0) return null;

            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_comprar_ingrediente")
                .setPlaceholder(
                    `🛒 Selecione um ingrediente (${lista.length} disponíveis)`
                );

            lista.forEach((item, index) => {

                menu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(
                            `${item.nome} - K$ ${item.preco}`
                        )
                        .setValue(
                            `${index}_${item.nome}_${item.preco}`
                        )
                        .setEmoji("🥬")
                );

            });

            return new ActionRowBuilder().addComponents(menu);

        };

        const estoque = char.estoque_ingredientes || {};

        const listaEstoque =
            Object.entries(estoque)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ") || "Vazio";

        const rowInicial = montarMenu(itensLoja);

        const componentsInicial = rowInicial
            ? [rowInicial]
            : [];

        const contentInicial = rowInicial
            ? `🥦 **Feirinha da Semana** (Reseta em: ${
                  7 - Math.floor(diffDias)
              } dias)\n` +
              `💰 **Seu Saldo:** K$ ${char.saldo}\n` +
              `🎒 **Seu Estoque:** ${listaEstoque}\n\n` +
              `*Selecione abaixo para comprar:*`
            : `🥦 **Feirinha da Semana**\n` +
              `🚫 **Estoque Esgotado!** Volte na próxima semana.`;

        const msg = await message.reply({
            content: contentInicial,
            components: componentsInicial
        });

        const collector =
            msg.createMessageComponentCollector({

                filter: i =>
                    i.user.id === message.author.id &&
                    i.customId === "menu_comprar_ingrediente",

                time: 60000

            });

        collector.on("collect", async i => {

            if (!i.isStringSelectMenu()) return;

            const charAtual =
                await getPersonagemAtivo(message.author.id);

            const listaAtual =
                charAtual.feira_itens || [];

            const [indexStr, nome, precoStr] =
                i.values[0].split("_");

            const index = parseInt(indexStr);
            const preco = parseFloat(precoStr);

            if (
                !listaAtual[index] ||
                listaAtual[index].nome !== nome
            ) {

                return i.reply({
                    content:
                        "Este item já foi vendido ou a lista mudou.",
                    flags: MessageFlags.Ephemeral
                });

            }

            if (charAtual.saldo < preco) {

                return i.reply({
                    content: "Dinheiro insuficiente!",
                    flags: MessageFlags.Ephemeral
                });

            }

            const novoEstoque =
                charAtual.estoque_ingredientes || {};

            if (!novoEstoque[nome]) novoEstoque[nome] = 0;

            novoEstoque[nome] += 1;

            listaAtual.splice(index, 1);

            await prisma.$transaction([

                prisma.personagens.update({
                    where: { id: charAtual.id },
                    data: {
                        saldo: { decrement: preco },
                        estoque_ingredientes: novoEstoque,
                        feira_itens: listaAtual
                    }
                }),

                prisma.transacao.create({
                    data: {
                        personagem_id: charAtual.id,
                        descricao: `Comprou ${nome}`,
                        valor: preco,
                        tipo: "GASTO"
                    }
                })

            ]);

            const novoRow = montarMenu(listaAtual);

            const novosComponents = novoRow
                ? [novoRow]
                : [];

            const novoConteudo = novoRow
                ? `✅ Comprou **${nome}**!\n` +
                  `💰 **Saldo:** K$ ${
                      charAtual.saldo - preco
                  }\n` +
                  `🎒 **Estoque:** ${
                      Object.entries(novoEstoque)
                          .map(
                              ([k, v]) => `${k}: ${v}`
                          )
                          .join(", ")
                  }\n\n` +
                  `*Continue comprando:*`
                : `✅ Comprou **${nome}**!\n` +
                  `🚫 **Estoque da Feirinha acabou!**`;

            await i.update({
                content: novoConteudo,
                components: novosComponents
            });

        });

    }

};