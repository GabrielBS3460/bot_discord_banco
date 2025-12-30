require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const prisma = require('./database.js');

const express = require('express');

const commands = [
    {
        name: '!help',
        description: 'Mostra esta mensagem de ajuda.',
        syntax: '!help'
    },
    {
        name: '!cadastrar',
        description: 'Cria um novo personagem (limite de 2 por jogador).',
        syntax: '!cadastrar <nome_do_personagem>'
    },
    {
        name: '!personagem',
        description: 'Gerencia seus personagens. Subcomandos: listar, trocar, apagar.',
        syntax: '!personagem <listar | trocar | apagar> [nome]'
    },
    {
        name: '!saldo',
        description: 'Verifica o saldo do seu personagem ativo.',
        syntax: '!saldo'
    },
    {
        name: '!extrato',
        description: 'Mostra as últimas transações do personagem ativo.',
        syntax: '!extrato'
    },
    {
        name: '!gasto',
        description: 'Registra um gasto pessoal do personagem ativo.',
        syntax: '!gasto <valor> <motivo>'
    },
    {
        name: '!recompensa',
        description: 'Resgata a recompensa diária/semanal de missão.',
        syntax: '!recompensa <ND 1-20> <link da missão jogada/narrada>'
    },
    {
        name: '!venda',
        description: 'Vende um item para outro jogador.',
        syntax: '!venda <@comprador> <valor> <item> <link>' 
    },
    {
        name: '!missa',
        description: 'Clérigo vende serviço de Missa (divide custo entre fiéis).',
        syntax: '!missa <valor_total> <@player1> <@player2> ...'
    },
    {
        name: '!solicitada',
        description: '(Mestre) Registra missão solicitada e paga a recompensa.', 
        syntax: '!solicitada <ND> <custo_por_player> <@player1> ...'
    },
    {
        name: '!adestramento',
        description: '(Mestre) Registra adestramento/captura de criatura.',
        syntax: '!adestramento <ND> <@Player> Nome da Criatura'
    },
    {
        name: '!tix',
        description: 'Transfere T$ do seu personagem para outro jogador.',
        syntax: '!tix <@usuário> <valor>'
    }
];

async function getPersonagemAtivo(discordId) {
    const usuario = await prisma.usuarios.findUnique({
        where: { discord_id: discordId },
        include: { personagemAtivo: true } 
    });

    return usuario?.personagemAtivo; 
}

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
    
    const personagensDoMestre = await prisma.personagens.findMany({
        where: { usuario_id: mestre.discord_id },
        select: { id: true }
    });
    
    const idsDosPersonagens = personagensDoMestre.map(p => p.id);

    const missoesMestradas = await prisma.transacao.count({
        where: {
            personagem_id: { in: idsDosPersonagens },
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
        const nomePersonagem = args.join(' ');
        if (!nomePersonagem) {
            return message.reply("Uso incorreto! Digite `!cadastrar <nome do seu personagem>`.");
        }

        try {
            await prisma.usuarios.upsert({
                where: { discord_id: message.author.id },
                update: {},
                create: { discord_id: message.author.id }
            });

            const contagem = await prisma.personagens.count({
                where: { usuario_id: message.author.id }
            });

            if (contagem >= 2) {
                return message.reply("🚫 Você já atingiu o limite de 2 personagens!");
            }

            const novoPersonagem = await prisma.personagens.create({
                data: {
                    nome: nomePersonagem,
                    usuario_id: message.author.id,
                    saldo: 0 
                }
            });

            if (contagem === 0) {
                await prisma.usuarios.update({
                    where: { discord_id: message.author.id },
                    data: { personagem_ativo_id: novoPersonagem.id }
                });
                await message.reply(`✅ Personagem **${novoPersonagem.nome}** criado e selecionado como ativo!`);
            } else {
                await message.reply(`✅ Personagem **${novoPersonagem.nome}** criado! Use \`!personagem trocar ${novoPersonagem.nome}\` para jogar com ele.`);
            }

        } catch (err) {
            if (err.code === 'P2002') {
                return message.reply("Já existe um personagem com este nome no servidor. Escolha outro.");
            }
            console.error("Erro ao cadastrar:", err);
            await message.reply("Ocorreu um erro ao criar o personagem.");
        }
    }

    else if (command === 'personagem') {
        const subcomando = args[0]?.toLowerCase();

        if (subcomando === 'listar') {
            const personagens = await prisma.personagens.findMany({
                where: { usuario_id: message.author.id }
            });

            if (personagens.length === 0) return message.reply("Você não tem personagens. Use `!cadastrar`.");

            const usuario = await prisma.usuarios.findUnique({ where: { discord_id: message.author.id } });

            const lista = personagens.map(p => {
                const ativo = p.id === usuario.personagem_ativo_id ? " (⭐ Ativo)" : "";
                return `• **${p.nome}**${ativo} - Saldo: ${formatarMoeda(p.saldo)}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('📜 Seus Personagens')
                .setDescription(lista);
            
            return message.reply({ embeds: [embed] });
        }

        else if (subcomando === 'trocar') {
            const nomeAlvo = args.slice(1).join(' ');
            if (!nomeAlvo) return message.reply("Use: `!personagem trocar <nome do personagem>`");

            const personagemAlvo = await prisma.personagens.findFirst({
                where: { 
                    nome: { equals: nomeAlvo, mode: 'insensitive' },
                    usuario_id: message.author.id
                }
            });

            if (!personagemAlvo) return message.reply("Você não possui um personagem com esse nome.");

            await prisma.usuarios.update({
                where: { discord_id: message.author.id },
                data: { personagem_ativo_id: personagemAlvo.id }
            });

            return message.reply(`🔄 Você agora está jogando como **${personagemAlvo.nome}**!`);
        }

        else if (subcomando === 'apagar') {
            const nomeAlvo = args.slice(1).join(' ');
            if (!nomeAlvo) return message.reply("Use: `!personagem apagar <nome do personagem>`");

            const personagemAlvo = await prisma.personagens.findFirst({
                where: { 
                    nome: { equals: nomeAlvo, mode: 'insensitive' },
                    usuario_id: message.author.id
                }
            });

            if (!personagemAlvo) return message.reply("Você não possui um personagem com esse nome.");

            const confirmacaoEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`⚠️ Confirmação de Exclusão`)
                .setDescription(`Você tem certeza que deseja apagar o personagem **${personagemAlvo.nome}**?`)
                .addFields({ 
                    name: 'Consequências', 
                    value: 'Todo o histórico, saldo e itens deste personagem serão apagados permanentemente. Esta ação **não pode ser desfeita**.'
                })
                .setFooter({ text: 'Esta confirmação expira em 30 segundos.' });

            const botoes = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('confirmar_apagar').setLabel('Sim, apagar').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancelar_apagar').setLabel('Não, cancelar').setStyle(ButtonStyle.Secondary)
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

                if (interaction.customId === 'confirmar_apagar') {
                    try {
                        const usuario = await prisma.usuarios.findUnique({ where: { discord_id: message.author.id } });
                        
                        if (usuario.personagem_ativo_id === personagemAlvo.id) {
                            await prisma.usuarios.update({
                                where: { discord_id: message.author.id },
                                data: { personagem_ativo_id: null }
                            });
                        }

                        await prisma.$transaction([
                            prisma.transacao.deleteMany({ where: { personagem_id: personagemAlvo.id } }),
                            prisma.personagens.delete({ where: { id: personagemAlvo.id } })
                        ]);

                        const sucessoEmbed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle('🗑️ Personagem Apagado')
                            .setDescription(`O personagem **${personagemAlvo.nome}** foi removido com sucesso. O slot foi liberado.`);
                        
                        await interaction.editReply({ embeds: [sucessoEmbed], components: [] });

                    } catch (err) {
                        console.error("Erro ao apagar personagem:", err);
                        await interaction.editReply({ content: "Ocorreu um erro ao apagar o personagem.", embeds: [], components: [] });
                    }
                } 
                else if (interaction.customId === 'cancelar_apagar') {
                    await interaction.editReply({ content: 'Ação cancelada.', embeds: [], components: [] });
                }
                
                collector.stop();
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    mensagemConfirmacao.edit({ content: 'Confirmação expirada.', embeds: [], components: [] }).catch(() => {});
                }
            });
        }

        else {
            return message.reply("Comandos disponíveis: `!personagem listar`, `!personagem trocar <nome>`, `!personagem apagar <nome>`");
        }
    }

    else if (command === 'saldo') {
        try {
            const personagem = await getPersonagemAtivo(message.author.id);

            if (!personagem) {
                return message.reply("Você não tem um personagem ativo. Use `!cadastrar` ou `!personagem trocar`.");
            }

            await message.reply(`💰 O saldo de **${personagem.nome}** é: **${formatarMoeda(personagem.saldo)}**`);

        } catch (err) {
            console.error("Erro no saldo:", err);
            message.reply("Erro ao buscar saldo.");
        }
    }

    else if (command === 'venda') {
        const vendedorUser = message.author;
        
        const compradorMencionado = message.mentions.users.first();
        if (!compradorMencionado || compradorMencionado.bot) {
            return message.reply("Mencione um comprador válido. Ex: `!venda @Player 100 Item Link`");
        }
        if (compradorMencionado.id === vendedorUser.id) return message.reply("Não pode vender para si mesmo.");

        const link = args.find(arg => arg.startsWith('http://') || arg.startsWith('https://'));
        const valorStr = args.find(arg => !isNaN(parseFloat(arg)) && !arg.includes('<@') && !arg.startsWith('http'));
        const valor = parseFloat(valorStr);

        if (isNaN(valor) || valor <= 0) return message.reply("Valor inválido. Informe um preço positivo.");
        if (!link) return message.reply("Você precisa fornecer um link (http/https) para o item.");

        const itemParts = args.filter(arg => 
            arg.toLowerCase() !== command &&
            !arg.includes(compradorMencionado.id) &&
            arg !== link &&
            arg !== valorStr
        );
        const item = itemParts.join(' ');

        if (!item) return message.reply("Você precisa escrever o nome do item.");

        try {
            const [charVendedor, charComprador] = await Promise.all([
                getPersonagemAtivo(vendedorUser.id),
                getPersonagemAtivo(compradorMencionado.id)
            ]);

            if (!charVendedor) return message.reply("Você (vendedor) não tem personagem ativo.");
            if (!charComprador) return message.reply(`O comprador ${compradorMencionado.username} não tem personagem ativo.`);
            
            if (charComprador.saldo < valor) {
                return message.reply(`**${charComprador.nome}** não tem saldo suficiente (Saldo: ${formatarMoeda(charComprador.saldo)}).`);
            }

            const propostaEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('❓ Proposta de Venda')
                .setDescription(`**${charVendedor.nome}** quer vender **[${item}](${link})** para **${charComprador.nome}**.`)
                .addFields(
                    { name: 'Valor', value: formatarMoeda(valor) },
                    { name: 'Comprador', value: `Aguardando confirmação de ${charComprador.nome}...` }
                )
                .setFooter({ text: 'Expira em 60 segundos.' });
            
            if (/\.(jpeg|jpg|gif|png|webp)$/i.test(link)) propostaEmbed.setThumbnail(link);

            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirmar_venda').setLabel('Comprar').setStyle(ButtonStyle.Success).setEmoji('✔️'),
                new ButtonBuilder().setCustomId('cancelar_venda').setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji('✖️')
            );

            const msg = await message.channel.send({ content: `${compradorMencionado}`, embeds: [propostaEmbed], components: [botoes] });

            const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === compradorMencionado.id, time: 3456789 });

            collector.on('collect', async interaction => {
                await interaction.deferUpdate(); 

                if (interaction.customId === 'confirmar_venda') {
                    try {
                        await prisma.$transaction([
                            prisma.personagens.update({ where: { id: charComprador.id }, data: { saldo: { decrement: valor } } }),
                            prisma.transacao.create({
                                data: { personagem_id: charComprador.id, descricao: `Comprou ${item} de ${charVendedor.nome}`, valor: valor, tipo: 'COMPRA' }
                            }),
                            prisma.personagens.update({ where: { id: charVendedor.id }, data: { saldo: { increment: valor } } }),
                            prisma.transacao.create({
                                data: { personagem_id: charVendedor.id, descricao: `Vendeu ${item} para ${charComprador.nome}`, valor: valor, tipo: 'VENDA' }
                            })
                        ]);

                        const sucesso = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Venda Concluída')
                            .setDescription(`**[${item}](${link})** foi transferido com sucesso!`)
                            .addFields(
                                { name: 'Vendedor', value: charVendedor.nome, inline: true },
                                { name: 'Comprador', value: charComprador.nome, inline: true },
                                { name: 'Valor', value: formatarMoeda(valor) }
                            );
                        if (/\.(jpeg|jpg|gif|png|webp)$/i.test(link)) sucesso.setThumbnail(link);

                        await msg.edit({ embeds: [sucesso], components: [] });
                    } catch (err) {
                        console.error("Erro na transação de venda:", err);
                        await msg.edit({ content: '❌ Ocorreu um erro ao processar a venda.', embeds: [], components: [] });
                    }
                    collector.stop('concluido');
                } 
                
                else if (interaction.customId === 'cancelar_venda') {
                    const canceladoEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('✖️ Venda Cancelada')
                        .setDescription(`A venda de **${item}** foi recusada pelo comprador.`);

                    await msg.edit({ embeds: [canceladoEmbed], components: [] });
                    collector.stop('cancelado');
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    const expiradoEmbed = new EmbedBuilder()
                        .setColor('#808080') 
                        .setTitle('⌛ Proposta Expirada')
                        .setDescription(`A oferta de venda de **${item}** expirou porque o comprador não respondeu a tempo.`);
                    
                    msg.edit({ embeds: [expiradoEmbed], components: [] }).catch(() => {});
                }
            });

        } catch (err) {
            console.error(err);
            message.reply("Erro ao processar venda.");
        }
    }

    else if (command === 'modificar-saldo') {

        const alvo = message.mentions.users.first();
        const valor = parseFloat(args[1]);
        const motivo = args.slice(2).join(' ') || 'Modificação administrativa';

        if (!alvo || isNaN(valor)) return message.reply("Sintaxe: `!modificar-saldo <@usuario> <valor> [motivo]`");

        try {
            const personagemAlvo = await getPersonagemAtivo(alvo.id);

            if (!personagemAlvo) {
                return message.reply(`O usuário ${alvo.username} não tem nenhum personagem ativo no momento.`);
            }

            const [updatedPersonagem, _] = await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: personagemAlvo.id },
                    data: { saldo: { increment: valor } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: personagemAlvo.id,
                        descricao: motivo,
                        valor: Math.abs(valor),
                        tipo: valor >= 0 ? 'RECOMPENSA' : 'GASTO'
                    }
                })
            ]);

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('💰 Saldo Modificado (Admin)')
                .addFields(
                    { name: 'Personagem Afetado', value: `${personagemAlvo.nome} (@${alvo.username})`, inline: true },
                    { name: 'Modificação', value: `${valor >= 0 ? '+' : ''} ${formatarMoeda(valor)}`, inline: true },
                    { name: 'Novo Saldo', value: `**${formatarMoeda(updatedPersonagem.saldo)}**` },
                    { name: 'Motivo', value: motivo }
                );
            
            await message.channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no !modificar-saldo:", err);
            await message.reply("Erro ao modificar saldo.");
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
        if (args.length < 2 || MencoesDosPlayers.size === 0) return message.reply("Use: `!solicitada <ND> <custo> <@player1> ...`");

        const dificuldade = parseInt(args[0]);
        const custoPorPlayer = parseFloat(args[1]);
        const playerIds = MencoesDosPlayers.map(u => u.id).filter(id => id !== message.author.id);

        if (isNaN(dificuldade) || isNaN(custoPorPlayer)) return message.reply("Valores inválidos.");
        
        let patamar = 0;
        if (dificuldade >= 1 && dificuldade <= 4) patamar = 1;
        else if (dificuldade >= 5 && dificuldade <= 10) patamar = 2;
        else if (dificuldade >= 11 && dificuldade <= 16) patamar = 3;
        else if (dificuldade >= 17 && dificuldade <= 20) patamar = 4;
        const recompensaNarrador = 100 * dificuldade * patamar;

        try {
            const dadosNarradorUser = await prisma.usuarios.findUnique({
                where: { discord_id: message.author.id },
                include: { personagemAtivo: true }
            });

            if (!dadosNarradorUser) return message.reply("Narrador não cadastrado!");
            if (!dadosNarradorUser.personagemAtivo) return message.reply("Narrador precisa selecionar um personagem ativo (`!personagem trocar`).");

            const checkMestre = await verificarLimiteMestre(dadosNarradorUser);
            if (checkMestre.limiteAtingido) {
                const msgLimite = checkMestre.limite === 0 
                    ? "🚫 Seu Nível de Narrador (1) não permite receber recompensas por missões."
                    : `🚫 Você já atingiu seu limite de **${checkMestre.limite} missões** mensais.`;
                return message.reply(msgLimite);
            }

            let personagensPagantes = [];
            
            for (const id of playerIds) {
                const charAtivo = await getPersonagemAtivo(id);
                const userDiscord = await client.users.fetch(id);

                if (!charAtivo) {
                    return message.reply(`❌ O jogador **${userDiscord.username}** não tem personagem ativo selecionado.`);
                }
                if (charAtivo.saldo < custoPorPlayer) {
                    return message.reply(`❌ **${charAtivo.nome}** (de ${userDiscord.username}) não tem saldo suficiente.`);
                }
                personagensPagantes.push(charAtivo);
            }

            const operacoes = [];

            operacoes.push(prisma.personagens.update({
                where: { id: dadosNarradorUser.personagemAtivo.id },
                data: { saldo: { increment: recompensaNarrador } }
            }));
            operacoes.push(prisma.transacao.create({
                data: {
                    personagem_id: dadosNarradorUser.personagemAtivo.id,
                    descricao: `Mestrou Solicitada ND ${dificuldade}`,
                    valor: recompensaNarrador,
                    tipo: 'RECOMPENSA',
                    categoria: 'MESTRAR_SOLICITADA'
                }
            }));

            for (const pagante of personagensPagantes) {
                operacoes.push(prisma.personagens.update({
                    where: { id: pagante.id },
                    data: { saldo: { decrement: custoPorPlayer } }
                }));
                operacoes.push(prisma.transacao.create({
                    data: {
                        personagem_id: pagante.id,
                        descricao: `Missão Solicitada (Mestre: ${dadosNarradorUser.personagemAtivo.nome})`,
                        valor: custoPorPlayer,
                        tipo: 'GASTO',
                        categoria: 'JOGAR_SOLICITADA'
                    }
                }));
            }

            await prisma.$transaction(operacoes);

            const novaContagemMestre = checkMestre.contagem + 1;
            const restantes = checkMestre.limite - novaContagemMestre;
            const playersEmbedStr = personagensPagantes.length > 0 ? personagensPagantes.map(p => `• ${p.nome}`).join('\n') : "Nenhum";

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✨ Missão Solicitada Concluída!')
                .addFields(
                    { name: 'Mestre', value: dadosNarradorUser.personagemAtivo.nome, inline: true },
                    { name: 'Lucro', value: formatarMoeda(recompensaNarrador), inline: true },
                    { name: 'Participantes', value: playersEmbedStr }
                )
                .setFooter({ text: `Limite de Mestre: ${novaContagemMestre}/${checkMestre.limite} | Restantes: ${restantes}` })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando !solicitada:", err);
            message.reply("Erro ao processar a missão.");
        }
    }

    else if (command === 'recompensa') {
        if (args.length < 2) return message.reply("Sintaxe incorreta! É obrigatório informar o link.\nUse: `!recompensa <ND 1-20> <Link do Relatório>`");

        const nd = parseInt(args[0]);
        const link = args[1];

        if (isNaN(nd) || nd < 1 || nd > 20) return message.reply("O ND deve ser entre 1 e 20.");
        
        if (!link.startsWith('http')) return message.reply("O link fornecido parece inválido. Certifique-se de que começa com `http://` ou `https://`.");

        try {
            const personagem = await getPersonagemAtivo(message.author.id);
            if (!personagem) return message.reply("Você precisa selecionar um personagem ativo primeiro!");

            let patamar = 0;
            if (nd >= 1 && nd <= 4) patamar = 1;
            else if (nd >= 5 && nd <= 10) patamar = 2;
            else if (nd >= 11 && nd <= 16) patamar = 3;
            else if (nd >= 17 && nd <= 20) patamar = 4;
            
            if (nd >= 9) {
                const botoesEscolha = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('recompensa_normal').setLabel('Ouro').setStyle(ButtonStyle.Success).setEmoji('💰'),
                    new ButtonBuilder().setCustomId('recompensa_manavitra').setLabel('Manavitra').setStyle(ButtonStyle.Secondary).setEmoji('🔮')
                );
                
                const msg = await message.reply({ 
                    content: `✨ Missão de ND ${nd}! Escolha sua recompensa para **${personagem.nome}**:\n🔗 Link registrado: <${link}>`, 
                    components: [botoesEscolha] 
                });

                const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

                collector.on('collect', async interaction => {
                    await interaction.deferUpdate();

                    if (interaction.customId === 'recompensa_normal') {
                        const valor = 100 * nd * patamar;
                        
                        await prisma.$transaction([
                            prisma.personagens.update({
                                where: { id: personagem.id },
                                data: { 
                                    saldo: { increment: valor }, 
                                    ultimo_resgate_recompensa: new Date() 
                                }
                            }),
                            prisma.transacao.create({
                                data: {
                                    personagem_id: personagem.id,
                                    descricao: `Recompensa Missão ND ${nd} (Link: ${link})`, 
                                    valor: valor,
                                    tipo: 'RECOMPENSA'
                                }
                            })
                        ]);

                        await interaction.editReply({ content: `💰 **${personagem.nome}** recebeu **${formatarMoeda(valor)}**!\n📝 Link vinculado ao resgate.`, components: [] });
                    } 
                    
                    else if (interaction.customId === 'recompensa_manavitra') {
                        if (personagem.ultimo_resgate_manavitra && isSameWeek(new Date(), new Date(personagem.ultimo_resgate_manavitra))) {
                            return interaction.editReply({ content: `🚫 **${personagem.nome}** já pegou Manavitra esta semana! Escolha Ouro ou tente semana que vem.`, components: [] });
                        }

                        await prisma.personagens.update({
                            where: { id: personagem.id },
                            data: { ultimo_resgate_manavitra: new Date(), ultimo_resgate_recompensa: new Date() }
                        });

                        await prisma.transacao.create({
                            data: {
                                personagem_id: personagem.id,
                                descricao: `Resgate Manavitra ND ${nd} (Link: ${link})`,
                                valor: 0,
                                tipo: 'RECOMPENSA'
                            }
                        });

                        await interaction.editReply({ content: `🔮 **${personagem.nome}** recebeu uma **Manavitra**!\n📝 Link vinculado ao resgate.`, components: [] });
                    }
                    collector.stop();
                });
                return;
            }

            const valor = 100 * nd * patamar;
            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: personagem.id },
                    data: { saldo: { increment: valor }, ultimo_resgate_recompensa: new Date() }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: personagem.id,
                        descricao: `Recompensa Missão ND ${nd} (Link: ${link})`,
                        valor: valor,
                        tipo: 'RECOMPENSA'
                    }
                })
            ]);

            await message.reply(`💰 **${personagem.nome}** recebeu **${formatarMoeda(valor)}**!\n📝 Link registrado com sucesso.`);

        } catch (err) {
            console.error(err);
            message.reply("Erro ao processar recompensa.");
        }
    }

    else if (command === 'gasto') {
        if (args.length < 2) return message.reply("Sintaxe incorreta! Use: `!gasto <valor> <motivo do gasto>`");

        const valorGasto = parseFloat(args[0]);
        const motivo = args.slice(1).join(' ');

        if (isNaN(valorGasto) || valorGasto <= 0) return message.reply("O valor do gasto deve ser um número positivo.");

        try {
            const personagem = await getPersonagemAtivo(message.author.id);
            if (!personagem) return message.reply("Você não tem um personagem ativo. Use `!cadastrar` ou `!personagem trocar`.");

            if (personagem.saldo < valorGasto) {
                return message.reply(`Você não tem saldo suficiente! Saldo de **${personagem.nome}**: **${formatarMoeda(personagem.saldo)}**.`);
            }

            const [updatedPersonagem, _] = await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: personagem.id },
                    data: { saldo: { decrement: valorGasto } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: personagem.id,
                        descricao: motivo,
                        valor: valorGasto,
                        tipo: 'GASTO'
                    }
                })
            ]);

            const gastoEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💸 Gasto Registrado')
                .addFields(
                    { name: 'Personagem', value: personagem.nome, inline: true },
                    { name: 'Valor', value: `- ${formatarMoeda(valorGasto)}`, inline: true },
                    { name: 'Novo Saldo', value: `**${formatarMoeda(updatedPersonagem.saldo)}**` },
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
        const Mencoes = message.mentions.users;
        
        const valorTotal = parseFloat(args[0]);
        const participantesIds = Mencoes.map(u => u.id).filter(id => id !== message.author.id);

        if (isNaN(valorTotal) || valorTotal <= 0 || participantesIds.length === 0) {
            return message.reply("Sintaxe incorreta! Use: `!missa <valor_total> <@player1> <@player2> ...`");
        }

        const custoIndividual = valorTotal / participantesIds.length;

        try {
            const charClerigo = await getPersonagemAtivo(message.author.id);
            if (!charClerigo) return message.reply("Você (Clérigo) não tem personagem ativo.");

            let charsPagantes = [];
            for (const id of participantesIds) {
                const char = await getPersonagemAtivo(id);
                if (!char) return message.reply(`O usuário <@${id}> não tem personagem ativo.`);
                if (char.saldo < custoIndividual) return message.reply(`**${char.nome}** não tem saldo suficiente para pagar a parte dele.`);
                charsPagantes.push(char);
            }

            const operacoes = [];
            
            operacoes.push(prisma.personagens.update({ where: { id: charClerigo.id }, data: { saldo: { increment: valorTotal } } }));
            operacoes.push(prisma.transacao.create({
                data: { personagem_id: charClerigo.id, descricao: `Realizou Missa`, valor: valorTotal, tipo: 'VENDA' }
            }));
            
            for (const fiel of charsPagantes) {
                operacoes.push(prisma.personagens.update({ where: { id: fiel.id }, data: { saldo: { decrement: custoIndividual } } }));
                operacoes.push(prisma.transacao.create({
                    data: { personagem_id: fiel.id, descricao: `Pagou Missa para ${charClerigo.nome}`, valor: custoIndividual, tipo: 'GASTO' }
                }));
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
            
            await message.channel.send({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            message.reply("Erro ao processar a missa.");
        }
    }

    else if (command === 'extrato') {
        try {
            const personagem = await getPersonagemAtivo(message.author.id);
            if (!personagem) return message.reply("Você não tem um personagem ativo. Use `!cadastrar` ou `!personagem trocar`.");

            const transacoes = await prisma.transacao.findMany({
                where: { personagem_id: personagem.id },
                orderBy: { data: 'desc' },
                take: 5
            });

            const extratoEmbed = new EmbedBuilder()
                .setColor('#1ABC9C')
                .setTitle(`Extrato de ${personagem.nome}`)
                .addFields({ name: 'Saldo Atual', value: `**${formatarMoeda(personagem.saldo)}**` });

            if (transacoes.length > 0) {
                const transacoesStr = transacoes.map(t => {
                    const sinal = (t.tipo === 'GASTO' || t.tipo === 'COMPRA') ? '-' : '+';
                    const dataFormatada = new Date(t.data).toLocaleDateString('pt-BR');
                    return `\`${dataFormatada}\` ${sinal} ${formatarMoeda(t.valor)} - *${t.descricao}*`;
                }).join('\n');
                extratoEmbed.addFields({ name: 'Últimas Transações', value: transacoesStr });
            } else {
                extratoEmbed.addFields({ name: 'Últimas Transações', value: 'Nenhuma transação registrada.' });
            }
            
            await message.reply({ embeds: [extratoEmbed] });

        } catch (err) {
            console.error("Erro no comando !extrato:", err);
            await message.reply("Ocorreu um erro ao tentar buscar seu extrato.");
        }
    }

    else if (command === 'adestramento') {
        const nd = parseInt(args[0]);
        const jogadorMencionado = message.mentions.users.first();
        
        const nomeCriatura = args.slice(2).join(' '); 

        if (isNaN(nd) || !jogadorMencionado || !nomeCriatura) {
            return message.reply("Sintaxe incorreta! Use: `!adestramento <ND> <@Player> Nome da Criatura`");
        }
        
        if (jogadorMencionado.id === message.author.id) return message.reply("Não pode mestrar para si mesmo.");

        const custoCaptura = 500;
        
        let patamar = 0;
        if (nd >= 1 && nd <= 4) patamar = 1;
        else if (nd >= 5 && nd <= 10) patamar = 2;
        else if (nd >= 11 && nd <= 16) patamar = 3;
        else if (nd >= 17 && nd <= 20) patamar = 4;
        const recompensaNarrador = 100 * nd * patamar;

        try {
            const dadosNarradorUser = await prisma.usuarios.findUnique({
                where: { discord_id: message.author.id },
                include: { personagemAtivo: true }
            });
            if (!dadosNarradorUser?.personagemAtivo) return message.reply("Narrador sem personagem ativo.");

            const checkMestre = await verificarLimiteMestre(dadosNarradorUser);
            if (checkMestre.limiteAtingido) {
                 const msgLimite = checkMestre.limite === 0 
                    ? "🚫 Seu Nível de Narrador (1) não permite receber recompensas."
                    : `🚫 Limite de **${checkMestre.limite} missões** atingido.`;
                return message.reply(msgLimite);
            }

            const charJogador = await getPersonagemAtivo(jogadorMencionado.id);
            if (!charJogador) return message.reply(`O usuário ${jogadorMencionado.username} não tem personagem ativo.`);
            if (charJogador.saldo < custoCaptura) return message.reply(`**${charJogador.nome}** não tem saldo suficiente (${formatarMoeda(charJogador.saldo)}).`);

            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: charJogador.id },
                    data: { saldo: { decrement: custoCaptura } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: charJogador.id,
                        descricao: `Adestramento: ${nomeCriatura}`,
                        valor: custoCaptura,
                        tipo: 'GASTO'
                    }
                }),
                prisma.personagens.update({
                    where: { id: dadosNarradorUser.personagemAtivo.id },
                    data: { saldo: { increment: recompensaNarrador } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: dadosNarradorUser.personagemAtivo.id,
                        descricao: `Mestrou Adestramento (${nomeCriatura})`,
                        valor: recompensaNarrador,
                        tipo: 'RECOMPENSA',
                        categoria: 'MESTRAR_CAPTURA'
                    }
                })
            ]);

            const novaContagemMestre = checkMestre.contagem + 1;
            const restantes = checkMestre.limite - novaContagemMestre;

            const embed = new EmbedBuilder()
                .setColor('#A52A2A')
                .setTitle('🐾 Adestramento Concluído!')
                .addFields(
                    { name: 'Mestre', value: `${dadosNarradorUser.personagemAtivo.nome} (+${formatarMoeda(recompensaNarrador)})` },
                    { name: 'Jogador', value: `${charJogador.nome} (-${formatarMoeda(custoCaptura)})` },
                    { name: 'Criatura', value: nomeCriatura }
                )
                .setFooter({ text: `Limite de Mestre: ${novaContagemMestre}/${checkMestre.limite} | Restantes: ${restantes}` })
                .setTimestamp();
            
            await message.channel.send({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            message.reply("Erro no adestramento.");
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

    else if (command === 'admin-criar') {
        const alvo = message.mentions.users.first();
        const nomePersonagem = args.filter(arg => !arg.startsWith('<@')).join(' ');

        if (!alvo || !nomePersonagem) {
            return message.reply("Sintaxe incorreta! Use: `!admin-criar <@jogador> <nome do personagem>`");
        }

        try {
            await prisma.usuarios.upsert({
                where: { discord_id: alvo.id },
                update: {},
                create: { discord_id: alvo.id }
            });

            const contagem = await prisma.personagens.count({
                where: { usuario_id: alvo.id }
            });

            if (contagem >= 2) {
                return message.reply(`⚠️ O usuário **${alvo.username}** já atingiu o limite de 2 personagens.`);
            }

            const novoPersonagem = await prisma.personagens.create({
                data: {
                    nome: nomePersonagem,
                    usuario_id: alvo.id,
                    saldo: 0
                }
            });

            let statusMsg = "Criado com sucesso.";
            if (contagem === 0) {
                await prisma.usuarios.update({
                    where: { discord_id: alvo.id },
                    data: { personagem_ativo_id: novoPersonagem.id }
                });
                statusMsg = "Criado e definido como **ATIVO** automaticamente.";
            }

            const embed = new EmbedBuilder()
                .setColor('#F1C40F') 
                .setTitle('👤 Personagem Criado (Via Admin)')
                .setDescription(`O administrador **${message.author.username}** criou um personagem para ${alvo}.`)
                .addFields(
                    { name: 'Nome do Personagem', value: novoPersonagem.nome, inline: true },
                    { name: 'Dono (Jogador)', value: alvo.username, inline: true },
                    { name: 'Status', value: statusMsg }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (err) {
            if (err.code === 'P2002') {
                return message.reply(`❌ O nome **"${nomePersonagem}"** já está em uso por outro jogador.`);
            }
            console.error("Erro no !admin-criar:", err);
            await message.reply("Ocorreu um erro ao tentar criar o personagem administrativamente.");
        }
    }

    else if (command === 'tix') {

        const destinatarioUser = message.mentions.users.first();
        if (!destinatarioUser || destinatarioUser.bot) {
            return message.reply("Você precisa mencionar para quem vai enviar os T$. Ex: `!tix @Amigo 500`");
        }
        
        if (destinatarioUser.id === message.author.id) {
            return message.reply("Você não pode transferir dinheiro para si mesmo.");
        }

        const valorStr = args.find(arg => !isNaN(parseFloat(arg)) && !arg.includes('<@'));
        const valor = parseFloat(valorStr);

        if (isNaN(valor) || valor <= 0) {
            return message.reply("Valor inválido. Digite um valor positivo maior que zero.");
        }

        try {
            const [charRemetente, charDestinatario] = await Promise.all([
                getPersonagemAtivo(message.author.id),
                getPersonagemAtivo(destinatarioUser.id)
            ]);

            if (!charRemetente) return message.reply("Você não tem um personagem ativo para enviar dinheiro.");
            if (!charDestinatario) return message.reply(`O usuário **${destinatarioUser.username}** não tem um personagem ativo para receber.`);

            if (charRemetente.saldo < valor) {
                return message.reply(`🚫 **${charRemetente.nome}** não tem saldo suficiente. Atual: **${formatarMoeda(charRemetente.saldo)}**.`);
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

            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando !tix:", err);
            await message.reply("Ocorreu um erro ao processar a transferência.");
        }
    }
});

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('O bot está online. O servidor de keep-alive está funcionando!');
});

app.listen(port, () => {
  console.log(`Servidor de keep-alive rodando em http://localhost:${port}`);
});

client.login(process.env.DISCORD_TOKEN);