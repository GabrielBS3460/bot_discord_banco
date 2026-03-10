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

const CulinariaService = require("../../services/CulinariaService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cozinhar")
        .setDescription("Abre o fogão para preparar refeições se você tiver a perícia Ofício Cozinheiro."),

    async execute({ interaction, getPersonagemAtivo, DB_CULINARIA }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char)
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });

            try {
                CulinariaService.verificarPericia(char);
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                return interaction.reply({
                    content:
                        "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para usar o fogão sem incendiar a cozinha!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const receitasConhecidas = char.receitas_conhecidas || [];
            if (receitasConhecidas.length === 0) {
                return interaction.reply({
                    content:
                        "⚠️ Você tem a habilidade, mas não conhece nenhuma receita. Use `/aprenderculinaria` primeiro.",
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
            const estoqueTxt =
                Object.entries(estoqueInicial)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ") || "Vazio";

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
            let analise = {};

            collector.on("collect", async i => {
                const charAtual = await getPersonagemAtivo(interaction.user.id);
                const estoque = charAtual.estoque_ingredientes || {};

                if (i.isStringSelectMenu() && i.customId === "menu_selecionar_receita") {
                    receitasSelecionadas = i.values;

                    analise = CulinariaService.analisarIngredientes(
                        receitasSelecionadas,
                        estoque,
                        charAtual.pontos_forja_atual,
                        DB_CULINARIA
                    );

                    if (!analise.temIngredientes) {
                        return i.reply({
                            content: `🚫 **Faltam ingredientes para o preparo:** ${analise.faltantes.join(", ")}`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (charAtual.pontos_forja_atual < analise.custoBasePts) {
                        return i.reply({
                            content: `🚫 **Pontos de Forja insuficientes!** Custo: ${analise.custoBasePts.toFixed(1)} pts.\nVocê tem ${charAtual.pontos_forja_atual.toFixed(1)}.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const botoes = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("btn_cozinhar_padrao")
                            .setLabel(`Cozinhar (${analise.custoBasePts} Pts)`)
                            .setStyle(ButtonStyle.Success)
                            .setEmoji("🍲"),
                        new ButtonBuilder()
                            .setCustomId("btn_cozinhar_especial")
                            .setLabel(`Especial (${analise.custoEspecialPts} Pts)`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji("✨")
                            .setDisabled(!analise.podeEspecial),
                        new ButtonBuilder()
                            .setCustomId("btn_cancelar_cozinha")
                            .setLabel("Cancelar")
                            .setStyle(ButtonStyle.Secondary)
                    );

                    const tituloPreparo = receitasSelecionadas.length > 1 ? "Prato Combinado" : receitasSelecionadas[0];

                    return i.update({
                        content: `🥘 **Preparando: ${tituloPreparo}**\n📦 **Rendimento:** 5 Porções\n\n**Efeitos Originais:**\n${analise.efeitosPadrao.join("\n")}\n\n🔹 **Padrão:** Custa ${analise.custoBasePts.toFixed(1)} pts\n✨ **Especial:** Custa ${analise.custoEspecialPts.toFixed(1)} pts + 1 Especiaria\n\n*Nota: Você poderá editar os efeitos na próxima tela.*`,
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

                    if (receitasSelecionadas.length === 0)
                        return i.reply({ content: "Nenhuma receita selecionada.", flags: MessageFlags.Ephemeral });

                    const usarEspeciarias = i.customId === "btn_cozinhar_especial";
                    const custoPts = usarEspeciarias ? analise.custoEspecialPts : analise.custoBasePts;

                    const modalId = `modal_efeitos_cozinha_${Date.now()}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle("Descreva a Refeição")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_efeitos")
                                    .setLabel("Efeitos mecânicos e sabor do prato:")
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(true)
                                    .setValue(analise.efeitosPadrao.join("\n"))
                            )
                        );

                    await i.showModal(modal);

                    try {
                        const modalSubmit = await i.awaitModalSubmit({
                            filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                            time: 120000
                        });
                        await modalSubmit.deferUpdate();

                        const efeitosEditados = modalSubmit.fields.getTextInputValue("inp_efeitos");
                        const nomePratoLog = receitasSelecionadas.join(" + ");

                        const estoqueFinalDb = await CulinariaService.finalizarCozimento(
                            charAtual,
                            analise.ingredientesAgregados,
                            usarEspeciarias,
                            custoPts,
                            nomePratoLog
                        );

                        const msgSucesso = usarEspeciarias
                            ? `✨ **Banquete Gourmet! (5 Porções)**\nO cozinheiro **${charAtual.nome}** preparou **${nomePratoLog}**.\n*Efeitos (Aprimorados):*\n${efeitosEditados}`
                            : `🍲 **Refeição Pronta! (5 Porções)**\nO cozinheiro **${charAtual.nome}** preparou **${nomePratoLog}**.\n*Efeitos:*\n${efeitosEditados}`;

                        await interaction.channel.send({ content: msgSucesso });

                        const estoqueFinalTxt =
                            Object.entries(estoqueFinalDb)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ") || "Vazio";

                        await modalSubmit.editReply({
                            content: `✅ O prato foi servido na mesa!\n\n🎒 **Estoque:** ${estoqueFinalTxt}\n🔨 **Pts Restantes:** ${(charAtual.pontos_forja_atual - custoPts).toFixed(1)}\n\n🔥 O fogão foi desligado.`,
                            components: []
                        });

                        collector.stop("cozinhou");
                    } catch (err) {
                        if (err.code === "InteractionCollectorError") return;
                        console.error("Erro no modal de cozinha:", err);
                    }
                }
            });
        } catch (err) {
            console.error("Erro no comando cozinhar:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao acessar o fogão.", flags: MessageFlags.Ephemeral };
            interaction.replied
                ? await interaction.followUp(erroMsg).catch(() => {})
                : await interaction.reply(erroMsg).catch(() => {});
        }
    }
};
