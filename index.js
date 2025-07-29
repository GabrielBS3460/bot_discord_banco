const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { 
    getUsuario, 
    addUsuario, 
    realizarVenda, 
    modificarSaldo, 
    processarMissao, 
    registrarGasto, 
    processarMissa, 
    registrarCooldownManavitra, 
    registrarRecompensa, 
    processarColeta 
} = require('./database.js');

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
        name: '!saldo',
        description: 'Verifica o seu saldo atual em conta.',
        syntax: '!saldo'
    },
    {
        name: '!venda',
        description: 'Inicia uma proposta de venda para outro usuário.',
        syntax: '!venda <@usuário> $ <valor> $ <item>'
    },
    {
        name: '!solicitada',
        description: 'Registra a recompensa de missão solicitada para o mestre e os gastos para os players.',
        syntax: '!solicitada <nd do mestre 1-20> <custo por player> <ID player1> <ID player2> ...'
    },
    {
        name: '!recompensa',
        description: 'Registra a recompensa para missões de quadro',
        syntax: '!recompensa <nd do player 1-20>'
    },
    {
        name: '!gasto',
        description: 'Registra um gasto pessoal e debita o valor do seu saldo.',
        syntax: '!gasto <valor> <motivo do gasto>'
    },
    {
        name: '!missa',
        description: 'Um clérigo vende o serviço de Missa, dividindo o custo total entre os participantes.',
        syntax: '!missa <valor_total> <@player1> <@player2> ...'
    },
    {
        name: '!coleta',
        description: 'Registra uma missão de coleta, dando recompensa ao narrador e itens (não-monetários) aos jogadores. (Apenas Admins)',
        syntax: '!coleta <ND> $ <@Player1> $ <Item1> $ <@Player2> $ <Item2> ...'
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

    if (command === 'saldo') {
        try {
            const usuario = await getUsuario(message.author.id);
            if (usuario) {
                await message.reply(`Olá, ${usuario.personagem}! Seu saldo atual é de **${formatarMoeda(usuario.saldo)}**.`);
            } else {
                await message.reply("Você ainda não possui um personagem cadastrado. Use o comando `!cadastrar <nome_do_personagem>` para começar.");
            }
        } catch (err) {
            console.error("Erro ao consultar saldo:", err);
            await message.reply("Ocorreu um erro ao tentar consultar seu saldo.");
        }
    }

    else if (command === 'cadastrar') {
        if (args.length === 0) {
            return message.reply("Uso incorreto! Digite `!cadastrar <nome do seu personagem>`.");
        }

        const nomePersonagem = args.join(' ');

        try {
            const usuarioExistente = await getUsuario(message.author.id);

            if (usuarioExistente) {
                await message.reply(`Você já está cadastrado com o personagem **${usuarioExistente.personagem}**!`);
            } else {
                await addUsuario(message.author.id, nomePersonagem);
                await message.reply(`Parabéns! Seu personagem **${nomePersonagem}** foi criado com sucesso! Use \`!saldo\` para ver seu saldo inicial.`);
            }
        } catch (err) {
            console.error("Erro ao cadastrar usuário:", err);
            await message.reply("Ocorreu um erro ao tentar realizar o cadastro. Tente novamente mais tarde.");
        }
    }

    else if (command === 'venda') {
        const vendedor = message.author;

        const conteudoComando = args.join(' ');
        const parts = conteudoComando.split('$').map(p => p.trim());

        if (parts.length !== 4) {
            return message.reply("Sintaxe incorreta! Use: `!venda <@usuário> $ <valor> $ <item vendido> $ <link do item>`");
        }

        const compradorMencionado = message.mentions.users.first();
        const valor = parseFloat(parts[1]);
        const item = parts[2];
        const linkItem = parts[3];

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
        if (!linkItem) {
            return message.reply("Você precisa fornecer um link válido para o item!");
        }

        try {
            const dadosVendedor = await getUsuario(vendedor.id);
            const dadosComprador = await getUsuario(compradorMencionado.id);

            if (!dadosVendedor) return message.reply("Você não está cadastrado! Use `!cadastrar` primeiro.");
            if (!dadosComprador) return message.reply(`O usuário ${compradorMencionado.username} não está cadastrado.`);
            if (dadosComprador.saldo < valor) return message.reply(`O comprador não tem saldo suficiente! Saldo dele: **T$${dadosComprador.saldo.toFixed(2)}**`);
            
            const propostaEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('❓ Proposta de Venda')
                .setDescription(`${vendedor.username} está propondo vender **${item}** para ${compradorMencionado.username}.`)
                .addFields(
                    { name: 'Valor da Transação', value: `T$${valor.toFixed(2)}` },
                    { name: 'Comprador', value: `Aguardando confirmação de ${compradorMencionado.username}...` },
                    { name: 'Link do item', value: `${linkItem}`}
                )
                .setFooter({ text: 'Esta proposta expira em 60 segundos.'});

            const botoes = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirmar_venda')
                        .setLabel('Confirmar Compra')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✔️'),
                    new ButtonBuilder()
                        .setCustomId('cancelar_venda')
                        .setLabel('Cancelar')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('✖️')
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
                    await realizarVenda(vendedor.id, compradorMencionado.id, valor, item);
                    
                    const sucessoEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ Venda Realizada com Sucesso!')
                        .setDescription(`**${item}** foi vendido com sucesso!`)
                        .addFields(
                            { name: 'Vendedor', value: vendedor.username, inline: true },
                            { name: 'Comprador', value: compradorMencionado.username, inline: true },
                            { name: 'Valor', value: `T$${valor.toFixed(2)}` },
                            { name: 'Link do item', value: `${linkItem}`}
                        );
                    
                    await mensagemProposta.edit({ embeds: [sucessoEmbed], components: [] });
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
            return message.reply("Sintaxe incorreta! Use: `!modificar-saldo <@usuario> <valor>`");
        }

        try {
            const dadosAlvo = await getUsuario(alvo.id);
            if (!dadosAlvo) {
                return message.reply("Este usuário não está cadastrado!");
            }

            await modificarSaldo(alvo.id, valor, motivo);

            const novoSaldo = dadosAlvo.saldo + valor;

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('💰 Saldo Modificado')
                .setDescription(`O saldo de **${alvo.username}** foi modificado pelo administrador.`)
                .addFields(
                    { name: 'Usuário Afetado', value: alvo.username, inline: true },
                    { name: 'Modificação', value: `T$ ${valor.toFixed(2)}`, inline: true },
                    { name: 'Novo Saldo', value: `**T$ ${novoSaldo.toFixed(2)}**` },
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
        
        const playerIds = MencoesDosPlayers.map(user => user.id);

        if (isNaN(dificuldade) || dificuldade < 1 || dificuldade > 20) {
            return message.reply("A dificuldade deve ser um número entre 1 e 20.");
        }
        if (isNaN(custoPorPlayer) || custoPorPlayer < 0) {
            return message.reply("O custo por player deve ser um número positivo.");
        }

        let patamar = 0;
        if (dificuldade >= 1 && dificuldade <= 4) patamar = 1;
        else if (dificuldade >= 5 && dificuldade <= 10) patamar = 2;
        else if (dificuldade >= 11 && dificuldade <= 16) patamar = 3;
        else if (dificuldade >= 17 && dificuldade <= 20) patamar = 4;
        
        const recompensaNarrador = 100 * dificuldade * patamar;
        const narradorId = message.author.id;

        try {
            const narrador = await getUsuario(narradorId);
            if (!narrador) return message.reply("Você (narrador) não está cadastrado no bot!");

            let playersData = [];
            for (const id of playerIds) {
                if (id === narradorId) continue; 
                
                const player = await getUsuario(id);
                if (!player) {
                    return message.reply(`Erro: O usuário ${message.mentions.users.get(id).username} não foi encontrado ou não está cadastrado.`);
                }
                if (player.saldo < custoPorPlayer) {
                    return message.reply(`Erro: O jogador ${player.personagem} não tem saldo suficiente! (Saldo: T$${player.saldo.toFixed(2)})`);
                }
                playersData.push(player);
            }

            const idsFinaisParaCobrar = playersData.map(p => p.discord_id);
            if (idsFinaisParaCobrar.length === 0) {
                return message.reply("Nenhum jogador válido foi fornecido para a cobrança.");
            }

            await processarMissao(narradorId, recompensaNarrador, idsFinaisParaCobrar, custoPorPlayer);

            const playersAfetadosStr = playersData.map(p => `• ${p.personagem} (- R$${custoPorPlayer.toFixed(2)})`).join('\n');
            
            const sucessoEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✨ Missão Solicitada Concluída!')
                .setDescription('Os custos e recompensas da missão foram processados.')
                .addFields(
                    { name: 'Narrador', value: `${narrador.personagem}`, inline: true },
                    { name: 'Recompensa Recebida', value: `+ T$${recompensaNarrador.toFixed(2)}`, inline: true },
                    { name: 'Dificuldade (Patamar)', value: `${dificuldade} (${patamar})`, inline: true },
                    { name: 'Jogadores Participantes', value: playersAfetadosStr }
                )
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
            const jogador = await getUsuario(message.author.id);
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
                await registrarRecompensa(jogador.discord_id, recompensaFinal, `Recompensa de Missão Normal (ND ${nd})`);
                
                const recompensaEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏆 Recompensa Resgatada!')
                    .addFields(
                        { name: 'Valor Recebido', value: `**+ T$${recompensaFinal.toFixed(2)}**` },
                        { name: 'Novo Saldo', value: `T$${(jogador.saldo + recompensaFinal).toFixed(2)}` }
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
                        await registrarRecompensa(jogador.discord_id, recompensaFinal, `Recompensa de Missão Normal (ND ${nd})`);

                        const recompensaEmbed = new EmbedBuilder()
                            .setColor('#FFD700').setTitle('🏆 Recompensa em Dinheiro Resgatada!')
                            .addFields(
                                { name: 'Valor Recebido', value: `**+ T$${recompensaFinal.toFixed(2)}**` },
                                { name: 'Novo Saldo', value: `T$${(jogador.saldo + recompensaFinal).toFixed(2)}` }
                            );
                        await interaction.editReply({ embeds: [recompensaEmbed], components: [] });
                    } 
                    else if (interaction.customId === 'recompensa_manavitra') {
                        const jogadorAtualizado = await getUsuario(interaction.user.id);
                        const ultimoResgateManavitra = jogadorAtualizado.ultimo_resgate_manavitra;

                        if (ultimoResgateManavitra && isSameWeek(new Date(), new Date(ultimoResgateManavitra))) {
                            const erroEmbed = new EmbedBuilder()
                                .setColor('#FF0000').setTitle('🚫 Limite Atingido')
                                .setDescription('Você já resgatou uma Manavitra esta semana (Domingo a Sábado).');
                            await interaction.editReply({ embeds: [erroEmbed], components: [] });
                            return collector.stop();
                        }

                        await registrarCooldownManavitra(jogador.discord_id);
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
            const jogador = await getUsuario(message.author.id);
            if (!jogador) {
                return message.reply("Você não está cadastrado! Use `!cadastrar` primeiro.");
            }
            if (jogador.saldo < valorGasto) {
                return message.reply(`Você não tem saldo suficiente para este gasto! Seu saldo atual é de **${formatarMoeda(jogador.saldo)}**.`);
            }

            await registrarGasto(jogador.discord_id, valorGasto, motivo);

            const novoSaldo = jogador.saldo - valorGasto;

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
            const dadosClerigo = await getUsuario(clerigo.id);
            if (!dadosClerigo) return message.reply("Você (o clérigo) não está cadastrado! Use `!cadastrar`.");

            let dadosParticipantes = [];
            for (const id of participanteIds) {
                const participante = await getUsuario(id);
                if (!participante) {
                    return message.reply(`Erro: O usuário <@${id}> não está cadastrado.`);
                }
                if (participante.saldo < custoIndividual) {
                    return message.reply(`Erro: O jogador ${participante.personagem} não tem saldo suficiente para pagar a parte dele de **${formatarMoeda(custoIndividual)}**.`);
                }
                dadosParticipantes.push(participante);
            }

            await processarMissa(clerigo.id, valorTotal, participanteIds, custoIndividual);

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
            const dadosNarrador = await getUsuario(narradorId);
            if (!dadosNarrador) return message.reply("Você (narrador) não está cadastrado!");

            let dadosJogadores = [];
            for (const coleta of coletas) {
                const jogador = await getUsuario(coleta.jogadorId);
                if (!jogador) {
                    return message.reply(`Erro: O usuário <@${coleta.jogadorId}> não está cadastrado.`);
                }
                dadosJogadores.push({ ...jogador, itemColetado: coleta.item });
            }

            await processarColeta(narradorId, recompensaNarrador, coletas);

            const listaColetasStr = dadosJogadores.map(p => `• ${p.personagem} coletou: **${p.itemColetado}**`).join('\n');
            const sucessoEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🌿 Missão de Coleta Concluída!')
                .setDescription('As recompensas da missão foram distribuídas com sucesso.')
                .addFields(
                    { name: 'Recompensa do Narrador', value: `+ ${formatarMoeda(recompensaNarrador)} para ${dadosNarrador.personagem}` },
                    { name: 'Itens Coletados pelos Jogadores', value: listaColetasStr }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [sucessoEmbed] });

        } catch (err) {
            console.error("Erro no comando !coleta:", err);
            await message.reply("Ocorreu um erro crítico ao processar a coleta. A transação foi revertida para segurança.");
        }
    }

});

client.login('Token');