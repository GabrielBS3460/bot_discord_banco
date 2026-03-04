const {
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

module.exports = {

    name: "resgatar",

    async execute({
        message,
        prisma,
        getPersonagemAtivo
    }) {

        const char = await getPersonagemAtivo(message.author.id);

        if (!char)
            return message.reply("Sem personagem ativo.");

        const inscricoesPendentes = await prisma.inscricoes.findMany({
            where: {
                personagem_id: char.id,
                selecionado: true,
                recompensa_resgatada: false,
                missao: { status: "CONCLUIDA" }
            },
            include: { missao: true }
        });

        if (inscricoesPendentes.length === 0) {
            return message.reply(
                "🚫 Você não tem recompensas pendentes de missões concluídas."
            );
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId("menu_resgate_missao")
            .setPlaceholder("Selecione a missão para resgatar");

        inscricoesPendentes.forEach(insc => {

            menu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${insc.missao.nome} (ND ${insc.missao.nd})`)
                    .setDescription(
                        `Recompensa estimada: K$ ${insc.missao.nd * 100}`
                    )
                    .setValue(`${insc.id}_${insc.missao.nd}`)
            );

        });

        const row = new ActionRowBuilder().addComponents(menu);

        const msg = await message.reply({
            content: "💰 **Recompensas Disponíveis:**",
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({
            filter: i =>
                i.user.id === message.author.id &&
                i.customId === "menu_resgate_missao",
            time: 60000
        });

        collector.on("collect", async i => {

            if (!i.isStringSelectMenu()) return;

            const [inscricaoId, ndStr] = i.values[0].split("_");

            const inscId = parseInt(inscricaoId);
            const nd = parseInt(ndStr);

            const modal = new ModalBuilder()
                .setCustomId(`modal_pontos_${inscId}_${nd}`)
                .setTitle("Relatório da Missão");

            modal.addComponents(

                new ActionRowBuilder().addComponents(

                    new TextInputBuilder()
                        .setCustomId("inp_pontos")
                        .setLabel("Quantos Pontos de Missão você ganhou?")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Ex: 1")
                        .setRequired(true)

                )

            );

            await i.showModal(modal);

            try {

                const modalSubmit = await i.awaitModalSubmit({

                    filter: m =>
                        m.customId === `modal_pontos_${inscId}_${nd}` &&
                        m.user.id === i.user.id,

                    time: 120000

                });

                let pontosInput = modalSubmit.fields
                    .getTextInputValue("inp_pontos")
                    .replace(",", ".")
                    .trim();

                const pontosGanhos = parseFloat(pontosInput);

                if (isNaN(pontosGanhos) || pontosGanhos < 0) {

                    return modalSubmit.reply({
                        content: "Valor inválido. Use números (ex: 3 ou 3.5).",
                        flags: MessageFlags.Ephemeral
                    });

                }

                const ouroGanho = nd * 100;

                const charAtual = await getPersonagemAtivo(modalSubmit.user.id);

                let novosPontos = charAtual.pontos_missao + pontosGanhos;
                let novoNivel = charAtual.nivel_personagem;
                let msgUpar = "";

                const custoProx = CUSTO_NIVEL[novoNivel];

                if (custoProx && novosPontos >= custoProx) {

                    novosPontos -= custoProx;
                    novoNivel++;

                    msgUpar =
                        `\n⏫ **LEVEL UP!** Agora você é nível **${novoNivel}**!`;

                }

                await prisma.$transaction([

                    prisma.personagens.update({
                        where: { id: charAtual.id },
                        data: {
                            saldo: { increment: ouroGanho },
                            pontos_missao: novosPontos,
                            nivel_personagem: novoNivel
                        }
                    }),

                    prisma.inscricoes.update({
                        where: { id: inscId },
                        data: { recompensa_resgatada: true }
                    }),

                    prisma.transacao.create({
                        data: {
                            personagem_id: charAtual.id,
                            descricao: `Recompensa Missão (ND ${nd})`,
                            valor: ouroGanho,
                            tipo: "GANHO"
                        }
                    })

                ]);

                await modalSubmit.update({

                    content:
                        `✅ **Recompensa Resgatada!**\n` +
                        `💰 **Kwanzas:** +K$ ${ouroGanho}\n` +
                        `📈 **Pontos:** +${pontosGanhos} (Total: ${novosPontos})` +
                        msgUpar,

                    components: []

                });

            } catch (err) {

                if (err.code !== 10062)
                    console.error("Erro no resgate:", err);

            }

        });

    }

};