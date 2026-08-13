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

const SustentoService = require("../../services/SustentoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sustento")
        .setDescription("Realiza o teste de Sustento (CD 15) com rolagem automática de D20 e Modal."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char) {
                return interaction.reply({
                    content: "🚫 Sem personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const periciasDoChar = Array.isArray(char.pericias) ? char.pericias : [];
            const opcoesPadrao = ["Ofício", "Sobrevivência", "Cura", "Adestramento", "Atributo (Sem Treinamento)"];

            const listaPericiasUnicas = [...new Set([...periciasDoChar, ...opcoesPadrao])];

            const menuPericias = new StringSelectMenuBuilder()
                .setCustomId("select_pericia_sustento")
                .setPlaceholder("Selecione a perícia ou atributo para o sustento...");

            listaPericiasUnicas.slice(0, 25).forEach(p => {
                const ehDoChar = periciasDoChar.includes(p);
                menuPericias.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(p)
                        .setValue(p)
                        .setDescription(ehDoChar ? "Perícia treinada na sua ficha" : "Opção geral / Atributo")
                );
            });

            const msg = await interaction.reply({
                content:
                    `🛠️ **Trabalho & Sustento (CD 15)**\n` +
                    `👤 **Personagem:** **${char.nome}**\n` +
                    `💰 **Saldo Atual:** ${formatarMoeda(char.saldo)}\n\n` +
                    `Selecione abaixo a **Perícia ou Atributo** que você utilizará no teste:`,
                components: [new ActionRowBuilder().addComponents(menuPericias)],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 120000
            });

            collector.on("collect", async componentInter => {
                if (componentInter.customId === "select_pericia_sustento") {
                    const periciaSelecionada = componentInter.values[0];
                    const modalId = `modal_sustento_${Date.now()}`;

                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle(`Sustento — ${periciaSelecionada.substring(0, 18)}`)
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_bonus_teste")
                                    .setLabel("Bônus no Teste (+Bônus da Perícia)")
                                    .setPlaceholder("Ex: 7 (Bônus total a somar no d20)")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("0")
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_bonus_ganho")
                                    .setLabel("Bônus de Ganho por Poderes (Kwanzas)")
                                    .setPlaceholder("Ex: 2 (Valor adicional ganho por semana)")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("0")
                                    .setRequired(false)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_semanas")
                                    .setLabel("Semanas Trabalhadas")
                                    .setPlaceholder("Padrão: 1")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("1")
                                    .setRequired(false)
                            )
                        );

                    await componentInter.showModal(modal);

                    try {
                        const submit = await componentInter.awaitModalSubmit({
                            filter: inter => inter.customId === modalId && inter.user.id === interaction.user.id,
                            time: 120000
                        });

                        await submit.deferReply();

                        const bonusTesteRaw = submit.fields.getTextInputValue("inp_bonus_teste").replace("+", "").trim();
                        const bonusGanhoRaw = submit.fields.getTextInputValue("inp_bonus_ganho").replace("+", "").trim();
                        const semanasRaw = submit.fields.getTextInputValue("inp_semanas").trim();

                        const bonusTeste = parseInt(bonusTesteRaw) || 0;
                        const bonusGanho = parseInt(bonusGanhoRaw) || 0;
                        const semanas = Math.max(1, parseInt(semanasRaw) || 1);

                        if (isNaN(bonusTeste)) {
                            return submit.editReply({
                                content: "🚫 **Bônus de teste inválido!** Digite um número inteiro."
                            });
                        }

                        // Rolagem Automática de D20
                        const d20 = Math.floor(Math.random() * 20) + 1;
                        const resultadoTotal = d20 + bonusTeste;

                        const charAtual = await getPersonagemAtivo(interaction.user.id);
                        const resultadoSustento = await SustentoService.executarSustento(
                            charAtual.id,
                            resultadoTotal,
                            bonusGanho,
                            semanas,
                            periciaSelecionada
                        );

                        const { analise, saldoAtualizado } = resultadoSustento;

                        if (!analise.sucesso) {
                            const embedFalha = new EmbedBuilder()
                                .setTitle("🛠️ Teste de Sustento")
                                .setColor("#E74C3C")
                                .setDescription(`👤 **Personagem:** **${charAtual.nome}**`)
                                .addFields(
                                    { name: "🎲 Rolagem do D20", value: `1d20 (**${d20}**) + Bônus (**${bonusTeste}**) = **${resultadoTotal}**`, inline: false },
                                    { name: "🎯 CD Alvo", value: "**15**", inline: true },
                                    { name: "📜 Perícia Usada", value: periciaSelecionada, inline: true },
                                    { name: "📊 Status", value: "❌ Não atingiu a CD 15 mínima para obter sustento esta semana.", inline: false },
                                    { name: "💰 Kwanzas Ganhos", value: "**K$ 0,00**", inline: true },
                                    { name: "💰 Saldo Atual", value: `${formatarMoeda(charAtual.saldo)}`, inline: true }
                                )
                                .setTimestamp();

                            collector.stop();
                            return submit.editReply({ embeds: [embedFalha] });
                        }

                        const embedSucesso = new EmbedBuilder()
                            .setTitle("⚒️ Trabalho & Sustento Concluído!")
                            .setColor("#2ECC71")
                            .setDescription(`👤 **Personagem:** **${charAtual.nome}**`)
                            .addFields(
                                { name: "🎲 Rolagem do D20", value: `1d20 (**${d20}**) + Bônus (**${bonusTeste}**) = **${resultadoTotal}**`, inline: false },
                                { name: "🎯 CD Alvo", value: `**15** (Excesso: **+${analise.excesso}** pts)`, inline: true },
                                { name: "📜 Perícia Usada", value: periciaSelecionada, inline: true },
                                { name: "📅 Semanas", value: `${semanas} semana(s)`, inline: true },
                                { name: "💵 Ganho Base Semanal", value: `${formatarMoeda(analise.ganhoSemanalBase)}/sem`, inline: true },
                                { name: "✨ Bônus de Poderes", value: bonusGanho > 0 ? `+${formatarMoeda(bonusGanho)}/sem` : "Nenhum", inline: true },
                                { name: "💰 Total Ganho Recebido", value: `**+${formatarMoeda(analise.ganhoFinalTotal)}**`, inline: false },
                                { name: "💰 Novo Saldo", value: `${formatarMoeda(saldoAtualizado)}`, inline: false }
                            )
                            .setTimestamp();

                        collector.stop();
                        return submit.editReply({ embeds: [embedSucesso] });
                    } catch (err) {
                        if (err.code === "InteractionCollectorError" || err.message?.includes("time")) {
                            return;
                        }
                        console.error("Erro no submit do modal de sustento:", err);
                    }
                }
            });
        } catch (err) {
            console.error("Erro no comando sustento:", err);
            const erroMsg = {
                content: "🚨 Ocorreu um erro ao processar o teste de sustento.",
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
