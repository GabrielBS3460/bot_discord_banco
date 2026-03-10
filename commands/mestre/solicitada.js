const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("solicitada")
        .setDescription("Registra uma missão solicitada, cobra os jogadores e recompensa o Mestre.")
        .addIntegerOption(option =>
            option.setName("nd").setDescription("Nível de Desafio (ND) da missão").setRequired(true).setMinValue(1)
        )
        .addNumberOption(option =>
            option
                .setName("custo")
                .setDescription("Custo em Kwanzas a ser cobrado DE CADA jogador")
                .setRequired(true)
                .setMinValue(0)
        )
        .addUserOption(option => option.setName("jogador1").setDescription("Jogador 1").setRequired(true))
        .addUserOption(option => option.setName("jogador2").setDescription("Jogador 2").setRequired(false))
        .addUserOption(option => option.setName("jogador3").setDescription("Jogador 3").setRequired(false))
        .addUserOption(option => option.setName("jogador4").setDescription("Jogador 4").setRequired(false))
        .addUserOption(option => option.setName("jogador5").setDescription("Jogador 5").setRequired(false))
        .addUserOption(option => option.setName("jogador6").setDescription("Jogador 6").setRequired(false)),

    async execute({ interaction, prisma, getPersonagemAtivo, verificarLimiteMestre, formatarMoeda }) {
        const dificuldade = interaction.options.getInteger("nd");
        const custoPorPlayer = interaction.options.getNumber("custo");

        const playerUsers = [];
        for (let i = 1; i <= 6; i++) {
            const user = interaction.options.getUser(`jogador${i}`);
            if (user && user.id !== interaction.user.id && !user.bot) {
                if (!playerUsers.some(u => u.id === user.id)) {
                    playerUsers.push(user);
                }
            }
        }

        if (playerUsers.length === 0) {
            return interaction.reply({
                content:
                    "🚫 Você precisa informar pelo menos 1 jogador válido (bots e o próprio mestre são ignorados).",
                ephemeral: true
            });
        }

        const playerIds = playerUsers.map(u => u.id);

        let patamar = 0;
        if (dificuldade >= 1 && dificuldade <= 4) patamar = 1;
        else if (dificuldade >= 5 && dificuldade <= 10) patamar = 2;
        else if (dificuldade >= 11 && dificuldade <= 16) patamar = 3;
        // eslint-disable-next-line no-unused-vars
        else if (dificuldade >= 17 && dificuldade <= 20) patamar = 4;

        const recompensaNarrador = 100 * dificuldade;

        try {
            const dadosNarradorUser = await prisma.usuarios.findUnique({
                where: { discord_id: interaction.user.id },
                include: { personagemAtivo: true }
            });

            if (!dadosNarradorUser) {
                return interaction.reply({ content: "🚫 Narrador não cadastrado!", ephemeral: true });
            }

            if (!dadosNarradorUser.personagemAtivo) {
                return interaction.reply({
                    content: "🚫 O Narrador precisa selecionar um personagem ativo (`/personagem trocar`).",
                    ephemeral: true
                });
            }

            const checkMestre = await verificarLimiteMestre(dadosNarradorUser);

            if (checkMestre.limiteAtingido) {
                const msgLimite =
                    checkMestre.limite === 0
                        ? "🚫 Seu Nível de Narrador (1) não permite receber recompensas por missões."
                        : `🚫 Você já atingiu seu limite de **${checkMestre.limite} missões** mensais.`;

                return interaction.reply({ content: msgLimite, ephemeral: true });
            }

            let personagensPagantes = [];

            for (const id of playerIds) {
                const charAtivo = await getPersonagemAtivo(id);
                const userDiscord = playerUsers.find(u => u.id === id);

                if (!charAtivo) {
                    return interaction.reply({
                        content: `❌ O jogador **${userDiscord.username}** não tem personagem ativo selecionado.`,
                        ephemeral: true
                    });
                }

                if (charAtivo.saldo < custoPorPlayer) {
                    return interaction.reply({
                        content: `❌ **${charAtivo.nome}** (de ${userDiscord.username}) não tem saldo suficiente. Precisaria de K$ ${custoPorPlayer}, mas tem K$ ${charAtivo.saldo.toFixed(2)}.`,
                        ephemeral: true
                    });
                }

                personagensPagantes.push(charAtivo);
            }

            const operacoes = [];

            operacoes.push(
                prisma.personagens.update({
                    where: { id: dadosNarradorUser.personagemAtivo.id },
                    data: { saldo: { increment: recompensaNarrador } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: dadosNarradorUser.personagemAtivo.id,
                        descricao: `Mestrou Solicitada ND ${dificuldade}`,
                        valor: recompensaNarrador,
                        tipo: "RECOMPENSA",
                        categoria: "MESTRAR_SOLICITADA"
                    }
                })
            );

            for (const pagante of personagensPagantes) {
                operacoes.push(
                    prisma.personagens.update({
                        where: { id: pagante.id },
                        data: { saldo: { decrement: custoPorPlayer } }
                    }),
                    prisma.transacao.create({
                        data: {
                            personagem_id: pagante.id,
                            descricao: `Missão Solicitada (Mestre: ${dadosNarradorUser.personagemAtivo.nome})`,
                            valor: custoPorPlayer,
                            tipo: "GASTO",
                            categoria: "JOGAR_SOLICITADA"
                        }
                    })
                );
            }

            await prisma.$transaction(operacoes);

            const novaContagemMestre = checkMestre.contagem + 1;
            const restantes = checkMestre.limite - novaContagemMestre;

            const playersEmbedStr = personagensPagantes.map(p => `• ${p.nome}`).join("\n");

            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("✨ Missão Solicitada Concluída!")
                .addFields(
                    { name: "Mestre", value: dadosNarradorUser.personagemAtivo.nome, inline: true },
                    { name: "Lucro do Mestre", value: formatarMoeda(recompensaNarrador), inline: true },
                    { name: "Custo por Jogador", value: formatarMoeda(custoPorPlayer), inline: true },
                    { name: "Participantes Pagantes", value: playersEmbedStr }
                )
                .setFooter({
                    text: `Limite de Mestre: ${novaContagemMestre}/${checkMestre.limite} | Restantes: ${restantes}`
                })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando solicitada:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao processar a missão solicitada.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
