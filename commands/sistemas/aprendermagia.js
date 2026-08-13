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

const MagiaService = require("../../services/MagiaService.js");
const ItensRepository = require("../../repositories/ItensRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aprendermagia")
        .setDescription("Aprende uma magia consumindo um pergaminho do seu inventário."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char) {
                return interaction.reply({
                    content: "🚫 Sem personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const inventario = await ItensRepository.buscarInventario(char.id);
            const pergaminhos = inventario.filter(
                i =>
                    i.nome.toLowerCase().includes("pergaminho") ||
                    i.tipo.toLowerCase().includes("pergaminho") ||
                    i.tipo.includes("Poções/Pergaminhos")
            );

            if (!pergaminhos || pergaminhos.length === 0) {
                return interaction.reply({
                    content:
                        "🚫 **Nenhum pergaminho encontrado!**\n" +
                        "Você precisa ter pelo menos um pergaminho no seu inventário para aprender uma magia a partir dele.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const menuPergaminhos = new StringSelectMenuBuilder()
                .setCustomId("select_pergaminho_magia")
                .setPlaceholder("Selecione o pergaminho no seu inventário...");

            pergaminhos.slice(0, 25).forEach(item => {
                menuPergaminhos.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.nome} (x${item.quantidade})`)
                        .setValue(String(item.id))
                        .setDescription(`Tipo: ${item.tipo}`)
                );
            });

            const msg = await interaction.reply({
                content:
                    `📜 **Aprendizado de Magia via Pergaminho**\n` +
                    `👤 **Personagem:** ${char.nome}\n` +
                    `💰 **Saldo:** ${formatarMoeda(char.saldo)}\n` +
                    `🔨 **Pontos de Forja:** ${char.pontos_forja_atual.toFixed(1)} pts\n\n` +
                    `Selecione abaixo o **Pergaminho** que você deseja estudar e consumir:`,
                components: [new ActionRowBuilder().addComponents(menuPergaminhos)],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 120000
            });

            let pergaminhoSelecionado = null;

            collector.on("collect", async componentInter => {
                if (componentInter.customId === "select_pergaminho_magia") {
                    const itemId = parseInt(componentInter.values[0]);
                    pergaminhoSelecionado = pergaminhos.find(p => p.id === itemId);

                    if (!pergaminhoSelecionado) {
                        return componentInter.reply({
                            content: "🚫 Pergaminho não encontrado no inventário.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const menuCirculos = new StringSelectMenuBuilder()
                        .setCustomId("select_circulo_magia")
                        .setPlaceholder("Selecione o Círculo da Magia...")
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel("1º Círculo (Custo: 2 pts de forja)")
                                .setValue("1")
                                .setDescription("Gasta 2 Pontos de Forja"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("2º Círculo (Custo: 4 pts de forja)")
                                .setValue("2")
                                .setDescription("Gasta 4 Pontos de Forja"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("3º Círculo (Custo: 8 pts de forja)")
                                .setValue("3")
                                .setDescription("Gasta 8 Pontos de Forja"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("4º Círculo (Custo: 16 pts de forja)")
                                .setValue("4")
                                .setDescription("Gasta 16 Pontos de Forja"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("5º Círculo (Custo: 32 pts de forja)")
                                .setValue("5")
                                .setDescription("Gasta 32 Pontos de Forja")
                        );

                    await componentInter.update({
                        content:
                            `📜 **Pergaminho Selecionado:** **${pergaminhoSelecionado.nome}** (Qtd: ${pergaminhoSelecionado.quantidade})\n\n` +
                            `Selecione o **Círculo da Magia** para aprender:`,
                        components: [new ActionRowBuilder().addComponents(menuCirculos)]
                    });
                } else if (componentInter.customId === "select_circulo_magia") {
                    if (!pergaminhoSelecionado) {
                        return componentInter.reply({
                            content: "🚫 Por favor, selecione o pergaminho primeiro.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const circulo = parseInt(componentInter.values[0]);
                    const custoPontos = MagiaService.getCustoPontos(circulo);
                    const modalId = `modal_magia_${Date.now()}`;

                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle(`Aprender Magia — ${circulo}º Círculo`)
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_kwanzas")
                                    .setLabel("Custo em Kwanzas (K$)")
                                    .setPlaceholder("Ex: 50 ou 0 se não houver custo")
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
                        if (charAtual.pontos_forja_atual < custoPontos) {
                            return submit.reply({
                                content:
                                    `🚫 **Pontos de Forja insuficientes!**\n` +
                                    `Magias de **${circulo}º Círculo** exigem **${custoPontos} pts**.\n` +
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

                        const resultado = await MagiaService.aprenderMagiaComPergaminho(
                            charAtual.id,
                            circulo,
                            custoKwanzas,
                            pergaminhoSelecionado.id
                        );

                        const embed = new EmbedBuilder()
                            .setTitle("✨ Magia Aprendida & Pergaminho Consumido!")
                            .setColor("#9B59B6")
                            .setDescription(
                                `🧙‍♂️ **${charAtual.nome}** estudou e consumiu 1x **${resultado.nomePergaminho}**!`
                            )
                            .addFields(
                                { name: "📜 Pergaminho Consumido", value: `**1x ${resultado.nomePergaminho}**`, inline: false },
                                { name: "📜 Círculo Aprendido", value: `**${circulo}º Círculo**`, inline: true },
                                { name: "🔨 Pts de Forja Gastos", value: `**-${resultado.custoPontos} pts**`, inline: true },
                                { name: "💰 Kwanzas Gastos", value: `**-${formatarMoeda(resultado.custoKwanzas)}**`, inline: true },
                                { name: "🔨 Pts de Forja Restantes", value: `${resultado.pontosAtualizados.toFixed(1)} pts`, inline: true },
                                { name: "💰 Novo Saldo", value: `${formatarMoeda(resultado.saldoAtualizado)}`, inline: true }
                            )
                            .setTimestamp();

                        collector.stop();
                        await submit.reply({ embeds: [embed] });
                    } catch (err) {
                        if (err.code === "InteractionCollectorError" || err.message?.includes("time")) {
                            return;
                        }
                        console.error("Erro no submit do modal de magia com pergaminho:", err);
                        if (err.message === "PERGAMINHO_NAO_ENCONTRADO") {
                            return submit.reply({
                                content: "🚫 O pergaminho selecionado não foi encontrado mais no seu inventário.",
                                flags: MessageFlags.Ephemeral
                            }).catch(() => {});
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Erro no comando aprendermagia:", err);
            const erroMsg = {
                content: "🚨 Ocorreu um erro ao processar o aprendizado de magia.",
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
