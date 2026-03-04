const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "loot",

    async execute({
        message,
        args,
        prisma,
        getPersonagemAtivo,
        formatarMoeda
    }) {

        const destinatarioUser = message.mentions.users.first();

        if (!destinatarioUser || destinatarioUser.bot) {

            return message.reply(
                "Você precisa mencionar um jogador válido. Ex: `!loot @Player 500`"
            );

        }

        const valorStr = args.find(
            arg => !isNaN(parseFloat(arg)) && !arg.includes("<@")
        );

        const valor = parseFloat(valorStr);

        if (isNaN(valor) || valor <= 0) {

            return message.reply(
                "Valor inválido. Digite um valor positivo maior que zero."
            );

        }

        try {

            const charDestinatario =
                await getPersonagemAtivo(destinatarioUser.id);

            if (!charDestinatario) {

                return message.reply(
                    `O usuário **${destinatarioUser.username}** não tem personagem ativo.`
                );

            }

            await prisma.$transaction([

                prisma.personagens.update({
                    where: { id: charDestinatario.id },
                    data: {
                        saldo: { increment: valor }
                    }
                }),

                prisma.transacao.create({
                    data: {
                        personagem_id: charDestinatario.id,
                        descricao: "Loot recebido do Mestre",
                        valor: valor,
                        tipo: "RECOMPENSA"
                    }
                })

            ]);

            const embed = new EmbedBuilder()

                .setColor("#F1C40F")

                .setTitle("🏆 Loot Concedido")

                .addFields(
                    {
                        name: "Jogador",
                        value: charDestinatario.nome,
                        inline: true
                    },
                    {
                        name: "Valor Recebido",
                        value: `**${formatarMoeda(valor)}**`,
                        inline: true
                    }
                )

                .setFooter({
                    text: `Concedido por ${message.author.username}`
                })

                .setTimestamp();

            return message.reply({ embeds: [embed] });

        }
        catch (err) {

            console.error("Erro no comando loot:", err);

            return message.reply(
                "Ocorreu um erro ao conceder o loot."
            );

        }

    }

};