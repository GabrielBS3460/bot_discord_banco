const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avaliar")
        .setDescription("Avalia o desempenho de um Mestre em uma missão.")
        .addUserOption(option =>
            option.setName("mestre").setDescription("O mestre que narrou a missão").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("link").setDescription("Link da mensagem ou documento do contrato").setRequired(true)
        ),

    async execute({ interaction, prisma }) {
        const mestreUser = interaction.options.getUser("mestre");
        const linkMissao = interaction.options.getString("link");

        if (!linkMissao.startsWith("http")) {
            return interaction.reply({
                content: "⚠️ Forneça um link válido do Contrato (deve começar com http).",
                ephemeral: true
            });
        }

        if (mestreUser.id === interaction.user.id) {
            return interaction.reply({
                content: "🚫 Autoavaliação não permitida.",
                ephemeral: true
            });
        }

        let respostas = {
            ritmo: null,
            imersao: null,
            preparo: null,
            conhecimento: null,
            geral: null
        };

        const gerarOpcoes = () => [
            new StringSelectMenuOptionBuilder().setLabel("1 - Muito Insatisfeito").setValue("1").setEmoji("😠"),
            new StringSelectMenuOptionBuilder().setLabel("2 - Insatisfeito").setValue("2").setEmoji("☹️"),
            new StringSelectMenuOptionBuilder().setLabel("3 - Indiferente").setValue("3").setEmoji("😐"),
            new StringSelectMenuOptionBuilder().setLabel("4 - Satisfeito").setValue("4").setEmoji("🙂"),
            new StringSelectMenuOptionBuilder().setLabel("5 - Muito Satisfeito").setValue("5").setEmoji("🤩")
        ];

        const getTela1 = () => ({
            content: `📝 **Avaliando ${mestreUser.username} (1/2)**\n*Sua avaliação é sigilosa e o mestre não saberá suas notas exatas.*`,
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("menu_ritmo")
                        .setPlaceholder(respostas.ritmo ? `Ritmo: ${respostas.ritmo}` : "Avaliação do Ritmo")
                        .addOptions(gerarOpcoes())
                ),
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("menu_imersao")
                        .setPlaceholder(respostas.imersao ? `Imersão: ${respostas.imersao}` : "Avaliação de Imersão")
                        .addOptions(gerarOpcoes())
                ),
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("menu_preparo")
                        .setPlaceholder(respostas.preparo ? `Preparo: ${respostas.preparo}` : "Avaliação de Preparo")
                        .addOptions(gerarOpcoes())
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("btn_proximo")
                        .setLabel("Próximo ➡️")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!respostas.ritmo || !respostas.imersao || !respostas.preparo)
                )
            ]
        });

        const getTela2 = () => ({
            content: `📝 **Avaliando ${mestreUser.username} (2/2)**`,
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("menu_conhecimento")
                        .setPlaceholder(
                            respostas.conhecimento ? `Sistema: ${respostas.conhecimento}` : "Conhecimento de Sistema"
                        )
                        .addOptions(gerarOpcoes())
                ),
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("menu_geral")
                        .setPlaceholder(respostas.geral ? `Geral: ${respostas.geral}` : "Avaliação Geral")
                        .addOptions(gerarOpcoes())
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_voltar").setLabel("⬅️ Voltar").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("btn_finalizar")
                        .setLabel("Enviar Avaliação")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(!respostas.conhecimento || !respostas.geral)
                )
            ]
        });

        const response = await interaction.reply({
            ...getTela1(),
            ephemeral: true,
            fetchReply: true
        });

        const collectorForm = response.createMessageComponentCollector({
            time: 300000
        });

        let telaAtual = 1;

        collectorForm.on("collect", async iForm => {
            if (iForm.user.id !== interaction.user.id) {
                return iForm.reply({ content: "Essa avaliação não é sua.", flags: MessageFlags.Ephemeral });
            }

            if (iForm.isStringSelectMenu()) {
                const valor = parseInt(iForm.values[0]);

                if (iForm.customId === "menu_ritmo") respostas.ritmo = valor;
                if (iForm.customId === "menu_imersao") respostas.imersao = valor;
                if (iForm.customId === "menu_preparo") respostas.preparo = valor;
                if (iForm.customId === "menu_conhecimento") respostas.conhecimento = valor;
                if (iForm.customId === "menu_geral") respostas.geral = valor;

                return iForm.update(telaAtual === 1 ? getTela1() : getTela2());
            }

            if (iForm.isButton()) {
                if (iForm.customId === "btn_proximo") {
                    telaAtual = 2;
                    return iForm.update(getTela2());
                }

                if (iForm.customId === "btn_voltar") {
                    telaAtual = 1;
                    return iForm.update(getTela1());
                }

                if (iForm.customId === "btn_finalizar") {
                    try {
                        await prisma.avaliacao.create({
                            data: {
                                mestre_id: mestreUser.id,
                                avaliador_id: interaction.user.id,
                                link_missao: linkMissao,
                                nota_ritmo: respostas.ritmo,
                                nota_imersao: respostas.imersao,
                                nota_preparo: respostas.preparo,
                                nota_conhecimento: respostas.conhecimento,
                                nota_geral: respostas.geral
                            }
                        });

                        const media = Object.values(respostas).reduce((a, b) => a + b, 0) / 5;

                        await iForm.update({
                            content: `✅ **Avaliação registrada com sucesso!**\n\n🧙‍♂️ Mestre: ${mestreUser.username}\n⭐ Média: **${media.toFixed(1)}**`,
                            components: []
                        });
                    } catch (err) {
                        console.error("Erro ao registrar avaliação:", err);
                        await iForm.update({ content: "❌ Ocorreu um erro ao salvar sua avaliação.", components: [] });
                    }

                    collectorForm.stop();
                }
            }
        });
    }
};
