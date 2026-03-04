const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "solicitada",

    async execute({
        message,
        args,
        prisma,
        client,
        getPersonagemAtivo,
        verificarLimiteMestre,
        formatarMoeda
    }) {

        const mencoesDosPlayers = message.mentions.users;

        if (args.length < 2 || mencoesDosPlayers.size === 0) {
            return message.reply(
                "Use: `!solicitada <ND> <custo> <@player1> ...`"
            ).catch(()=>{});
        }

        const dificuldade = parseInt(args[0]);
        const custoPorPlayer = parseFloat(args[1]);

        const playerIds = mencoesDosPlayers
            .map(u => u.id)
            .filter(id => id !== message.author.id);

        if (isNaN(dificuldade) || isNaN(custoPorPlayer))
            return message.reply("Valores inválidos.").catch(()=>{});

        let patamar = 0;

        if (dificuldade >= 1 && dificuldade <= 4) patamar = 1;
        else if (dificuldade >= 5 && dificuldade <= 10) patamar = 2;
        else if (dificuldade >= 11 && dificuldade <= 16) patamar = 3;
        else if (dificuldade >= 17 && dificuldade <= 20) patamar = 4;

        const recompensaNarrador = 100 * dificuldade;

        try {

            const dadosNarradorUser = await prisma.usuarios.findUnique({
                where: { discord_id: message.author.id },
                include: { personagemAtivo: true }
            });

            if (!dadosNarradorUser)
                return message.reply("Narrador não cadastrado!").catch(()=>{});

            if (!dadosNarradorUser.personagemAtivo)
                return message.reply(
                    "Narrador precisa selecionar um personagem ativo (`!personagem trocar`)."
                ).catch(()=>{});

            const checkMestre = await verificarLimiteMestre(dadosNarradorUser);

            if (checkMestre.limiteAtingido) {

                const msgLimite =
                    checkMestre.limite === 0
                        ? "🚫 Seu Nível de Narrador (1) não permite receber recompensas por missões."
                        : `🚫 Você já atingiu seu limite de **${checkMestre.limite} missões** mensais.`;

                return message.reply(msgLimite).catch(()=>{});
            }

            let personagensPagantes = [];

            for (const id of playerIds) {

                const charAtivo = await getPersonagemAtivo(id);
                const userDiscord = await client.users.fetch(id);

                if (!charAtivo) {
                    return message.reply(
                        `❌ O jogador **${userDiscord.username}** não tem personagem ativo selecionado.`
                    ).catch(()=>{});
                }

                if (charAtivo.saldo < custoPorPlayer) {
                    return message.reply(
                        `❌ **${charAtivo.nome}** (de ${userDiscord.username}) não tem saldo suficiente.`
                    ).catch(()=>{});
                }

                personagensPagantes.push(charAtivo);
            }

            const operacoes = [];

            operacoes.push(
                prisma.personagens.update({
                    where: { id: dadosNarradorUser.personagemAtivo.id },
                    data: { saldo: { increment: recompensaNarrador } }
                })
            );

            operacoes.push(
                prisma.transacao.create({
                    data: {
                        personagem_id: dadosNarradorUser.personagemAtivo.id,
                        descricao: `Mestrou Solicitada ND ${dificuldade}`,
                        valor: recompensaNarrador,
                        tipo: 'RECOMPENSA',
                        categoria: 'MESTRAR_SOLICITADA'
                    }
                })
            );

            for (const pagante of personagensPagantes) {

                operacoes.push(
                    prisma.personagens.update({
                        where: { id: pagante.id },
                        data: { saldo: { decrement: custoPorPlayer } }
                    })
                );

                operacoes.push(
                    prisma.transacao.create({
                        data: {
                            personagem_id: pagante.id,
                            descricao: `Missão Solicitada (Mestre: ${dadosNarradorUser.personagemAtivo.nome})`,
                            valor: custoPorPlayer,
                            tipo: 'GASTO',
                            categoria: 'JOGAR_SOLICITADA'
                        }
                    })
                );
            }

            await prisma.$transaction(operacoes);

            const novaContagemMestre = checkMestre.contagem + 1;
            const restantes = checkMestre.limite - novaContagemMestre;

            const playersEmbedStr =
                personagensPagantes.length > 0
                    ? personagensPagantes.map(p => `• ${p.nome}`).join('\n')
                    : "Nenhum";

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✨ Missão Solicitada Concluída!')
                .addFields(
                    { name: 'Mestre', value: dadosNarradorUser.personagemAtivo.nome, inline: true },
                    { name: 'Lucro', value: formatarMoeda(recompensaNarrador), inline: true },
                    { name: 'Participantes', value: playersEmbedStr }
                )
                .setFooter({
                    text: `Limite de Mestre: ${novaContagemMestre}/${checkMestre.limite} | Restantes: ${restantes}`
                })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (err) {

            console.error("Erro no comando !solicitada:", err);

            message.reply("Erro ao processar a missão.").catch(()=>{});
        }
    }

};