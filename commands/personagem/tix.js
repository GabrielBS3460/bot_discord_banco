const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "tix",

    async execute({ message, args, prisma, getPersonagemAtivo, formatarMoeda }) {

        const destinatarioUser = message.mentions.users.first();

        if (!destinatarioUser || destinatarioUser.bot) {
            return message.reply(
                "Você precisa mencionar para quem vai enviar os K$. Ex: `!tix @Amigo 500`"
            ).catch(()=>{});
        }

        if (destinatarioUser.id === message.author.id) {
            return message.reply(
                "Você não pode transferir dinheiro para si mesmo."
            ).catch(()=>{});
        }

        const valorStr = args.find(arg =>
            !isNaN(parseFloat(arg)) && !arg.includes('<@')
        );

        const valor = parseFloat(valorStr);

        if (isNaN(valor) || valor <= 0) {
            return message.reply(
                "Valor inválido. Digite um valor positivo maior que zero."
            ).catch(()=>{});
        }

        try {

            const [charRemetente, charDestinatario] = await Promise.all([
                getPersonagemAtivo(message.author.id),
                getPersonagemAtivo(destinatarioUser.id)
            ]);

            if (!charRemetente)
                return message.reply(
                    "Você não tem um personagem ativo para enviar dinheiro."
                ).catch(()=>{});

            if (!charDestinatario)
                return message.reply(
                    `O usuário **${destinatarioUser.username}** não tem um personagem ativo para receber.`
                ).catch(()=>{});

            if (charRemetente.saldo < valor) {
                return message.reply(
                    `🚫 **${charRemetente.nome}** não tem saldo suficiente. Atual: **${formatarMoeda(charRemetente.saldo)}**.`
                ).catch(()=>{});
            }

            await prisma.$transaction([

                prisma.personagens.update({
                    where: { id: charRemetente.id },
                    data: { saldo: { decrement: valor } }
                }),

                prisma.transacao.create({
                    data: {
                        personagem_id: charRemetente.id,
                        descricao: `Transferiu para ${charDestinatario.nome}`,
                        valor: valor,
                        tipo: 'GASTO'
                    }
                }),

                prisma.personagens.update({
                    where: { id: charDestinatario.id },
                    data: { saldo: { increment: valor } }
                }),

                prisma.transacao.create({
                    data: {
                        personagem_id: charDestinatario.id,
                        descricao: `Recebeu de ${charRemetente.nome}`,
                        valor: valor,
                        tipo: 'RECOMPENSA'
                    }
                })

            ]);

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('💸 Tix Realizado')
                .addFields(
                    { name: 'Remetente', value: charRemetente.nome, inline: true },
                    { name: 'Destinatário', value: charDestinatario.nome, inline: true },
                    { name: 'Valor', value: `**${formatarMoeda(valor)}**`, inline: false }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] }).catch(()=>{});

        } catch (err) {

            console.error("Erro no comando !tix:", err);

            await message.reply(
                "Ocorreu um erro ao processar a transferência."
            ).catch(()=>{});
        }

    }

};