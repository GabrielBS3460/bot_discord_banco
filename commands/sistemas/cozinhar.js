const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cozinhar")
        .setDescription("Abre o fogão para preparar refeições se você tiver a perícia Ofício Cozinheiro."),

    async execute({ interaction, prisma, getPersonagemAtivo, DB_CULINARIA }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({ content: "🚫 Você não tem um personagem ativo.", flags: MessageFlags.Ephemeral });
            }

            const listaPericias = char.pericias || [];

            if (!listaPericias.includes("Ofício Cozinheiro")) {
                return interaction.reply({
                    content: "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para usar o fogão sem incendiar a cozinha!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const receitasConhecidas = char.receitas_conhecidas || [];

            if (receitasConhecidas.length === 0) {
                return interaction.reply({
                    content: "⚠️ Você tem a habilidade, mas não conhece nenhuma receita. Use `/aprenderculinaria` primeiro.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const montarMenuReceitas = () => {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("menu_selecionar_receita")
                    .setPlaceholder("🍳 Escolha 1 ou 2 pratos (Combinar)")
                    .setMinValues(1)
                    .setMaxValues(Math.min(2, receitasConhecidas.length)); 

                receitasConhecidas.forEach(nome => {
                    const r = DB_CULINARIA.RECEITAS[nome];
                    if (!r) return;

                    const ingDesc = Object.entries(r.ing)
                        .map(([k, v]) => `${k} x${v}`)
                        .join(", ");

                    menu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(nome)
                            .setDescription(`CD ${r.cd} | ${ingDesc.substring(0, 50)}`)
                            .setValue(nome)
                    );
                });

                return new ActionRowBuilder().addComponents(menu);
            };

            const estoqueInicial = char.estoque_ingredientes || {};
            const estoqueTxt = Object.entries(estoqueInicial).map(([k, v]) => `${k}: ${v}`).join(", ") || "Vazio";

            const msg = await interaction.reply({
                content: `🔥 **Fogão Aceso (Rende 5 Porções)**\n👤 **Cozinheiro:** ${char.nome}\n🔨 **Pontos de Forja:** ${char.pontos_forja_atual.toFixed(1)}\n🎒 **Estoque:** ${estoqueTxt}\n\n*Dica: Você pode selecionar até 2 pratos para fazer uma Refeição Combinada.*`,
                components: [montarMenuReceitas()],
                flags: MessageFlags.Ephemeral, 
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000
            });

            let receitasSelecionadas = [];
            let ingredientesAgregados = {};

            collector.on("collect", async i => {
                const charAtual = await getPersonagemAtivo(interaction.user.id);
                const estoque = charAtual.estoque_ingredientes || {};

                if (i.isStringSelectMenu() && i.customId === "menu_selecionar_receita") {
                    receitasSelecionadas = i.values; 
                    const numReceitas = receitasSelecionadas.length;
                    
                    ingredientesAgregados = {};
                    let efeitosTxt = [];

                    receitasSelecionadas.forEach(nome => {
                        const r = DB_CULINARIA.RECEITAS[nome];
                        efeitosTxt.push(`• ${r.desc}`);
                        for (const [ing, qtd] of Object.entries(r.ing)) {
                            ingredientesAgregados[ing] = (ingredientesAgregados[ing] || 0) + qtd;
                        }
                    });

                    let temIngredientes = true;
                    let faltantes = [];

                    for (const [ing, qtdNecessaria] of Object.entries(ingredientesAgregados)) {
                        if (!estoque[ing] || estoque[ing] < qtdNecessaria) {
                            temIngredientes = false;
                            faltantes.push(`${ing} (${estoque[ing] || 0}/${qtdNecessaria})`);
                        }
                    }

                    if (!temIngredientes) {
                        return i.reply({
                            content: `🚫 **Faltam ingredientes para o preparo:** ${faltantes.join(", ")}`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const custoBasePts = numReceitas * 1.0;
                    const custoEspecialPts = numReceitas * 2.0;

                    if (charAtual.pontos_forja_atual < custoBasePts) {
                        return i.reply({
                            content: `🚫 **Pontos de Forja insuficientes!** Custo: ${custoBasePts.toFixed(1)} pts.\nVocê tem ${charAtual.pontos_forja_atual.toFixed(1)}.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const temEspeciarias = (estoque["Especiarias"] || 0) >= 1;
                    const podeEspecial = temEspeciarias && charAtual.pontos_forja_atual >= custoEspecialPts;

                    const botoes = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("btn_cozinhar_padrao")
                            .setLabel(`Cozinhar (${custoBasePts} Pts)`)
                            .setStyle(ButtonStyle.Success)
                            .setEmoji("🍲"),
                        new ButtonBuilder()
                            .setCustomId("btn_cozinhar_especial")
                            .setLabel(`Especial (${custoEspecialPts} Pts)`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji("✨")
                            .setDisabled(!podeEspecial),
                        new ButtonBuilder()
                            .setCustomId("btn_cancelar_cozinha")
                            .setLabel("Cancelar")
                            .setStyle(ButtonStyle.Secondary)
                    );

                    const tituloPreparo = numReceitas > 1 ? "Prato Combinado" : receitasSelecionadas[0];

                    return i.update({
                        content: `🥘 **Preparando: ${tituloPreparo}**\n📦 **Rendimento:** 5 Porções\n\n**Efeitos Originais:**\n${efeitosTxt.join("\n")}\n\n🔹 **Padrão:** Custa ${custoBasePts.toFixed(1)} pts\n✨ **Especial:** Custa ${custoEspecialPts.toFixed(1)} pts + 1 Especiaria\n\n*Nota: Você poderá editar os efeitos na próxima tela.*`,
                        components: [botoes]
                    });
                }

                if (i.isButton()) {
                    if (i.customId === "btn_cancelar_cozinha") {
                        return i.update({
                            content: "❌ Fogão desligado. Culinária cancelada.",
                            components: [montarMenuReceitas()]
                        });
                    }

                    if (receitasSelecionadas.length === 0) {
                        return i.reply({ content: "Nenhuma receita selecionada.", flags: MessageFlags.Ephemeral });
                    }

                    const numReceitas = receitasSelecionadas.length;
                    const usarEspeciarias = i.customId === "btn_cozinhar_especial";
                    const custoPts = usarEspeciarias ? (numReceitas * 2.0) : (numReceitas * 1.0);

                    if (charAtual.pontos_forja_atual < custoPts) {
                        return i.reply({ content: `Pontos de forja insuficientes (precisa de ${custoPts.toFixed(1)}).`, flags: MessageFlags.Ephemeral });
                    }

                    if (usarEspeciarias && (!estoque["Especiarias"] || estoque["Especiarias"] < 1)) {
                        return i.reply({ content: "Sem especiarias no estoque.", flags: MessageFlags.Ephemeral });
                    }

                    let efeitosPadrao = [];
                    receitasSelecionadas.forEach(nome => {
                        efeitosPadrao.push(`• ${DB_CULINARIA.RECEITAS[nome].desc}`);
                    });

                    const modalId = `modal_efeitos_cozinha_${Date.now()}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle("Descreva a Refeição");

                    const inputEfeitos = new TextInputBuilder()
                        .setCustomId("inp_efeitos")
                        .setLabel("Efeitos mecânicos e sabor do prato:")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setValue(efeitosPadrao.join("\n")); 

                    modal.addComponents(new ActionRowBuilder().addComponents(inputEfeitos));

                    await i.showModal(modal);

                    try {
                        const modalSubmit = await i.awaitModalSubmit({
                            filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                            time: 120000 
                        });

                        await modalSubmit.deferUpdate();

                        const efeitosEditados = modalSubmit.fields.getTextInputValue("inp_efeitos");

                        for (const [ing, qtdNecessaria] of Object.entries(ingredientesAgregados)) {
                            estoque[ing] -= qtdNecessaria;
                            if (estoque[ing] <= 0) delete estoque[ing];
                        }

                        if (usarEspeciarias) {
                            estoque["Especiarias"] -= 1;
                            if (estoque["Especiarias"] <= 0) delete estoque["Especiarias"];
                        }

                        await prisma.personagens.update({
                            where: { id: charAtual.id },
                            data: {
                                estoque_ingredientes: estoque,
                                pontos_forja_atual: { decrement: custoPts }
                            }
                        });

                        const nomePratoLog = receitasSelecionadas.join(" + ");
                        const descLog = usarEspeciarias
                            ? `Cozinhou ${nomePratoLog} x5 (Especial)`
                            : `Cozinhou ${nomePratoLog} x5`;

                        await prisma.transacao.create({
                            data: {
                                personagem_id: charAtual.id,
                                descricao: descLog,
                                valor: 0,
                                tipo: "GASTO"
                            }
                        });

                        const msgSucesso = usarEspeciarias
                            ? `✨ **Banquete Gourmet! (5 Porções)**\nO cozinheiro **${charAtual.nome}** preparou **${nomePratoLog}**.\n*Efeitos (Aprimorados):*\n${efeitosEditados}`
                            : `🍲 **Refeição Pronta! (5 Porções)**\nO cozinheiro **${charAtual.nome}** preparou **${nomePratoLog}**.\n*Efeitos:*\n${efeitosEditados}`;

                        await interaction.channel.send({ content: msgSucesso });

                        const estoqueFinal = Object.entries(estoque).map(([k, v]) => `${k}: ${v}`).join(", ") || "Vazio";

                        await modalSubmit.editReply({
                            content: `✅ O prato foi servido na mesa!\n\n🎒 **Estoque:** ${estoqueFinal}\n🔨 **Pts Restantes:** ${(charAtual.pontos_forja_atual - custoPts).toFixed(1)}\n\n🔥 O fogão foi desligado.`,
                            components: []
                        });

                        collector.stop("cozinhou");

                    } catch (err) {
                        if (err.code === 'InteractionCollectorError') return;
                        console.error("Erro no modal de cozinha:", err);
                    }
                }
            });

        } catch (err) {
            console.error("Erro no comando cozinhar:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao acessar o fogão.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};