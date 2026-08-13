const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const CulinariaService = require("../../services/CulinariaService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aprenderreceita")
        .setDescription("Aprende uma nova receita de culinária gastando 6 Pontos de Forja e Kwanzas."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda, DB_CULINARIA }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char) {
                return interaction.reply({
                    content: "🚫 Sem personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                CulinariaService.verificarPericia(char);
            } catch (e) {
                return interaction.reply({
                    content: "🚫 **Acesso Negado:** Apenas personagens com a perícia **Ofício Cozinheiro** podem aprender receitas!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const conhecidas = char.receitas_conhecidas || [];
            const todasReceitas = Object.keys(DB_CULINARIA.RECEITAS);
            const disponiveis = todasReceitas.filter(r => !conhecidas.includes(r));

            if (disponiveis.length === 0) {
                return interaction.reply({
                    content: "👨‍🍳 **Parabéns!** Você já conhece todas as receitas disponíveis no jogo!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const menuReceitas = new StringSelectMenuBuilder()
                .setCustomId("select_receita_aprender")
                .setPlaceholder("Selecione a receita que deseja aprender...");

            disponiveis.slice(0, 25).forEach(nome => {
                const desc = DB_CULINARIA.RECEITAS[nome]?.desc || "";
                menuReceitas.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(nome)
                        .setValue(nome)
                        .setDescription(desc.substring(0, 100))
                );
            });

            const msg = await interaction.reply({
                content:
                    `👨‍🍳 **Estudo Culinário (Aprender Receita)**\n` +
                    `👤 **Personagem:** ${char.nome}\n` +
                    `💰 **Saldo:** ${formatarMoeda(char.saldo)}\n` +
                    `🔨 **Pontos de Forja:** ${char.pontos_forja_atual.toFixed(1)} pts\n` +
                    `📜 **Receitas Conhecidas:** ${conhecidas.length}/${todasReceitas.length}\n` +
                    `🔥 **Custo de Aprendizado:** 6.0 Pontos de Forja\n\n` +
                    `Selecione abaixo a **Receita** que deseja aprender:`,
                components: [new ActionRowBuilder().addComponents(menuReceitas)],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 120000
            });

            collector.on("collect", async componentInter => {
                if (componentInter.customId === "select_receita_aprender") {
                    const receitaSelecionada = componentInter.values[0];
                    const infoReceita = DB_CULINARIA.RECEITAS[receitaSelecionada];
                    const modalId = `modal_receita_${Date.now()}`;

                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle(`Aprender: ${receitaSelecionada.substring(0, 20)}`)
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_kwanzas")
                                    .setLabel("Custo em Kwanzas (K$)")
                                    .setPlaceholder("Ex: 50 (ou 0 se não houver custo em moedas)")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("0")
                                    .setRequired(true)
                            )
                        );

                    await componentInter.showModal(modal);

                    try {
                        const submit = await componentInter.awaitModalSubmit({
                            filter: inter => inter.customId === modalId && inter.user.id === interaction.user.id,
                            time: 120000
                        });

                        const kwanzasRaw = submit.fields.getTextInputValue("inp_kwanzas").replace(",", ".");
                        const custoKwanzas = parseFloat(kwanzasRaw);

                        if (isNaN(custoKwanzas) || custoKwanzas < 0) {
                            return submit.reply({
                                content: "🚫 **Valor em Kwanzas inválido!** Digite um número maior ou igual a zero.",
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        const charAtual = await getPersonagemAtivo(interaction.user.id);

                        if (charAtual.pontos_forja_atual < 6.0) {
                            return submit.reply({
                                content:
                                    `🚫 **Pontos de Forja insuficientes!**\n` +
                                    `Aprender uma receita exige **6.0 pts** de forja.\n` +
                                    `Você possui: **${charAtual.pontos_forja_atual.toFixed(1)} pts**.`,
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        if (charAtual.saldo < custoKwanzas) {
                            return submit.reply({
                                content:
                                    `🚫 **Saldo insuficiente em Kwanzas!**\n` +
                                    `Custo informado: **${formatarMoeda(custoKwanzas)}**.\n` +
                                    `Seu saldo atual: **${formatarMoeda(charAtual.saldo)}**.`,
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        const resultado = await CulinariaService.aprenderReceitaPorForja(
                            charAtual.id,
                            receitaSelecionada,
                            custoKwanzas
                        );

                        const embed = new EmbedBuilder()
                            .setTitle("🍳 Nova Receita Aprendida!")
                            .setColor("#E67E22")
                            .setDescription(`👨‍🍳 **${charAtual.nome}** estudou as técnicas culinárias e aprendeu **${receitaSelecionada}**!`)
                            .addFields(
                                { name: "📜 Receita", value: `**${receitaSelecionada}**`, inline: true },
                                { name: "✨ Efeito", value: infoReceita?.desc || "Sem descrição", inline: true },
                                { name: "🔨 Pts de Forja Gastos", value: `**-6.0 pts**`, inline: true },
                                { name: "💰 Kwanzas Gastos", value: `**-${formatarMoeda(resultado.custoKwanzas)}**`, inline: true },
                                { name: "🔨 Pts de Forja Restantes", value: `${resultado.pontosAtualizados.toFixed(1)} pts`, inline: true },
                                { name: "💰 Novo Saldo", value: `${formatarMoeda(resultado.saldoAtualizado)}`, inline: true },
                                { name: "📖 Progresso do Livro de Receitas", value: `**${resultado.totalConhecidas}/${todasReceitas.length}** receitas`, inline: false }
                            )
                            .setTimestamp();

                        collector.stop();
                        await submit.reply({ embeds: [embed] });
                    } catch (err) {
                        if (err.code === "InteractionCollectorError" || err.message?.includes("time")) {
                            return;
                        }
                        console.error("Erro no submit do modal de receita:", err);
                    }
                }
            });
        } catch (err) {
            console.error("Erro no comando aprenderreceita:", err);
            const erroMsg = {
                content: "🚨 Ocorreu um erro ao processar o aprendizado da receita.",
                flags: MessageFlags.Ephemeral
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
