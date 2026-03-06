const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "venda-npc",

    async execute({
        message,
        args,
        prisma,
        getPersonagemAtivo,
        formatarMoeda
    }) {

        const char = await getPersonagemAtivo(message.author.id);

        if (!char) {
            return message.reply("🚫 Você não tem personagem ativo.");
        }

        if (args.length < 2) {
            return message.reply(
                "Uso: `!venda-npc <valor> <link do item>`"
            );
        }

        const valor = parseFloat(args[0]);
        const linkItem = args[1];

        if (isNaN(valor) || valor <= 0) {
            return message.reply("🚫 Valor inválido.");
        }

        if (!linkItem.startsWith("http")) {
            return message.reply("🚫 Você precisa enviar um link válido do item.");
        }

        try {

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
                        descricao: `Venda para NPC`,
                        valor: valor,
                        tipo: "GANHO"
                    }
                })

            ]);

            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("💰 Venda para NPC")
                .addFields(
                    { name: "Personagem", value: char.nome, inline: true },
                    { name: "Valor Recebido", value: formatarMoeda(valor), inline: true },
                    { name: "Item Vendido", value: linkItem }
                )
                .setFooter({ text: "O item foi vendido para um comerciante NPC." })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (err) {

            console.error("Erro no comando venda-npc:", err);
            return message.reply("❌ Ocorreu um erro ao registrar a venda.");

        }

    }

};