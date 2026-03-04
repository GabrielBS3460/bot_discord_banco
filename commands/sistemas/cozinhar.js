const {
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {

    name: "cozinhar",

    async execute({
        message,
        prisma,
        getPersonagemAtivo,
        DB_CULINARIA
    }) {

        const char = await getPersonagemAtivo(message.author.id);

        if (!char)
            return message.reply("Você não tem um personagem ativo.");

        const listaPericias = char.pericias || [];

        if (!listaPericias.includes("Ofício Cozinheiro")) {
            return message.reply(
                "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para usar o fogão sem incendiar a cozinha!"
            );
        }

        const receitasConhecidas = char.receitas_conhecidas || [];

        if (receitasConhecidas.length === 0)
            return message.reply(
                "Você tem a habilidade, mas não conhece nenhuma receita."
            );

        const montarMenuReceitas = () => {

            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_selecionar_receita")
                .setPlaceholder("🍳 Escolha o prato");

            receitasConhecidas.forEach(nome => {

                const r = DB_CULINARIA.RECEITAS[nome];
                if (!r) return;

                const ingDesc = Object.entries(r.ing)
                    .map(([k, v]) => `${k} x${v}`)
                    .join(", ");

                menu.addOptions(

                    new StringSelectMenuOptionBuilder()
                        .setLabel(nome)
                        .setDescription(
                            `CD ${r.cd} | ${ingDesc.substring(0, 50)}`
                        )
                        .setValue(nome)

                );

            });

            return new ActionRowBuilder().addComponents(menu);

        };

        const estoqueInicial = char.estoque_ingredientes || {};

        const estoqueTxt =
            Object.entries(estoqueInicial)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ") || "Vazio";

        const msg = await message.reply({

            content:
                `🔥 **Fogão Aceso (Rende 5 Porções)**\n` +
                `👤 **Cozinheiro:** ${char.nome}\n` +
                `🔨 **Pontos de Forja:** ${char.pontos_forja_atual.toFixed(1)}\n` +
                `🎒 **Estoque:** ${estoqueTxt}`,

            components: [montarMenuReceitas()]

        });

        const collector = msg.createMessageComponentCollector({

            filter: i => i.user.id === message.author.id,
            time: 120000

        });

        let receitaSelecionada = null;

        collector.on("collect", async i => {

            const charAtual =
                await getPersonagemAtivo(message.author.id);

            const estoque =
                charAtual.estoque_ingredientes || {};

            if (i.isStringSelectMenu() &&
                i.customId === "menu_selecionar_receita") {

                receitaSelecionada = i.values[0];

                const r =
                    DB_CULINARIA.RECEITAS[receitaSelecionada];

                let temIngredientes = true;
                let faltantes = [];

                for (const [ing, qtd] of Object.entries(r.ing)) {

                    if (!estoque[ing] || estoque[ing] < qtd) {

                        temIngredientes = false;

                        faltantes.push(
                            `${ing} (${estoque[ing] || 0}/${qtd})`
                        );

                    }

                }

                if (!temIngredientes) {

                    return i.reply({
                        content:
                            `🚫 **Faltam ingredientes:** ${faltantes.join(", ")}`,
                        flags: MessageFlags.Ephemeral
                    });

                }

                if (charAtual.pontos_forja_atual < 1.0) {

                    return i.reply({

                        content:
                            `🚫 **Pontos de Forja insuficientes!** Custo base: 1.0 pts.\n` +
                            `Você tem ${charAtual.pontos_forja_atual.toFixed(1)}.`,

                        flags: MessageFlags.Ephemeral

                    });

                }

                const temEspeciarias =
                    (estoque["Especiarias"] || 0) >= 1;

                const podeEspecial =
                    temEspeciarias &&
                    charAtual.pontos_forja_atual >= 2.0;

                const botoes =
                    new ActionRowBuilder().addComponents(

                        new ButtonBuilder()
                            .setCustomId("btn_cozinhar_padrao")
                            .setLabel("Cozinhar (1 Pts)")
                            .setStyle(ButtonStyle.Success)
                            .setEmoji("🍲"),

                        new ButtonBuilder()
                            .setCustomId("btn_cozinhar_especial")
                            .setLabel("Com Especiarias (2 Pts)")
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji("✨")
                            .setDisabled(!podeEspecial),

                        new ButtonBuilder()
                            .setCustomId("btn_cancelar_cozinha")
                            .setLabel("Cancelar")
                            .setStyle(ButtonStyle.Secondary)

                    );

                return i.update({

                    content:
                        `🥘 **Preparando: ${receitaSelecionada}**\n` +
                        `📦 **Rendimento:** 5 Porções\n\n` +
                        `🔹 **Padrão:** Custa 1.0 pts\n` +
                        `✨ **Especial:** Custa 2.0 pts + 1 Especiaria`,

                    components: [botoes]

                });

            }

            if (i.isButton()) {

                if (i.customId === "btn_cancelar_cozinha") {

                    return i.update({

                        content: "❌ Culinária cancelada.",
                        components: [montarMenuReceitas()]

                    });

                }

                if (!receitaSelecionada) {

                    return i.reply({
                        content: "Nenhuma receita selecionada.",
                        flags: MessageFlags.Ephemeral
                    });

                }

                const usarEspeciarias =
                    i.customId === "btn_cozinhar_especial";

                const custoPts =
                    usarEspeciarias ? 2.0 : 1.0;

                const receita =
                    DB_CULINARIA.RECEITAS[receitaSelecionada];

                if (charAtual.pontos_forja_atual < custoPts) {

                    return i.reply({

                        content:
                            `Pontos de forja insuficientes (precisa de ${custoPts}).`,

                        flags: MessageFlags.Ephemeral

                    });

                }

                if (
                    usarEspeciarias &&
                    (!estoque["Especiarias"] ||
                        estoque["Especiarias"] < 1)
                ) {

                    return i.reply({

                        content: "Sem especiarias.",

                        flags: MessageFlags.Ephemeral

                    });

                }

                for (const [ing, qtd] of Object.entries(receita.ing)) {

                    estoque[ing] -= qtd;

                    if (estoque[ing] <= 0)
                        delete estoque[ing];

                }

                if (usarEspeciarias) {

                    estoque["Especiarias"] -= 1;

                    if (estoque["Especiarias"] <= 0)
                        delete estoque["Especiarias"];

                }

                await prisma.personagens.update({

                    where: { id: charAtual.id },

                    data: {

                        estoque_ingredientes: estoque,

                        pontos_forja_atual: {
                            decrement: custoPts
                        }

                    }

                });

                const descLog =
                    usarEspeciarias
                        ? `Cozinhou ${receitaSelecionada} x5 (Especial)`
                        : `Cozinhou ${receitaSelecionada} x5`;

                await prisma.transacao.create({

                    data: {

                        personagem_id: charAtual.id,

                        descricao: descLog,

                        valor: 0,

                        tipo: "GASTO"

                    }

                });

                const msgSucesso =
                    usarEspeciarias
                        ? `✨ **Prato Gourmet Pronto! (5 Porções)**\n` +
                          `Você fez **${receitaSelecionada}**.\n` +
                          `*Efeito:* ${receita.desc} (Aprimorado)`
                        : `🍲 **Prato Pronto! (5 Porções)**\n` +
                          `Você fez **${receitaSelecionada}**.\n` +
                          `*Efeito:* ${receita.desc}`;

                const estoqueFinal =
                    Object.entries(estoque)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ") || "Vazio";

                await i.update({

                    content:
                        `${msgSucesso}\n\n` +
                        `🎒 **Estoque:** ${estoqueFinal}\n` +
                        `🔨 **Pts Restantes:** ${(charAtual.pontos_forja_atual - custoPts).toFixed(1)}\n\n` +
                        `🔥 O fogão foi desligado.`,

                    components: []

                });

                collector.stop("cozinhou");

            }

        });

    }

};