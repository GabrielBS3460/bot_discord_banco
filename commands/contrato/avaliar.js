const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const MestreService = require("../../services/MestreService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avaliar")
        .setDescription("Avalia o desempenho de um Mestre em uma missão.")
        .addUserOption(opt => opt.setName("mestre").setDescription("O mestre que narrou a missão").setRequired(true))
        .addStringOption(opt => opt.setName("link").setDescription("Link da missão").setRequired(true)),

    async execute({ interaction }) {
        const mestreUser = interaction.options.getUser("mestre");
        const linkMissao = interaction.options.getString("link");

        if (!linkMissao.startsWith("http")) {
            return interaction.reply({
                content: "⚠️ Forneça um link válido do Contrato.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (mestreUser.id === interaction.user.id) {
            return interaction.reply({ content: "🚫 Autoavaliação não permitida.", flags: MessageFlags.Ephemeral });
        }

        let respostas = { ritmo: null, imersao: null, preparo: null, conhecimento: null, geral: null };
        let telaAtual = 1;

        const gerarOpcoes = () => [
            new StringSelectMenuOptionBuilder().setLabel("1 - Muito Insatisfeito").setValue("1").setEmoji("😠"),
            new StringSelectMenuOptionBuilder().setLabel("2 - Insatisfeito").setValue("2").setEmoji("☹️"),
            new StringSelectMenuOptionBuilder().setLabel("3 - Indiferente").setValue("3").setEmoji("😐"),
            new StringSelectMenuOptionBuilder().setLabel("4 - Satisfeito").setValue("4").setEmoji("🙂"),
            new StringSelectMenuOptionBuilder().setLabel("5 - Muito Satisfeito").setValue("5").setEmoji("🤩")
        ];

        const renderizar = () => {
            if (telaAtual === 1) {
                return {
                    content: `📝 **Avaliando ${mestreUser.username} (1/2)**\n*Sua avaliação é sigilosa.*`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("ritmo")
                                .setPlaceholder(respostas.ritmo ? `Ritmo: ${respostas.ritmo}` : "Ritmo")
                                .addOptions(gerarOpcoes())
                        ),
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("imersao")
                                .setPlaceholder(respostas.imersao ? `Imersão: ${respostas.imersao}` : "Imersão")
                                .addOptions(gerarOpcoes())
                        ),
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("preparo")
                                .setPlaceholder(respostas.preparo ? `Preparo: ${respostas.preparo}` : "Preparo")
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
                };
            } else {
                return {
                    content: `📝 **Avaliando ${mestreUser.username} (2/2)**`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("conhecimento")
                                .setPlaceholder(
                                    respostas.conhecimento ? `Sistema: ${respostas.conhecimento}` : "Conhecimento"
                                )
                                .addOptions(gerarOpcoes())
                        ),
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("geral")
                                .setPlaceholder(respostas.geral ? `Geral: ${respostas.geral}` : "Geral")
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
                };
            }
        };

        const response = await interaction.reply({ ...renderizar(), flags: MessageFlags.Ephemeral, fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 300000 });

        collector.on("collect", async i => {
            if (i.user.id !== interaction.user.id)
                return i.reply({ content: "Ação negada.", flags: MessageFlags.Ephemeral });

            if (i.isStringSelectMenu()) {
                respostas[i.customId] = parseInt(i.values[0]);
                return i.update(renderizar());
            }

            if (i.customId === "btn_proximo") {
                telaAtual = 2;
                return i.update(renderizar());
            }
            if (i.customId === "btn_voltar") {
                telaAtual = 1;
                return i.update(renderizar());
            }

            if (i.customId === "btn_finalizar") {
                try {
                    const media = await MestreService.registrarAvaliacao(
                        interaction.user.id,
                        mestreUser.id,
                        linkMissao,
                        respostas
                    );
                    await i.update({
                        content: `✅ **Avaliação registrada!**\n🧙‍♂️ Mestre: ${mestreUser.username}\n⭐ Média: **${media.toFixed(1)}**`,
                        components: []
                    });
                    collector.stop();
                } catch (err) {
                    console.error(err);
                    await i.update({ content: "❌ Erro ao salvar avaliação.", components: [] });
                }
            }
        });
    }
};
