const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require("discord.js");

module.exports = {

    name: "punga",

    async execute({
        message,
        prisma,
        getPersonagemAtivo,
        PungaSystem
    }) {

        try {

            const char = await getPersonagemAtivo(message.author.id);

            if (!char)
                return message.reply(
                    "Você precisa de um personagem ativo para pungar."
                ).catch(()=>{});

            const row = new ActionRowBuilder().addComponents(

                new ButtonBuilder()
                    .setCustomId("punga_dinheiro")
                    .setLabel("Dinheiro")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("💰"),

                new ButtonBuilder()
                    .setCustomId("punga_item")
                    .setLabel("Item")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🎁")

            );

            const msg = await message.reply({
                content: `🥷 **Punga - ${char.nome}**\nO que você deseja tentar roubar?`,
                components: [row]
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            collector.on("collect", async i => {

                try {

                    const tipo =
                        i.customId === "punga_dinheiro"
                            ? "Dinheiro"
                            : "Item";

                    const modal = new ModalBuilder()
                        .setCustomId(`modal_punga_${tipo}`)
                        .setTitle(`Punga: ${tipo}`);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_nd")
                                .setLabel("ND do Alvo (1-20)")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                    await i.showModal(modal);

                    const submit = await i.awaitModalSubmit({
                        filter: inter =>
                            inter.customId === `modal_punga_${tipo}` &&
                            inter.user.id === i.user.id,
                        time: 60000
                    }).catch(() => null);

                    if (!submit) return;

                    const nd = parseInt(
                        submit.fields.getTextInputValue("inp_nd")
                    );

                    if (isNaN(nd) || nd < 1 || nd > 20) {

                        return submit.reply({
                            content: "ND inválido (1-20).",
                            flags: MessageFlags.Ephemeral
                        }).catch(()=>{});

                    }

                    let resultado = "";

                    if (tipo === "Dinheiro") {

                        const valor = PungaSystem.processarDinheiro(nd);

                        await prisma.$transaction([

                            prisma.personagens.update({
                                where: { id: char.id },
                                data: {
                                    saldo: { increment: valor }
                                }
                            }),

                            prisma.transacao.create({
                                data: {
                                    personagem_id: char.id,
                                    descricao: `Punga (Alvo ND ${nd})`,
                                    valor: valor,
                                    tipo: "GANHO"
                                }
                            })

                        ]);

                        const charAtualizado =
                            await getPersonagemAtivo(message.author.id);

                        resultado =
                            `💰 Você pungou **K$ ${valor}**!\n` +
                            `✅ *Valor depositado na conta.*\n` +
                            `💰 **Saldo Atual:** K$ ${charAtualizado.saldo}`;

                    }
                    else {

                        const item = PungaSystem.processarPunga(nd);

                        resultado = `🎁 Você pungou: **${item}**`;

                    }

                    await submit.update({
                        content:
                            `✅ **Resultado (ND ${nd}):**\n${resultado}`,
                        components: []
                    }).catch(()=>{});

                }
                catch (err) {

                    if (err.code === 10062 || err.code === 40060)
                        return;

                    console.error("Erro no comando punga:", err);

                }

            });

        }
        catch (err) {

            console.error("Erro ao iniciar punga:", err);

            message.reply(
                "Ocorreu um erro ao iniciar a punga."
            ).catch(()=>{});

        }

    }

};