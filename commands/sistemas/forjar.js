const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("forjar")
        .setDescription("Abre a oficina para forjar ou fabricar novos itens."),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda, CUSTO_FORJA }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Sem personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    ephemeral: true
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

            const row = new ActionRowBuilder().addComponents(menu);

            const msg = await interaction.reply({
                content:
                    `🔨 **Oficina de Forja**\n` +
                    `💰 Saldo: ${formatarMoeda(char.saldo)}\n` +
                    `🔥 Pontos de Forja: ${char.pontos_forja_atual.toFixed(1)}\n\n` +
                    `Selecione o **TIPO** de item que deseja criar:`,
                components: [row],
                ephemeral: true,
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
                    .setTitle(`Forjar: ${tipoSelecionado.substring(0, 30)}`);

                modal.addComponents(
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

                    const tipo = tipoSelecionado;
                    const nomeItem = submit.fields.getTextInputValue("inp_nome");
                    const qtd = parseInt(submit.fields.getTextInputValue("inp_qtd"));

                    const custoString = submit.fields.getTextInputValue("inp_ouro").replace(",", ".");
                    const custoOuro = parseFloat(custoString);

                    const custoPontosUnit = CUSTO_FORJA[tipo];

                    if (isNaN(qtd) || qtd <= 0) {
                        return submit.reply({ content: "🚫 Quantidade inválida.", ephemeral: true });
                    }

                    if (isNaN(custoOuro) || custoOuro < 0) {
                        return submit.reply({ content: "🚫 Valor em Kwanzas inválido.", ephemeral: true });
                    }

                    const custoPontosTotal = parseFloat((custoPontosUnit * qtd).toFixed(2));

                    const charAtual = await getPersonagemAtivo(interaction.user.id);

                    if (charAtual.saldo < custoOuro) {
                        return submit.reply({
                            content: `🚫 Kwanzas insuficientes! Você tem ${formatarMoeda(charAtual.saldo)}.`,
                            ephemeral: true
                        });
                    }

                    if (charAtual.pontos_forja_atual < custoPontosTotal) {
                        return submit.reply({
                            content: `🚫 Pontos de Forja insuficientes!\nCusta ${custoPontosTotal}, você tem ${charAtual.pontos_forja_atual.toFixed(1)}.`,
                            ephemeral: true
                        });
                    }

                    await prisma.$transaction([
                        prisma.personagens.update({
                            where: { id: charAtual.id },
                            data: {
                                saldo: { decrement: custoOuro },
                                pontos_forja_atual: { decrement: custoPontosTotal }
                            }
                        }),
                        prisma.transacao.create({
                            data: {
                                personagem_id: charAtual.id,
                                descricao: `Forjou ${qtd}x ${nomeItem} (${tipo})`,
                                valor: custoOuro,
                                tipo: "GASTO"
                            }
                        })
                    ]);

                    await submit.reply({
                        content:
                            `✅ **Item Forjado com Sucesso!**\n\n` +
                            `📦 **Item:** ${qtd}x ${nomeItem}\n` +
                            `📑 **Tipo:** ${tipo}\n` +
                            `💰 **Kwanzas Gastos:** ${formatarMoeda(custoOuro)}\n` +
                            `🔨 **Pontos Gastos:** ${custoPontosTotal}\n\n` +
                            `*Saldo Restante: ${formatarMoeda(charAtual.saldo - custoOuro)} | ` +
                            `Pts: ${(charAtual.pontos_forja_atual - custoPontosTotal).toFixed(1)}*`
                    });

                    await msg.edit({ components: [] }).catch(() => {});
                } catch (err) {
                    console.log("Tempo de modal expirado ou erro:", err);
                }
            });
        } catch (err) {
            console.error("Erro no comando forjar:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao abrir a forja.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
