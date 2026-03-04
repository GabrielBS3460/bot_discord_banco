const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "drop",

    async execute({
        message,
        args,
        prisma,
        getPersonagemAtivo,
        gerarRecompensa
    }) {

        const ndInput = args[0];

        if (!ndInput)
            return message.reply("Use: `!drop <ND>`");

        const nd = parseInt(ndInput);

        if (isNaN(nd) || nd <= 0)
            return message.reply("ND inválido.");

        const resultado = gerarRecompensa(nd);

        if (!resultado)
            return message.reply("Erro ao gerar recompensa.");

        let footerTexto = "Sistema de Recompensa T20 JDA";
        let corEmbed = "#9B59B6";

        if (resultado.valor && resultado.valor > 0) {

            const char = await getPersonagemAtivo(message.author.id);

            if (char) {

                await prisma.$transaction([

                    prisma.personagens.update({
                        where: { id: char.id },
                        data: {
                            saldo: { increment: resultado.valor }
                        }
                    }),

                    prisma.transacao.create({
                        data: {
                            personagem_id: char.id,
                            descricao: `Drop ND ${nd}`,
                            valor: resultado.valor,
                            tipo: "GANHO"
                        }
                    })

                ]);

                footerTexto =
                    `✅ K$ ${resultado.valor} creditados para ${char.nome}`;

                corEmbed = "#F1C40F";

            }
            else {

                footerTexto =
                    "⚠️ Nenhum personagem ativo para receber o dinheiro.";

            }

        }

        const embed = new EmbedBuilder()

            .setColor(corEmbed)

            .setTitle(`🎁 Drop Gerado (ND ${nd})`)

            .setDescription(resultado.mensagem || "Nenhum item encontrado.")

            .setFooter({ text: footerTexto });

        return message.reply({ embeds: [embed] });

    }

};