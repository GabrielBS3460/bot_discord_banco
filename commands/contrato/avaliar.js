const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {

    name: "avaliar",

    async execute({
        message,
        prisma
    }) {

        const mestreUser = message.mentions.users.first();

        const argsLimpos = message.content
            .split(" ")
            .filter(arg => !arg.startsWith("<@"));

        const linkMissao = argsLimpos.find(arg => arg.startsWith("http"));

        if (!mestreUser)
            return message.reply("⚠️ Mencione o Mestre. Ex: `!avaliar @Mestre <link>`");

        if (!linkMissao)
            return message.reply("⚠️ Forneça o link do Contrato.");

        if (mestreUser.id === message.author.id)
            return message.reply("🚫 Autoavaliação não permitida.");

        let respostas = {
            ritmo: null,
            imersao: null,
            preparo: null,
            conhecimento: null,
            geral: null
        };

        const btnRow = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(`btn_iniciar_avaliacao_${message.id}`)
                .setLabel(`Avaliar ${mestreUser.username}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji("📝")

        );

        const msgPublica = await message.reply({

            content:
                `🔒 **Avaliação Sigilosa**\n\n` +
                `Clique abaixo para avaliar **${mestreUser.username}**.\n\n` +
                `Critérios:\n` +
                `• Ritmo\n` +
                `• Imersão\n` +
                `• Preparo\n` +
                `• Sistema\n` +
                `• Geral`,

            components: [btnRow]

        });

        const collectorInicio = msgPublica.createMessageComponentCollector({

            filter: i =>
                i.user.id === message.author.id &&
                i.customId === `btn_iniciar_avaliacao_${message.id}`,

            time: 60000

        });

        collectorInicio.on("collect", async iInicio => {

            const gerarOpcoes = () => [

                new StringSelectMenuOptionBuilder().setLabel("1 - Muito Insatisfeito").setValue("1").setEmoji("😠"),
                new StringSelectMenuOptionBuilder().setLabel("2 - Insatisfeito").setValue("2").setEmoji("☹️"),
                new StringSelectMenuOptionBuilder().setLabel("3 - Indiferente").setValue("3").setEmoji("😐"),
                new StringSelectMenuOptionBuilder().setLabel("4 - Satisfeito").setValue("4").setEmoji("🙂"),
                new StringSelectMenuOptionBuilder().setLabel("5 - Muito Satisfeito").setValue("5").setEmoji("🤩")

            ];

            const getTela1 = () => ({

                content: `📝 **Avaliando ${mestreUser.username} (1/2)**`,

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
                            .setPlaceholder(respostas.conhecimento ? `Sistema: ${respostas.conhecimento}` : "Conhecimento de Sistema")
                            .addOptions(gerarOpcoes())
                    ),

                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("menu_geral")
                            .setPlaceholder(respostas.geral ? `Geral: ${respostas.geral}` : "Avaliação Geral")
                            .addOptions(gerarOpcoes())
                    ),

                    new ActionRowBuilder().addComponents(

                        new ButtonBuilder()
                            .setCustomId("btn_voltar")
                            .setLabel("⬅️ Voltar")
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId("btn_finalizar")
                            .setLabel("Enviar Avaliação")
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(!respostas.conhecimento || !respostas.geral)

                    )

                ]

            });

            const response = await iInicio.reply({
                ...getTela1(),
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collectorForm = response.createMessageComponentCollector({
                time: 300000
            });

            let telaAtual = 1;

            collectorForm.on("collect", async iForm => {

                if (iForm.user.id !== message.author.id)
                    return iForm.reply({
                        content: "Essa avaliação não é sua.",
                        flags: MessageFlags.Ephemeral
                    });

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

                        await prisma.avaliacao.create({

                            data: {
                                mestre_id: mestreUser.id,
                                avaliador_id: message.author.id,
                                link_missao: linkMissao,
                                nota_ritmo: respostas.ritmo,
                                nota_imersao: respostas.imersao,
                                nota_preparo: respostas.preparo,
                                nota_conhecimento: respostas.conhecimento,
                                nota_geral: respostas.geral
                            }

                        });

                        const media =
                            Object.values(respostas)
                                .reduce((a, b) => a + b, 0) / 5;

                        await iForm.update({

                            content:
                                `✅ **Avaliação registrada!**\n` +
                                `Mestre: ${mestreUser.username}\n` +
                                `⭐ Média: ${media.toFixed(1)}`,

                            components: []

                        });

                        collectorForm.stop();
                        collectorInicio.stop();

                    }

                }

            });

        });

    }

};