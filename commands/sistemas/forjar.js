const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require("discord.js");

const ForjaService = require("../../services/ForjaService.js");
const ItensRepository = require("../../repositories/ItensRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("forjar")
        .setDescription("Abre a oficina para forjar ou aprimorar itens no seu inventário.")
        .addStringOption(opt =>
            opt
                .setName("filtro")
                .setDescription("Pesquise parte do nome do item base (usado para Melhorias ou Encantamentos)")
                .setRequired(false)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda, CUSTO_FORJA }) {
        const filtroNome = interaction.options.getString("filtro")?.toLowerCase();

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Sem personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const menuTipos = new StringSelectMenuBuilder()
                .setCustomId("menu_forja_tipo")
                .setPlaceholder("Selecione o TIPO de fabricação");

            for (const [tipo, custo] of Object.entries(CUSTO_FORJA)) {
                menuTipos.addOptions(
                    new StringSelectMenuOptionBuilder().setLabel(`${tipo} (Custo: ${custo} pts)`).setValue(tipo)
                );
            }

            const msgFiltroAviso = filtroNome
                ? `\n🔍 *Filtro ativo:* "**${interaction.options.getString("filtro")}**"`
                : "";

            const msg = await interaction.reply({
                content: `🔨 **Oficina de Forja**\n💰 Saldo: ${formatarMoeda(char.saldo)}\n🔥 Pontos de Forja: ${char.pontos_forja_atual.toFixed(1)}${msgFiltroAviso}\n\nSelecione o **TIPO** de item que deseja criar ou aprimorar:`,
                components: [new ActionRowBuilder().addComponents(menuTipos)],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 120000
            });

            const abrirModalForja = async (interacao, tipoSelecionado, itemBase = null) => {
                const modalId = `modal_forja_${Date.now()}`;

                const tituloModal = itemBase
                    ? `Aprimorar: ${itemBase.nome.substring(0, 20)}`
                    : `Forjar: ${tipoSelecionado.substring(0, 30)}`;

                const modal = new ModalBuilder()
                    .setCustomId(modalId)
                    .setTitle(tituloModal)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_nome")
                                .setLabel("Nome do NOVO Item")
                                .setPlaceholder(itemBase ? `Ex: ${itemBase.nome} +1` : "Nome do item")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_qtd")
                                .setLabel(itemBase ? `Quantidade (Máx: ${itemBase.quantidade})` : "Quantidade")
                                .setStyle(TextInputStyle.Short)
                                .setValue("1")
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_ouro")
                                .setLabel("Custo TOTAL em Kwanzas (K$)")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_link")
                                .setLabel("Descrição")
                                .setPlaceholder("Opcional")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                        )
                    );

                await interacao.showModal(modal);

                try {
                    const submit = await interacao.awaitModalSubmit({
                        filter: inter => inter.customId === modalId && inter.user.id === interaction.user.id,
                        time: 120000
                    });

                    await submit.deferReply({ flags: MessageFlags.Ephemeral });

                    const nomeItem = submit.fields.getTextInputValue("inp_nome");
                    let qtd = parseInt(submit.fields.getTextInputValue("inp_qtd"));
                    const custoOuro = parseFloat(submit.fields.getTextInputValue("inp_ouro").replace(",", "."));
                    const linkItem = submit.fields.getTextInputValue("inp_link");
                    const custoPontosUnit = CUSTO_FORJA[tipoSelecionado];

                    if (isNaN(qtd) || qtd <= 0) return submit.editReply("🚫 Quantidade inválida.");
                    if (isNaN(custoOuro) || custoOuro < 0) return submit.editReply("🚫 Valor em Kwanzas inválido.");

                    if (itemBase && qtd > itemBase.quantidade) {
                        return submit.editReply(
                            `🚫 Você só possui **${itemBase.quantidade}x** de **${itemBase.nome}** para usar como base.`
                        );
                    }

                    const { saldoAtualizado, pontosAtualizados, custoPontosTotal } = await ForjaService.executarForja(
                        char.id,
                        tipoSelecionado,
                        nomeItem,
                        qtd,
                        custoOuro,
                        custoPontosUnit
                    );

                    if (itemBase) {
                        await ItensRepository.removerItem(itemBase.id, qtd);
                    }

                    let tipoFinal = tipoSelecionado;
                    if (itemBase) {
                        tipoFinal = itemBase.tipo;
                    } else if (tipoSelecionado === "Melhorias") {
                        tipoFinal = "Itens Permanentes";
                    } else if (tipoSelecionado === "Encantamento") {
                        tipoFinal = "Item Mágico";
                    }

                    const qtdAdicionar = !itemBase && tipoSelecionado === "Munição" ? qtd * 20 : qtd;

                    await ItensRepository.adicionarItem(char.id, nomeItem, tipoFinal, qtdAdicionar, linkItem || null);

                    const textoBase = itemBase ? `\n♻️ **Item Base Consumido:** ${itemBase.nome}` : "";

                    await submit.editReply({
                        content: `✅ Forja concluída e item salvo no inventário!\n⚙️ **Resumo:** Saldo: ${formatarMoeda(saldoAtualizado)} | Pts Restantes: ${pontosAtualizados.toFixed(1)}`
                    });

                    await interaction.channel.send({
                        content: `⚒️ **NOVO ITEM NA FORJA!** ⚒️\n\n👤 **Ferreiro:** ${interaction.user}\n📦 **Item:** ${qtdAdicionar}x **${nomeItem}**\n📑 **Tipo:** ${tipoFinal}${textoBase}\n💰 **Custo:** ${formatarMoeda(custoOuro)}\n🔨 **Esforço:** ${custoPontosTotal} pts\n\n*A oficina ferve com o som do martelo!*`
                    });

                    await msg.edit({ components: [] }).catch(() => {});
                    collector.stop();
                } catch (err) {
                    if (err.message === "SALDO_INSUFICIENTE") {
                        return msg
                            .edit({ content: "🚫 Kwanzas insuficientes para concluir a forja.", components: [] })
                            .catch(() => {});
                    }
                    if (err.message === "PONTOS_INSUFICIENTES") {
                        return msg
                            .edit({
                                content: "🚫 Pontos de Forja insuficientes para concluir a forja.",
                                components: []
                            })
                            .catch(() => {});
                    }
                    console.error("Tempo de modal expirado ou erro interno:", err);
                }
            };

            collector.on("collect", async i => {
                if (!i.isStringSelectMenu()) return;

                if (i.customId === "menu_forja_tipo") {
                    const tipoSelecionado = i.values[0];

                    if (tipoSelecionado === "Melhorias" || tipoSelecionado === "Encantamento") {
                        const inventario = await ItensRepository.buscarInventario(char.id);

                        let itensValidos = inventario.filter(
                            item => item.tipo === "Itens Permanentes" || item.tipo === "Munição"
                        );

                        if (filtroNome) {
                            itensValidos = itensValidos.filter(item => item.nome.toLowerCase().includes(filtroNome));
                        }

                        if (itensValidos.length === 0) {
                            const msgErro = filtroNome
                                ? `🚫 Você não possui nenhum item base contendo "**${interaction.options.getString("filtro")}**" no inventário.`
                                : "🚫 Você não possui nenhum **Item Permanente** ou **Munição** no inventário para usar como base.";

                            return i.reply({
                                content: msgErro,
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        const menuBase = new StringSelectMenuBuilder()
                            .setCustomId(`menu_base_${tipoSelecionado}`)
                            .setPlaceholder("Selecione o Item Base que será modificado...");

                        itensValidos.slice(0, 25).forEach(item => {
                            menuBase.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${item.nome} (Qtd: ${item.quantidade})`)
                                    .setValue(item.id.toString())
                            );
                        });

                        return i.update({
                            content: `🔨 **${tipoSelecionado}**\nSelecione no menu abaixo o item que você usará como base (ele será consumido/modificado):`,
                            components: [new ActionRowBuilder().addComponents(menuBase)]
                        });
                    } else {
                        await abrirModalForja(i, tipoSelecionado, null);
                    }
                }

                if (i.customId.startsWith("menu_base_")) {
                    const tipoSelecionado = i.customId.split("_").pop();
                    const itemId = parseInt(i.values[0]);

                    const inventario = await ItensRepository.buscarInventario(char.id);
                    const itemBase = inventario.find(item => item.id === itemId);

                    if (!itemBase)
                        return i.reply({
                            content: "Item não encontrado no inventário.",
                            flags: MessageFlags.Ephemeral
                        });

                    await abrirModalForja(i, tipoSelecionado, itemBase);
                }
            });
        } catch (err) {
            console.error("Erro no comando forjar:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao abrir a forja.", flags: MessageFlags.Ephemeral };
            interaction.replied
                ? await interaction.followUp(erroMsg).catch(() => {})
                : await interaction.reply(erroMsg).catch(() => {});
        }
    }
};
