require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const prisma = require('./database.js');

const commands = [
    {
        name: '!help',
        description: 'Mostra esta mensagem de ajuda com todos os comandos.',
        syntax: '!help'
    },
    {
        name: '!cadastrar',
        description: 'Cria seu personagem no sistema do bot.',
        syntax: '!cadastrar <nome_do_personagem>'
    },
    {
        name: '!extrato',
        description: 'Mostra seu saldo atual e suas últimas 5 transações.',
        syntax: '!extrato'
    },
    {
        name: '!gasto',
        description: 'Registra um gasto pessoal e debita o valor do seu saldo.',
        syntax: '!gasto <valor> <motivo do gasto>'
    },
    {
        name: '!recompensa',
        description: 'Resgata a recompensa de uma missão. Oferece uma escolha especial para NDs altos.',
        syntax: '!recompensa <ND 1-20>'
    },
    {
        name: '!abandonar',
        description: 'Arquiva seu personagem atual, permitindo que você crie um novo.',
        syntax: '!abandonar'
    },
    {
        name: '!venda',
        description: 'Inicia uma proposta de venda para outro usuário.',
        syntax: '!venda <@usuário> $ <valor> $ <item> $ <link do item>' 
    },
    {
        name: '!missa',
        description: 'Um clérigo vende o serviço de Missa, dividindo o custo total entre os participantes.',
        syntax: '!missa <valor_total> <@player1> <@player2> ...'
    },
    {
        name: '!magia',
        description: 'Um conjurador vende uma magia, dividindo o custo total entre os participantes.',
        syntax: '!magia <custo_total> "<nome da magia>" <@player1> ...'
    },
    {
        name: '!solicitada',
        description: 'Registra a recompensa de missão solicitada para o mestre.', 
        syntax: '!solicitada <ND do mestre 1-20> <custo> <@player1> <@player2> ...'
    },
    {
        name: '!coleta',
        description: 'Registra uma missão de coleta, dando recompensa ao narrador e itens aos jogadores.',
        syntax: '!coleta <ND do mestre 1-20> $ <@Player1> $ <Item1> $ <@Player2> $ <Item2> ...'
    },
    {
        name: '!adestramento',
        description: 'Mestre registra a captura de uma criatura por um jogador.',
        syntax: '!adestramento <ND do mestre 1-20> <@Player> "<Nome da Criatura>"'
    }
];

function isSameWeek(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    const sundayD1 = new Date(d1.setDate(d1.getDate() - d1.getDay()));
    const sundayD2 = new Date(d2.setDate(d2.getDate() - d2.getDay()));

    return sundayD1.getFullYear() === sundayD2.getFullYear() &&
           sundayD1.getMonth() === sundayD2.getMonth() &&
           sundayD1.getDate() === sundayD2.getDate();
}

function formatarMoeda(valor) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', 'T$');
}

async function verificarLimiteMestre(mestre) {
    let limite = 0;
    switch (mestre.nivel_narrador) {
        case 1:
            limite = 0; 
            break;
        case 2:
            limite = 2;
            break;
        case 3:
            limite = 4;
            break;
        case 4:
            limite = 4;
            break;    
        default:
            if (mestre.nivel_narrador > 3) {
                limite = Math.pow(2, mestre.nivel_narrador - 1);
            }
            break;
    }

    if (limite === 0) {
        return { limiteAtingido: true, limite: 0, contagem: 0 };
    }

    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    
    const missoesMestradas = await prisma.transacao.count({
        where: {
            usuario_id: mestre.discord_id,
            data: { gte: inicioDoMes },
            categoria: { in: ['MESTRAR_SOLICITADA', 'MESTRAR_COLETA', 'MESTRAR_CAPTURA'] }
        }
    });

    return {
        limiteAtingido: missoesMestradas >= limite,
        limite: limite,
        contagem: missoesMestradas
    };
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`Logado como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'cadastrar') {
        if (args.length === 0) {
            return message.reply("Uso incorreto! Digite `!cadastrar <nome do seu personagem>`.");
        }

        const nomePersonagem = args.join(' ');

        try {
            const usuarioExistente = await prisma.usuarios.findUnique({
                where: {
                    discord_id: message.author.id,
                },
            });

            if (usuarioExistente) {
                await message.reply(`Você já está cadastrado com o personagem **${usuarioExistente.personagem}**!`);
            } else {
                const novoUsuario = await prisma.usuarios.create({
                    data: {
                        discord_id: message.author.id,
                        personagem: nomePersonagem,
                    }
                });
                await message.reply(`Parabéns! Seu personagem **${novoUsuario.personagem}** foi criado com sucesso! Use \`!extrato\` para ver seu saldo inicial.`);
            }
        } catch (err) {
            console.error("Erro ao cadastrar usuário:", err);
            await message.reply("Ocorreu um erro ao tentar realizar o cadastro. Tente novamente mais tarde.");
        }
    }

    else if (command === 'venda') {
    const vendedor = message.author;

    const contentWithoutCommand = message.content.slice(prefix.length + command.length).trim();
    const parts = contentWithoutCommand.split('$').map(p => p.trim());

    if (parts.length !== 4) {
        return message.reply("Sintaxe incorreta! Use: `!venda <@usuário> $ <valor> $ <item vendido> $ <link do item>`");
    }

    const compradorMencionado = message.mentions.users.first();
    const valor = parseFloat(parts[1]);
    const item = parts[2];
    const linkItemOriginal = parts[3];
    const linkItem = linkItemOriginal.replace(/[\u200B-\u200D\u2060]/g, '');
    
    if (!compradorMencionado || compradorMencionado.bot) {
        return message.reply("Você precisa mencionar um usuário válido que está comprando o item!");
    }
    if (compradorMencionado.id === vendedor.id) {
        return message.reply("Você não pode vender um item para si mesmo!");
    }
    if (isNaN(valor) || valor <= 0) {
        return message.reply("O valor da venda deve ser um número positivo!");
    }
    if (!item) {
        return message.reply("Você precisa especificar o item que está sendo vendido!");
    }
    if (!linkItem || !linkItem.startsWith('http')) {
        return message.reply("Você precisa fornecer um link válido (que comece com http ou https) para o item!");
    }

    try {
        const [dadosVendedor, dadosComprador] = await Promise.all([
            prisma.usuarios.findUnique({ where: { discord_id: vendedor.id } }),
            prisma.usuarios.findUnique({ where: { discord_id: compradorMencionado.id } })
        ]);

        if (!dadosVendedor) return message.reply("Você não está cadastrado! Use `!cadastrar` primeiro.");
        if (!dadosComprador) return message.reply(`O usuário ${compradorMencionado.username} não está cadastrado.`);
        if (dadosComprador.saldo < valor) return message.reply(`O comprador não tem saldo suficiente! Saldo dele: **${formatarMoeda(dadosComprador.saldo)}**`);
        
        const propostaEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('❓ Proposta de Venda')
            .setDescription(`${vendedor.username} está propondo vender **[${item}](${linkItem})** para ${compradorMencionado.username}.`)
            .addFields(
                { name: 'Valor da Transação', value: formatarMoeda(valor) },
                { name: 'Comprador', value: `Aguardando confirmação de ${compradorMencionado.username}...` }
            );

        if (/\.(jpeg|jpg|gif|png|webp)$/i.test(linkItem)) {
            propostaEmbed.setThumbnail(linkItem);
        }
            
        propostaEmbed.setFooter({ text: 'Esta proposta expira em 60 segundos.'});

        const botoes = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('confirmar_venda').setLabel('Confirmar Compra').setStyle(ButtonStyle.Success).setEmoji('✔️'),
                new ButtonBuilder().setCustomId('cancelar_venda').setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji('✖️')
            );

        const mensagemProposta = await message.channel.send({
            content: `${compradorMencionado}, você aceita esta proposta?`,
            embeds: [propostaEmbed],
            components: [botoes]
        });

        const filter = i => i.user.id === compradorMencionado.id;
        const collector = mensagemProposta.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async interaction => {
            await interaction.deferUpdate();

            if (interaction.customId === 'confirmar_venda') {
                
                await prisma.$transaction([
                    prisma.usuarios.update({
                        where: { discord_id: compradorMencionado.id },
                        data: { saldo: { decrement: valor } }
                    }),
                    prisma.usuarios.update({
                        where: { discord_id: vendedor.id },
                        data: { saldo: { increment: valor } }
                    }),
                    prisma.transacao.create({
                        data: {
                            usuario_id: compradorMencionado.id,
                            descricao: `Compra de ${item} de ${dadosVendedor.personagem}`,
                            valor: valor,
                            tipo: 'COMPRA'
                        }
                    }),
                    prisma.transacao.create({
                        data: {
                            usuario_id: vendedor.id,
                            descricao: `Venda de ${item} para ${dadosComprador.personagem}`,
                            valor: valor,
                            tipo: 'VENDA'
                        }
                    })
                ]);
                
                const sucessoEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Venda Realizada com Sucesso!')
                    .setDescription(`**[${item}](${linkItem})** foi vendido com sucesso!`)
                    .addFields(
                        { name: 'Vendedor', value: dadosVendedor.personagem, inline: true },
                        { name: 'Comprador', value: dadosComprador.personagem, inline: true },
                        { name: 'Valor', value: formatarMoeda(valor) }
                    );
                
                if (/\.(jpeg|jpg|gif|png|webp)$/i.test(linkItem)) {
                    sucessoEmbed.setThumbnail(linkItem);
                }

                const linkButtonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setLabel('Ver Item Comprado').setStyle(ButtonStyle.Link).setURL(linkItem)
                    );

                await mensagemProposta.edit({ embeds: [sucessoEmbed], components: [linkButtonRow] });
                collector.stop();
            } 
            else if (interaction.customId === 'cancelar_venda') {
                const canceladoEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('✖️ Venda Cancelada')
                    .setDescription(`A venda de **${item}** foi cancelada pelo comprador.`);
                
                await mensagemProposta.edit({ embeds: [canceladoEmbed], components: [] });
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const expiradoEmbed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('⌛ Proposta Expirada')
                    .setDescription(`A proposta de venda para **${item}** expirou pois não houve resposta.`);
                
                mensagemProposta.edit({ embeds: [expiradoEmbed], components: [] });
            }
        });

    } catch (err) {
        console.error("Erro no comando !venda:", err);
        await message.reply("Ocorreu um erro ao processar a venda.");
    }
    }

    else if (command === 'modificar-saldo') {

        const alvo = message.mentions.users.first();
        const valor = parseFloat(args[1]);
        const motivo = args.slice(2).join(' ') || 'Modificação administrativa';

        if (!alvo || isNaN(valor)) {
            return message.reply("Sintaxe incorreta! Use: `!modificar-saldo <@usuario> <valor> [motivo]`");
        }

        try {
            const dadosAlvo = await prisma.usuarios.findUnique({
                where: { discord_id: alvo.id }
            });

            if (!dadosAlvo) {
                return message.reply("Este usuário não está cadastrado!");
            }

            const [updatedAlvo, _] = await prisma.$transaction([
                prisma.usuarios.update({
                    where: { discord_id: alvo.id },
                    data: { saldo: { increment: valor } }
                }),
                prisma.transacao.create({
                    data: {
                        usuario_id: alvo.id,
                        descricao: motivo,
                        valor: Math.abs(valor),
                        tipo: valor >= 0 ? 'RECOMPENSA' : 'GASTO'
                    }
                })
            ]);

            const novoSaldo = updatedAlvo.saldo;

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('💰 Saldo Modificado')
                .setDescription(`O saldo de **${alvo.username}** foi modificado pelo administrador.`)
                .addFields(
                    { name: 'Usuário Afetado', value: alvo.username, inline: true },
                    { name: 'Modificação', value: `${valor >= 0 ? '+' : ''} ${formatarMoeda(valor)}`, inline: true },
                    { name: 'Novo Saldo', value: `**${formatarMoeda(novoSaldo)}**` },
                    { name: 'Motivo', value: motivo }
                )
                .setFooter({ text: `Ação realizada por: ${message.author.username}` })
                .setTimestamp();
            
            await message.channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando !modificar-saldo:", err);
            await message.reply("Ocorreu um erro ao tentar modificar o saldo.");
        }
    }

    else if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('❓ Lista de Comandos do Bot')
            .setDescription('Aqui estão todos os comandos disponíveis e como usá-los:');
        
        commands.forEach(cmd => {
            helpEmbed.addFields({
                name: `\`${cmd.name}\``,
                value: `${cmd.description}\n**Sintaxe:** \`${cmd.syntax}\``
            });
        });

        try {
            await message.channel.send({ embeds: [helpEmbed] });
        } catch (err) {
            console.error("Erro ao enviar mensagem de ajuda:", err);
        }
    }

    else if (command === 'solicitada') {
        const MencoesDosPlayers = message.mentions.users;

        if (args.length < 2 || MencoesDosPlayers.size === 0) {
            return message.reply("Sintaxe incorreta! Use: `!solicitada <dificuldade 1-20> <custo> <@player1> <@player2> ...`");
        }

        const dificuldade = parseInt(args[0]);
        const custoPorPlayer = parseFloat(args[1]);
        
        const playerIds = MencoesDosPlayers.map(user => user.id).filter(id => id !== message.author.id);

        if (isNaN(dificuldade) || dificuldade < 1 || dificuldade > 20) {
            return message.reply("A dificuldade deve ser um número entre 1 e 20.");
        }
        if (isNaN(custoPorPlayer) || custoPorPlayer < 0) {
            return message.reply("O custo por player deve ser um número positivo.");
        }
        if (playerIds.length === 0) {
            return message.reply("Nenhum jogador válido (que não seja você) foi fornecido para a cobrança.");
        }

        let patamar = 0;
        if (dificuldade >= 1 && dificuldade <= 4) patamar = 1;
        else if (dificuldade >= 5 && dificuldade <= 10) patamar = 2;
        else if (dificuldade >= 11 && dificuldade <= 16) patamar = 3;
        else if (dificuldade >= 17 && dificuldade <= 20) patamar = 4;
        
        const recompensaNarrador = 100 * dificuldade * patamar;
        const narradorId = message.author.id;

        try {
            const todosOsIds = [narradorId, ...playerIds];
            const todosOsUsuarios = await prisma.usuarios.findMany({
                where: { discord_id: { in: todosOsIds } }
            });

            const userMap = new Map(todosOsUsuarios.map(u => [u.discord_id, u]));
            
            const narrador = userMap.get(narradorId);
            if (!narrador) return message.reply("Você (narrador) não está cadastrado no bot!");

            const resultadoMestre = await verificarLimiteMestre(narrador); 
            if (resultadoMestre.limiteAtingido) {
                return message.reply(`Você já atingiu o seu limite de **${resultadoMestre.limite}** missões mestradas este mês (você já mestrou ${resultadoMestre.contagem}).`);
            }

            let playersData = [];
            for (const id of playerIds) {
                const player = userMap.get(id);
                if (!player) {
                    return message.reply(`Erro: O usuário <@${id}> não foi encontrado ou não está cadastrado.`);
                }
                if (player.saldo < custoPorPlayer) {
                    return message.reply(`Erro: O jogador ${player.personagem} não tem saldo suficiente! (Saldo: ${formatarMoeda(player.saldo)})`);
                }
                playersData.push(player);
            }

            let operacoes = [];
            operacoes.push(prisma.usuarios.update({
                where: { discord_id: narradorId },
                data: { saldo: { increment: recompensaNarrador } }
            }));
            operacoes.push(prisma.transacao.create({
                data: {
                    usuario_id: narradorId,
                    descricao: `Recompensa por Narrar Missão Solicitada (ND ${dificuldade})`,
                    valor: recompensaNarrador,
                    tipo: 'RECOMPENSA',
                    categoria: 'MESTRAR_SOLICITADA'
                }
            }));

            for (const player of playersData) {
                operacoes.push(prisma.usuarios.update({
                    where: { discord_id: player.discord_id },
                    data: { saldo: { decrement: custoPorPlayer } }
                }));
                operacoes.push(prisma.transacao.create({
                    data: {
                        usuario_id: player.discord_id,
                        descricao: `Custo de Missão Solicitada (Narrador: ${narrador.personagem})`,
                        valor: custoPorPlayer,
                        tipo: 'GASTO',
                        categoria: 'JOGAR_SOLICITADA'
                    }
                }));
            }

            await prisma.$transaction(operacoes);

            const playersAfetadosStr = playersData.map(p => `• ${p.personagem} (- ${formatarMoeda(custoPorPlayer)})`).join('\n');
            const novaContagem = resultadoMestre.contagem + 1;
            const missoesRestantes = resultadoMestre.limite - novaContagem;
            const footerText = `Missões do Mestre este mês: ${novaContagem}/${resultadoMestre.limite} | Restantes: ${missoesRestantes}`;

            
            const sucessoEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✨ Missão Solicitada Concluída!')
                .setDescription('Os custos e recompensas da missão foram processados.')
                .addFields(
                    { name: 'Narrador', value: `${narrador.personagem}`, inline: true },
                    { name: 'Recompensa Recebida', value: `+ ${formatarMoeda(recompensaNarrador)}`, inline: true },
                    { name: 'ND Mestre (Patamar)', value: `${dificuldade} (${patamar})`, inline: true },
                    { name: 'Jogadores Participantes', value: playersAfetadosStr }
                )
                .setFooter({ text: footerText })
                .setTimestamp();
            
            await message.channel.send({ embeds: [sucessoEmbed] });

        } catch (err) {
            console.error("Erro no comando !solicitada:", err);
            await message.reply("Ocorreu um erro crítico ao processar a missão. A transação foi revertida para segurança de todos.");
        }
    }

    else if (command === 'recompensa') {
        if (args.length !== 1) {
            return message.reply("Sintaxe incorreta! Use: `!recompensa <ND 1-20>`");
        }

        const nd = parseInt(args[0]);

        if (isNaN(nd) || nd < 1 || nd > 20) {
            return message.reply("O ND (Nível de Desafio) deve ser um número entre 1 e 20.");
        }

        try {
            const jogador = await prisma.usuarios.findUnique({
                where: { discord_id: message.author.id }
            });

            if (!jogador) {
                return message.reply("Você não está cadastrado! Use `!cadastrar` primeiro.");
            }

            if (jogador.ultimo_resgate_recompensa) {
                const ultimoResgate = new Date(jogador.ultimo_resgate_recompensa);
                const agora = new Date();
                const diffHoras = (agora - ultimoResgate) / (1000 * 60 * 60);

                if (diffHoras < 24) {
                    const tempoRestante = 24 - diffHoras;
                    const horas = Math.floor(tempoRestante);
                    const minutos = Math.floor((tempoRestante - horas) * 60);
                    return message.reply(`Você já resgatou sua recompensa. Por favor, aguarde aproximadamente **${horas}h e ${minutos}m** para resgatar novamente.`);
                }
            }

            if (nd < 9) {
                const patamar = (nd >= 1 && nd <= 4) ? 1 : 2;
                const recompensaFinal = 100 * nd * patamar;
                
                const [updatedJogador, _] = await prisma.$transaction([
                    prisma.usuarios.update({
                        where: { discord_id: jogador.discord_id },
                        data: {
                            saldo: { increment: recompensaFinal },
                            ultimo_resgate_recompensa: new Date()
                        }
                    }),
                    prisma.transacao.create({
                        data: {
                            usuario_id: jogador.discord_id,
                            descricao: `Recompensa de Missão Normal (ND ${nd})`,
                            valor: recompensaFinal,
                            tipo: 'RECOMPENSA'
                        }
                    })
                ]);
                
                const recompensaEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏆 Recompensa Resgatada!')
                    .addFields(
                        { name: 'Valor Recebido', value: `**+ ${formatarMoeda(recompensaFinal)}**` },
                        { name: 'Novo Saldo', value: formatarMoeda(updatedJogador.saldo) }
                    );
                return message.reply({ embeds: [recompensaEmbed] });
            } 
            else {
                const escolhaEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('✨ Recompensa Especial Disponível!')
                    .setDescription(`Sua missão de ND ${nd} permite uma escolha. O que você deseja receber?`);

                const botoesEscolha = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('recompensa_normal').setLabel('Recompensa Normal').setStyle(ButtonStyle.Success).setEmoji('💰'),
                        new ButtonBuilder().setCustomId('recompensa_manavitra').setLabel('Manavitra').setStyle(ButtonStyle.Secondary).setEmoji('🔮')
                    );
                
                const mensagemEscolha = await message.reply({
                    embeds: [escolhaEmbed],
                    components: [botoesEscolha],
                    fetchReply: true
                });

                const filter = i => i.user.id === message.author.id;
                const collector = mensagemEscolha.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async interaction => {
                    await interaction.deferUpdate();

                    if (interaction.customId === 'recompensa_normal') {
                        let patamar = 0;
                        if (nd >= 9 && nd <= 10) patamar = 2;
                        else if (nd >= 11 && nd <= 16) patamar = 3;
                        else if (nd >= 17 && nd <= 20) patamar = 4;
                        
                        const recompensaFinal = 100 * nd * patamar;

                        const [updatedJogador, __] = await prisma.$transaction([
                            prisma.usuarios.update({
                                where: { discord_id: jogador.discord_id },
                                data: {
                                    saldo: { increment: recompensaFinal },
                                    ultimo_resgate_recompensa: new Date()
                                }
                            }),
                            prisma.transacao.create({
                                data: {
                                    usuario_id: jogador.discord_id,
                                    descricao: `Recompensa de Missão Normal (ND ${nd})`,
                                    valor: recompensaFinal,
                                    tipo: 'RECOMPENSA'
                                }
                            })
                        ]);

                        const recompensaEmbed = new EmbedBuilder()
                            .setColor('#FFD700').setTitle('🏆 Recompensa em Dinheiro Resgatada!')
                            .addFields(
                                { name: 'Valor Recebido', value: `**+ ${formatarMoeda(recompensaFinal)}**` },
                                { name: 'Novo Saldo', value: formatarMoeda(updatedJogador.saldo) }
                            );
                        await interaction.editReply({ embeds: [recompensaEmbed], components: [] });
                    } 
                    else if (interaction.customId === 'recompensa_manavitra') {
                        if (jogador.ultimo_resgate_manavitra && isSameWeek(new Date(), new Date(jogador.ultimo_resgate_manavitra))) {
                            const erroEmbed = new EmbedBuilder()
                                .setColor('#FF0000').setTitle('🚫 Limite Atingido')
                                .setDescription('Você já resgatou uma Manavitra esta semana (Domingo a Sábado).');
                            await interaction.editReply({ embeds: [erroEmbed], components: [] });
                            return collector.stop();
                        }

                        await prisma.usuarios.update({
                            where: { discord_id: jogador.discord_id },
                            data: {
                                ultimo_resgate_manavitra: new Date(),
                                ultimo_resgate_recompensa: new Date()
                            }
                        });

                        const manavitraEmbed = new EmbedBuilder()
                            .setColor('#8A2BE2').setTitle('🔮 Uma Escolha Sábia!')
                            .setDescription(`${jogador.personagem} abdica das riquezas e recebe uma **Manavitra**!`);
                        await interaction.editReply({ embeds: [manavitraEmbed], components: [] });
                    }
                    collector.stop();
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        mensagemEscolha.edit({ content: 'Sua escolha expirou.', embeds: [], components: [] });
                    }
                });
            }
        } catch (err) {
            console.error("Erro no comando !recompensa:", err);
            await message.reply("Ocorreu um erro ao processar sua recompensa.");
        }
    }

    else if (command === 'gasto') {
        if (args.length < 2) {
            return message.reply("Sintaxe incorreta! Use: `!gasto <valor> <motivo do gasto>`");
        }

        const valorGasto = parseFloat(args[0]);
        const motivo = args.slice(1).join(' ');

        if (isNaN(valorGasto) || valorGasto <= 0) {
            return message.reply("O valor do gasto deve ser um número positivo.");
        }

        try {
            const jogador = await prisma.usuarios.findUnique({
                where: { discord_id: message.author.id }
            });

            if (!jogador) {
                return message.reply("Você não está cadastrado! Use `!cadastrar` primeiro.");
            }
            if (jogador.saldo < valorGasto) {
                return message.reply(`Você não tem saldo suficiente para este gasto! Seu saldo atual é de **${formatarMoeda(jogador.saldo)}**.`);
            }

            const [updatedJogador, _] = await prisma.$transaction([
                prisma.usuarios.update({
                    where: { discord_id: jogador.discord_id },
                    data: { saldo: { decrement: valorGasto } }
                }),
                prisma.transacao.create({
                    data: {
                        usuario_id: jogador.discord_id,
                        descricao: motivo,
                        valor: valorGasto,
                        tipo: 'GASTO'
                    }
                })
            ]);

            const novoSaldo = updatedJogador.saldo;

            const gastoEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💸 Gasto Registrado com Sucesso')
                .setAuthor({ name: jogador.personagem, iconURL: message.author.displayAvatarURL() })
                .addFields(
                    { name: 'Valor Gasto', value: `- ${formatarMoeda(valorGasto)}`, inline: true },
                    { name: 'Novo Saldo', value: `**${formatarMoeda(novoSaldo)}**`, inline: true },
                    { name: 'Motivo', value: motivo }
                )
                .setTimestamp();
            
            await message.reply({ embeds: [gastoEmbed] });

        } catch (err) {
            console.error("Erro no comando !gasto:", err);
            await message.reply("Ocorreu um erro ao tentar registrar seu gasto.");
        }
    }

    else if (command === 'missa') {
        const clerigo = message.author;
        const Mencoes = message.mentions.users;

        if (args.length < 2 || Mencoes.size === 0) {
            return message.reply("Sintaxe incorreta! Use: `!missa <valor_total> <@player1> <@player2> ...`");
        }

        const valorTotal = parseFloat(args[0]);
        const participantesMencionados = Mencoes.filter(user => user.id !== clerigo.id);
        const participanteIds = participantesMencionados.map(user => user.id);

        if (isNaN(valorTotal) || valorTotal <= 0) {
            return message.reply("O valor total deve ser um número positivo.");
        }
        if (participanteIds.length === 0) {
            return message.reply("Você precisa mencionar pelo menos um jogador para pagar pela missa.");
        }

        const custoIndividual = valorTotal / participanteIds.length;

        try {
            const todosOsIds = [clerigo.id, ...participanteIds];
            const todosOsUsuarios = await prisma.usuarios.findMany({
                where: { discord_id: { in: todosOsIds } }
            });

            const userMap = new Map(todosOsUsuarios.map(u => [u.discord_id, u]));

            const dadosClerigo = userMap.get(clerigo.id);
            if (!dadosClerigo) return message.reply("Você (o clérigo) não está cadastrado! Use `!cadastrar`.");

            let dadosParticipantes = [];
            for (const id of participanteIds) {
                const participante = userMap.get(id);
                if (!participante) {
                    return message.reply(`Erro: O usuário <@${id}> não está cadastrado.`);
                }
                if (participante.saldo < custoIndividual) {
                    return message.reply(`Erro: O jogador ${participante.personagem} não tem saldo suficiente para pagar a parte dele de **${formatarMoeda(custoIndividual)}**.`);
                }
                dadosParticipantes.push(participante);
            }

            const operacoes = [
                prisma.usuarios.update({
                    where: { discord_id: clerigo.id },
                    data: { saldo: { increment: valorTotal } }
                }),
                prisma.transacao.create({
                    data: {
                        usuario_id: clerigo.id,
                        descricao: `Venda de serviço de Missa para ${dadosParticipantes.length} jogadores`,
                        valor: valorTotal,
                        tipo: 'VENDA'
                    }
                })
            ];

            for (const participante of dadosParticipantes) {
                operacoes.push(prisma.usuarios.update({
                    where: { discord_id: participante.discord_id },
                    data: { saldo: { decrement: custoIndividual } }
                }));
                operacoes.push(prisma.transacao.create({
                    data: {
                        usuario_id: participante.discord_id,
                        descricao: `Custo de serviço de Missa com ${dadosClerigo.personagem}`,
                        valor: custoIndividual,
                        tipo: 'GASTO'
                    }
                }));
            }

            await prisma.$transaction(operacoes);

            const listaParticipantesStr = dadosParticipantes.map(p => `• ${p.personagem}`).join('\n');
            const sucessoEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🙏 Missa Realizada com Sucesso!')
                .setDescription(`O clérigo **${dadosClerigo.personagem}** realizou o serviço com sucesso.`)
                .addFields(
                    { name: 'Valor Total Recebido pelo Clérigo', value: `+ ${formatarMoeda(valorTotal)}` },
                    { name: 'Custo Individual', value: formatarMoeda(custoIndividual) },
                    { name: 'Participantes Abençoados', value: listaParticipantesStr }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [sucessoEmbed] });

        } catch (err) {
            console.error("Erro no comando !missa:", err);
            await message.reply("Ocorreu um erro crítico ao processar a missa. A transação foi revertida para segurança.");
        }
    }

    else if (command === 'coleta') {

        const conteudoComando = args.join(' ');
        const parts = conteudoComando.split('$').map(p => p.trim());

        if (parts.length < 3 || parts.length % 2 === 0) {
            return message.reply("Sintaxe incorreta! Use: `!coleta <ND> $ <@Player1> $ <Item 1> $ <@Player2> $ <Item 2> ...`");
        }

        const nd = parseInt(parts[0]);
        const argsColeta = parts.slice(1);

        if (isNaN(nd) || nd < 1 || nd > 20) {
            return message.reply("O ND (Nível de Desafio) deve ser um número entre 1 e 20.");
        }

        let coletas = [];
        for (let i = 0; i < argsColeta.length; i += 2) {
            const mencao = argsColeta[i];
            const item = argsColeta[i + 1];
            const jogadorId = mencao.replace(/[<@!>]/g, '');

            if (!/^\d+$/.test(jogadorId) || !item) {
                return message.reply(`Argumento inválido encontrado no par: \`${mencao}\` e \`${item}\`. Verifique a sintaxe.`);
            }
            coletas.push({ jogadorId, item });
        }

        const recompensaNarrador = nd * 2 * 100;
        const narradorId = message.author.id;

        try {
            const todosOsIds = [narradorId, ...coletas.map(c => c.jogadorId)];
            const todosOsUsuarios = await prisma.usuarios.findMany({
                where: { discord_id: { in: todosOsIds } }
            });

            const userMap = new Map(todosOsUsuarios.map(u => [u.discord_id, u]));
            
            const dadosNarrador = userMap.get(narradorId);
            if (!dadosNarrador) return message.reply("Você (narrador) não está cadastrado!");

            const resultadoMestre = await verificarLimiteMestre(dadosNarrador); 
            if (resultadoMestre.limiteAtingido) {
                return message.reply(`Você já atingiu o seu limite de **${resultadoMestre.limite}** missões mestradas este mês (você já mestrou ${resultadoMestre.contagem}).`);
            }

            let dadosJogadores = [];
            for (const coleta of coletas) {
                const jogador = userMap.get(coleta.jogadorId);
                if (!jogador) {
                    return message.reply(`Erro: O usuário <@${coleta.jogadorId}> não está cadastrado.`);
                }
                dadosJogadores.push({ ...jogador, itemColetado: coleta.item });
            }

            const operacoes = [
                prisma.usuarios.update({
                    where: { discord_id: narradorId },
                    data: { saldo: { increment: recompensaNarrador } }
                }),
                prisma.transacao.create({
                    data: {
                        usuario_id: narradorId,
                        descricao: `Recompensa por Narrar Missão de Coleta (ND ${nd})`,
                        valor: recompensaNarrador,
                        tipo: 'RECOMPENSA',
                        categoria: 'MESTRAR_COLETA'
                    }
                })
            ];

            for (const coleta of coletas) {
                operacoes.push(prisma.transacao.create({
                    data: {
                        usuario_id: coleta.jogadorId,
                        descricao: `Coleta de Missão: ${coleta.item}`,
                        valor: 0,
                        tipo: 'RECOMPENSA'
                    }
                }));
            }

            await prisma.$transaction(operacoes);

            const listaColetasStr = dadosJogadores.map(p => `• ${p.personagem} coletou: **${p.itemColetado}**`).join('\n');
            const novaContagem = resultadoMestre.contagem + 1;
            const missoesRestantes = resultadoMestre.limite - novaContagem;
            const footerText = `Missões do Mestre este mês: ${novaContagem}/${resultadoMestre.limite} | Restantes: ${missoesRestantes}`;

            const sucessoEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🌿 Missão de Coleta Concluída!')
                .setDescription('As recompensas da missão foram distribuídas com sucesso.')
                .addFields(
                    { name: 'Recompensa do Narrador', value: `+ ${formatarMoeda(recompensaNarrador)} para ${dadosNarrador.personagem}` },
                    { name: 'Itens Coletados pelos Jogadores', value: listaColetasStr }
                )
                .setFooter({ text: footerText })
                .setTimestamp();

            await message.channel.send({ embeds: [sucessoEmbed] });

        } catch (err) {
            console.error("Erro no comando !coleta:", err);
            await message.reply("Ocorreu um erro crítico ao processar a coleta. A transação foi revertida para segurança.");
        }
    }

    else if (command === 'abandonar') {
        try {
            const jogador = await prisma.usuarios.findUnique({
                where: { discord_id: message.author.id }
            });

            if (!jogador) {
                return message.reply("Você não possui um personagem para abandonar.");
            }

            const confirmacaoEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`⚠️ Confirmação de Abandono`)
                .setDescription(`Você tem certeza que deseja abandonar o personagem **${jogador.personagem}**?`)
                .addFields({ name: 'Consequências', value: 'Você perderá o acesso a este personagem e seu saldo. Esta ação não pode ser desfeita. Você ficará livre para criar um novo personagem.'})
                .setFooter({ text: 'Esta confirmação expira em 30 segundos.' });

            const botoes = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('confirmar_abandono').setLabel('Sim, abandonar').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancelar_abandono').setLabel('Não, cancelar').setStyle(ButtonStyle.Secondary)
                );
            
            const mensagemConfirmacao = await message.reply({
                embeds: [confirmacaoEmbed],
                components: [botoes],
                fetchReply: true
            });

            const filter = i => i.user.id === message.author.id;
            const collector = mensagemConfirmacao.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async interaction => {
                await interaction.deferUpdate();
                if (interaction.customId === 'confirmar_abandono') {
                    const idArquivado = `ARQUIVADO-${jogador.discord_id}-${Date.now()}`;

                    await prisma.usuarios.update({
                        where: { discord_id: jogador.discord_id },
                        data: { discord_id: idArquivado }
                    });

                    const sucessoEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('🏴 Personagem Abandonado')
                        .setDescription(`O personagem **${jogador.personagem}** foi arquivado com sucesso. Você agora está livre para usar o comando \`!cadastrar\` e iniciar uma nova jornada.`);
                    
                    await interaction.editReply({ embeds: [sucessoEmbed], components: [] });
                } else {
                    await interaction.editReply({ content: 'Ação cancelada.', embeds: [], components: [] });
                }
                collector.stop();
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    mensagemConfirmacao.edit({ content: 'Confirmação expirada.', embeds: [], components: [] });
                }
            });

        } catch (err) {
            console.error("Erro no comando !abandonar:", err);
            await message.reply("Ocorreu um erro ao tentar abandonar seu personagem.");
        }
    }

    else if (command === 'extrato') {
        try {
            const usuarioComTransacoes = await prisma.usuarios.findUnique({
                where: {
                    discord_id: message.author.id,
                },
                include: {
                    transacoes: {
                        orderBy: {
                            data: 'desc',
                        },
                        take: 10,
                    },
                },
            });

            if (!usuarioComTransacoes) {
                return message.reply("Você não está cadastrado! Use `!cadastrar` primeiro.");
            }

            const extratoEmbed = new EmbedBuilder()
                .setColor('#1ABC9C')
                .setTitle(`Extrato de ${usuarioComTransacoes.personagem}`)
                .addFields(
                    { name: 'Saldo Atual', value: `**${formatarMoeda(usuarioComTransacoes.saldo)}**` }
                );

            if (usuarioComTransacoes.transacoes.length > 0) {
                const transacoesStr = usuarioComTransacoes.transacoes.map(t => {
                    const sinal = (t.tipo === 'GASTO' || t.tipo === 'COMPRA') ? '-' : '+';
                    const dataFormatada = new Date(t.data).toLocaleDateString('pt-BR');
                    return `\`${dataFormatada}\` ${sinal} ${formatarMoeda(t.valor)} - *${t.descricao}*`;
                }).join('\n');

                extratoEmbed.addFields({ name: 'Transações Recentes', value: transacoesStr });
            } else {
                extratoEmbed.addFields({ name: 'Transações Recentes', value: 'Nenhuma transação registrada.' });
            }
            
            await message.reply({ embeds: [extratoEmbed] });

        } catch (err) {
            console.error("Erro no comando !extrato:", err);
            await message.reply("Ocorreu um erro ao tentar buscar seu extrato.");
        }
    }

    else if (command === 'magia') {
    const conjurador = message.author;

    const Mencoes = message.mentions.users;
    
    const nomeMagiaMatch = message.content.match(/"([^"]+)"/);

    if (args.length < 3 || Mencoes.size === 0 || !nomeMagiaMatch) {
        return message.reply("Sintaxe incorreta! Use: `!magia <custo_total> \"<nome da magia>\" <@player1> <@player2> ...`");
    }

    const valorTotal = parseFloat(args[0]);
    const nomeMagia = nomeMagiaMatch[1]; 
    const participantesMencionados = Mencoes.filter(user => user.id !== conjurador.id);
    const participanteIds = participantesMencionados.map(user => user.id);

    if (isNaN(valorTotal) || valorTotal <= 0) {
        return message.reply("O custo total deve ser um número positivo.");
    }
    if (participanteIds.length === 0) {
        return message.reply("Você precisa mencionar pelo menos um jogador para receber a magia.");
    }

    const custoIndividual = valorTotal / participanteIds.length;

    try {
        const todosOsIds = [conjurador.id, ...participanteIds];
        const todosOsUsuarios = await prisma.usuarios.findMany({
            where: { discord_id: { in: todosOsIds } }
        });

        const userMap = new Map(todosOsUsuarios.map(u => [u.discord_id, u]));

        const dadosConjurador = userMap.get(conjurador.id);
        if (!dadosConjurador) return message.reply("Você (o conjurador) não está cadastrado! Use `!cadastrar`.");

        let dadosParticipantes = [];
        for (const id of participanteIds) {
            const participante = userMap.get(id);
            if (!participante) {
                return message.reply(`Erro: O usuário <@${id}> não está cadastrado.`);
            }
            if (participante.saldo < custoIndividual) {
                return message.reply(`Erro: O jogador ${participante.personagem} não tem saldo suficiente para pagar a parte dele de **${formatarMoeda(custoIndividual)}**.`);
            }
            dadosParticipantes.push(participante);
        }

        const operacoes = [
            prisma.usuarios.update({
                where: { discord_id: conjurador.id },
                data: { saldo: { increment: valorTotal } }
            }),
            prisma.transacao.create({
                data: {
                    usuario_id: conjurador.id,
                    descricao: `Venda da magia "${nomeMagia}" para ${dadosParticipantes.length} jogadores`,
                    valor: valorTotal,
                    tipo: 'VENDA'
                }
            })
        ];

        for (const participante of dadosParticipantes) {
            operacoes.push(prisma.usuarios.update({
                where: { discord_id: participante.discord_id },
                data: { saldo: { decrement: custoIndividual } }
            }));
            operacoes.push(prisma.transacao.create({
                data: {
                    usuario_id: participante.discord_id,
                    descricao: `Custo da magia "${nomeMagia}" de ${dadosConjurador.personagem}`,
                    valor: custoIndividual,
                    tipo: 'GASTO'
                }
            }));
        }

        await prisma.$transaction(operacoes);

        const listaParticipantesStr = dadosParticipantes.map(p => `• ${p.personagem}`).join('\n');
        const sucessoEmbed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle('✨ Magia Conjurada com Sucesso!')
            .setDescription(`O conjurador **${dadosConjurador.personagem}** vendeu a magia **"${nomeMagia}"** com sucesso.`)
            .addFields(
                { name: 'Valor Total Recebido pelo Conjurador', value: `+ ${formatarMoeda(valorTotal)}` },
                { name: 'Custo Individual', value: formatarMoeda(custoIndividual) },
                { name: 'Alvos da Magia', value: listaParticipantesStr }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [sucessoEmbed] });

    } catch (err) {
        console.error("Erro no comando !magia:", err);
        await message.reply("Ocorreu um erro crítico ao processar a venda da magia. A transação foi revertida.");
    }
    }

    else if (command === 'adestramento') {

        const custoCaptura = 500; 
        const narrador = message.author;

        const nd = parseInt(args[0]);
        const jogadorMencionado = message.mentions.users.first();
        const nomeCriaturaMatch = message.content.match(/"([^"]+)"/);

        if (isNaN(nd) || nd < 1 || nd > 20 || !jogadorMencionado || !nomeCriaturaMatch) {
            return message.reply("Sintaxe incorreta! Use: `!adestramento <ND 1-20> <@Player> \"<Nome da Criatura>\"`");
        }
        
        const nomeCriatura = nomeCriaturaMatch[1];
        
        if (jogadorMencionado.id === narrador.id) {
            return message.reply("O mestre não pode capturar a criatura para si mesmo através deste comando.");
        }

        let patamar = 0;
        if (nd >= 1 && nd <= 4) patamar = 1;
        else if (nd >= 5 && nd <= 10) patamar = 2;
        else if (nd >= 11 && nd <= 16) patamar = 3;
        else if (nd >= 17 && nd <= 20) patamar = 4;
        
        const recompensaNarrador = 100 * nd * patamar;

        try {
            const [dadosNarrador, dadosJogador] = await Promise.all([
                prisma.usuarios.findUnique({ where: { discord_id: narrador.id } }),
                prisma.usuarios.findUnique({ where: { discord_id: jogadorMencionado.id } })
            ]);

            if (!dadosNarrador) return message.reply("Você (o mestre) não está cadastrado!");
            if (!dadosJogador) return message.reply(`O jogador mencionado, ${jogadorMencionado.username}, não está cadastrado.`);

            const resultadoMestre = await verificarLimiteMestre(dadosNarrador); 
            if (resultadoMestre.limiteAtingido) {
                return message.reply(`Você já atingiu o seu limite de **${resultadoMestre.limite}** missões mestradas este mês (você já mestrou ${resultadoMestre.contagem}).`);
            }

            if (dadosJogador.saldo < custoCaptura) {
                return message.reply(`O jogador ${dadosJogador.personagem} não tem os ${formatarMoeda(custoCaptura)} necessários para a captura.`);
            }

            await prisma.$transaction([
                prisma.usuarios.update({
                    where: { discord_id: jogadorMencionado.id },
                    data: { saldo: { decrement: custoCaptura } }
                }),
                prisma.transacao.create({
                    data: {
                        usuario_id: jogadorMencionado.id,
                        descricao: `Custo pela captura de: ${nomeCriatura}`,
                        valor: custoCaptura,
                        tipo: 'GASTO'
                    }
                }),
                prisma.usuarios.update({
                    where: { discord_id: narrador.id },
                    data: { saldo: { increment: recompensaNarrador } }
                }),
                prisma.transacao.create({
                    data: {
                        usuario_id: narrador.id,
                        descricao: `Recompensa por mestrar captura de ${nomeCriatura} (ND ${nd})`,
                        valor: recompensaNarrador,
                        tipo: 'RECOMPENSA',
                        categoria: 'MESTRAR_CAPTURA'
                    }
                })
            ]);

            const novaContagem = resultadoMestre.contagem + 1;
            const missoesRestantes = resultadoMestre.limite - novaContagem;
            const footerText = `Missões do Mestre este mês: ${novaContagem}/${resultadoMestre.limite} | Restantes: ${missoesRestantes}`;


            const sucessoEmbed = new EmbedBuilder()
                .setColor('#A52A2A')
                .setTitle('🐾 Missão de Adestramento Concluída!')
                .setDescription(`A captura de **${nomeCriatura}** foi registrada com sucesso!`)
                .addFields(
                    { name: 'Mestre da Missão', value: `${dadosNarrador.personagem} (+${formatarMoeda(recompensaNarrador)})` },
                    { name: 'Jogador Caçador', value: `${dadosJogador.personagem} (-${formatarMoeda(custoCaptura)})` }
                )
                .setFooter({ text: footerText })
                .setTimestamp();
            
            await message.channel.send({ embeds: [sucessoEmbed] });

        } catch (err) {
            console.error("Erro no comando !adestramento:", err);
            await message.reply("Ocorreu um erro ao registrar a captura. A transação foi revertida.");
        }
    }

    else if (command === 'setnivel') {
    const alvo = message.mentions.users.first();
    const nivel = parseInt(args[1]);

    if (!alvo || isNaN(nivel) || nivel <= 0) {
        return message.reply("Sintaxe incorreta! Use: `!setnivel <@usuario> <nível>`");
    }

    try {
        const updatedUser = await prisma.usuarios.update({
            where: { discord_id: alvo.id },
            data: { nivel_narrador: nivel }
        });

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('⭐ Nível de Narrador Atualizado!')
            .setDescription(`O nível de narrador de **${updatedUser.personagem}** foi definido para **Nível ${updatedUser.nivel_narrador}**.`);

        await message.channel.send({ embeds: [embed] });

    } catch (err) {
        if (err.code === 'P2025') {
            await message.reply(`Erro: O usuário ${alvo.username} não está cadastrado.`);
        } else {
            console.error("Erro no comando !setnivel:", err);
            await message.reply("Ocorreu um erro ao tentar definir o nível.");
        }
    }
}
});

client.login(process.env.DISCORD_TOKEN);