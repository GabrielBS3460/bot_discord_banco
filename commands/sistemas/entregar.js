const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require("discord.js");

module.exports = {

    name: "entregar",

    async execute({ message, prisma, getPersonagemAtivo }) {

        try {

            const destinatarioUser = message.mentions.users.first();

            if (!destinatarioUser) {
                return message.reply(
                    "Você precisa mencionar quem receberá o item."
                ).catch(()=>{});
            }

            const charDestinatario = await getPersonagemAtivo(destinatarioUser.id);

            if (!charDestinatario) {
                return message.reply(
                    "O usuário não tem personagem ativo."
                ).catch(()=>{});
            }

            const botao = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`btn_entregar_${message.id}`)
                    .setLabel("Preencher Dados do Item")
                    .setStyle(ButtonStyle.Primary)
            );

            const msg = await message.reply({
                content: "📦 Clique abaixo para informar os dados do item:",
                components: [botao]
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            collector.on("collect", async interaction => {

                const modal = new ModalBuilder()
                    .setCustomId(`modal_entregar_${message.id}`)
                    .setTitle("Entrega de Item");

                modal.addComponents(

                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_nome_item")
                            .setLabel("Nome do Item")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),

                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_links")
                            .setLabel("Links (um por linha)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )

                );

                await interaction.showModal(modal);

                try {

                    const modalSubmit = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === message.author.id,
                        time: 120000
                    });

                    await modalSubmit.deferReply();

                    const nomeItem = modalSubmit.fields.getTextInputValue("inp_nome_item");

                    const linksTexto = modalSubmit.fields.getTextInputValue("inp_links");

                    const listaLinks = linksTexto
                        .split(/\n|,/)
                        .map(l => l.trim())
                        .filter(l => l.length > 0);

                    const linksFormatados = listaLinks
                        .map(l => `🔗 ${l}`)
                        .join("\n");

                    await prisma.transacao.create({
                        data: {
                            personagem_id: charDestinatario.id,
                            descricao: `Recebeu Item: ${nomeItem}`,
                            valor: 0,
                            tipo: "RECOMPENSA",
                            categoria: "ITEM"
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor("#9B59B6")
                        .setTitle("🎁 Item Entregue!")
                        .setDescription(
                            `**${message.author.username}** entregou um item para **${charDestinatario.nome}**.`
                        )
                        .addFields(
                            { name: "📦 Item", value: nomeItem },
                            { name: "🔗 Links", value: linksFormatados }
                        )
                        .setTimestamp();

                    await modalSubmit.editReply({
                        embeds: [embed]
                    });

                    collector.stop();

                    await msg.edit({
                        components: []
                    });

                } catch (err) {

                    console.log("Modal expirado ou erro:", err);

                }

            });

        } catch (err) {

            console.error("Erro no comando entregar:", err);

            message.reply(
                "Ocorreu um erro ao entregar o item."
            ).catch(()=>{});

        }

    }

};