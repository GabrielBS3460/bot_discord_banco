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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("forjar")
        .setDescription("Abre a oficina para forjar ou fabricar novos itens."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda, CUSTO_FORJA }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Sem personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_forja_tipo")
                .setPlaceholder("Selecione o TIPO de fabricação");

            for (const [tipo, custo] of Object.entries(CUSTO_FORJA)) {
                menu.addOptions(
                    new StringSelectMenuOptionBuilder().setLabel(`${tipo} (Custo: ${custo} pts)`).setValue(tipo)
                );
            }

            const msg = await interaction.reply({
                content: `🔨 **Oficina de Forja**\n💰 Saldo: ${formatarMoeda(char.saldo)}\n🔥 Pontos de Forja: ${char.pontos_forja_atual.toFixed(1)}\n\nSelecione o **TIPO** de item que deseja criar:`,
                components: [new ActionRowBuilder().addComponents(menu)],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async i => {
                if (!i.isStringSelectMenu()) return;

                const tipoSelecionado = i.values[0];
                const modalId = `modal_forja_${tipoSelecionado.replace(/\s+/g, "")}_${i.id}`;

                const modal = new ModalBuilder()
                    .setCustomId(modalId)
                    .setTitle(`Forjar: ${tipoSelecionado.substring(0, 30)}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_nome")
                                .setLabel("Nome do Item")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_qtd")
                                .setLabel("Quantidade")
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
                        )
                    );

                await i.showModal(modal);

                try {
                    const submit = await i.awaitModalSubmit({
                        filter: inter => inter.customId === modalId && inter.user.id === interaction.user.id,
                        time: 120000
                    });

                    await submit.deferReply();

                    const nomeItem = submit.fields.getTextInputValue("inp_nome");
                    const qtd = parseInt(submit.fields.getTextInputValue("inp_qtd"));
                    const custoOuro = parseFloat(submit.fields.getTextInputValue("inp_ouro").replace(",", "."));
                    const custoPontosUnit = CUSTO_FORJA[tipoSelecionado];

                    if (isNaN(qtd) || qtd <= 0)
                        return submit.editReply({ content: "🚫 Quantidade inválida.", flags: MessageFlags.Ephemeral });
                    if (isNaN(custoOuro) || custoOuro < 0)
                        return submit.editReply({
                            content: "🚫 Valor em Kwanzas inválido.",
                            flags: MessageFlags.Ephemeral
                        });

                    const { saldoAtualizado, pontosAtualizados, custoPontosTotal } = await ForjaService.executarForja(
                        char.id,
                        tipoSelecionado,
                        nomeItem,
                        qtd,
                        custoOuro,
                        custoPontosUnit
                    );

                    await submit.editReply({
                        content: `⚒️ **NOVO ITEM NA FORJA!** ⚒️\n\n👤 **Ferreiro:** ${interaction.user}\n📦 **Item:** ${qtd}x **${nomeItem}**\n📑 **Tipo:** ${tipoSelecionado}\n💰 **Custo:** ${formatarMoeda(custoOuro)}\n🔨 **Esforço:** ${custoPontosTotal} pts\n\n*A oficina ferve com o som do martelo!*`
                    });

                    await interaction
                        .followUp({
                            content: `⚙️ **Resumo Técnico:** Saldo Restante: ${formatarMoeda(saldoAtualizado)} | Pts: ${pontosAtualizados.toFixed(1)}`,
                            flags: MessageFlags.Ephemeral
                        })
                        .catch(() => {});

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
                    console.log("Tempo de modal expirado ou erro:", err);
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
