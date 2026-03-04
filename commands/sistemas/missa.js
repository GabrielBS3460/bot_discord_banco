const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "missa",

    async execute({ message, args, prisma, getPersonagemAtivo, formatarMoeda }) {

        const mencoes = message.mentions.users;

        const valorTotal = parseFloat(args[0]);
        const participantesIds = mencoes
            .map(u => u.id)
            .filter(id => id !== message.author.id);

        if (isNaN(valorTotal) || valorTotal <= 0 || participantesIds.length === 0) {
            return message.reply(
                "Sintaxe incorreta! Use: `!missa <valor_total> <@player1> <@player2> ...`"
            ).catch(()=>{});
        }

        const custoIndividual = valorTotal / participantesIds.length;

        try {

            const charClerigo = await getPersonagemAtivo(message.author.id);

            if (!charClerigo)
                return message.reply("Você (Clérigo) não tem personagem ativo.").catch(()=>{});

            let charsPagantes = [];

            for (const id of participantesIds) {

                const char = await getPersonagemAtivo(id);

                if (!char)
                    return message.reply(
                        `O usuário <@${id}> não tem personagem ativo.`
                    ).catch(()=>{});

                if (char.saldo < custoIndividual)
                    return message.reply(
                        `**${char.nome}** não tem saldo suficiente para pagar a parte dele.`
                    ).catch(()=>{});

                charsPagantes.push(char);
            }

            const operacoes = [];

            operacoes.push(
                prisma.personagens.update({
                    where: { id: charClerigo.id },
                    data: { saldo: { increment: valorTotal } }
                })
            );

            operacoes.push(
                prisma.transacao.create({
                    data: {
                        personagem_id: charClerigo.id,
                        descricao: `Realizou Missa`,
                        valor: valorTotal,
                        tipo: 'VENDA'
                    }
                })
            );

            for (const fiel of charsPagantes) {

                operacoes.push(
                    prisma.personagens.update({
                        where: { id: fiel.id },
                        data: { saldo: { decrement: custoIndividual } }
                    })
                );

                operacoes.push(
                    prisma.transacao.create({
                        data: {
                            personagem_id: fiel.id,
                            descricao: `Pagou Missa para ${charClerigo.nome}`,
                            valor: custoIndividual,
                            tipo: 'GASTO'
                        }
                    })
                );
            }

            await prisma.$transaction(operacoes);

            const lista = charsPagantes.map(p => `• ${p.nome}`).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🙏 Missa Realizada')
                .addFields(
                    { name: 'Clérigo', value: `${charClerigo.nome} (+${formatarMoeda(valorTotal)})` },
                    { name: 'Custo por Fiel', value: formatarMoeda(custoIndividual) },
                    { name: 'Fiéis', value: lista }
                );

            await message.channel.send({ embeds: [embed] }).catch(()=>{});

        } catch (err) {

            console.error(err);

            message.reply("Erro ao processar a missa.").catch(()=>{});
        }

    }

};