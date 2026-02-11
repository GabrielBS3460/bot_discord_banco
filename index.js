require('dotenv').config();

const { Client, 
        GatewayIntentBits, 
        EmbedBuilder, 
        ActionRowBuilder, 
        ButtonBuilder, 
        ButtonStyle, 
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle,
        StringSelectMenuBuilder, 
        StringSelectMenuOptionBuilder 
    } = require('discord.js');

const prisma = require('./database.js');

const PungaSystem = require('./punga_sistema.js');

const { gerarRecompensa } = require('./sistema_drop');

const express = require('express');

const ID_CARGO_ADMIN = "1463009702807081217"; 

const LISTA_CLASSES_1 = [
    "Arcanista", "Alquimista", "Atleta", "Bárbaro", "Bardo", "Burguês", 
    "Bucaneiro", "Caçador", "Cavaleiro", "Clérigo", "Duelista", "Druída", 
    "Ermitão", "Frade", "Guerreiro"
];

const LISTA_CLASSES_2 = [
    "Inovador", "Inventor", "Ladino", "Lutador", "Machado de Pedra", 
    "Magimarcialista", "Nobre", "Necromante", "Paladino", "Santo", 
    "Seteiro", "Treinador", "Usurpador", "Vassalo", "Ventanista"
];

const CUSTO_NIVEL = {
    3: 4, 4: 5,
    5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
    11: 10, 12: 10, 13: 10, 14: 10, 15: 10, 16: 10
};

const BICHOS_T20 = {
    "00": "Guardião de Folhas Médio", "01": "Garanhão de Namalkah", "02": "Campeão Batráquio", "03": "Ganchador", "04": "Cavalo de Guerra", 
    "05": "Elemental da Terra Médio", "06": "Igddryl", "07": "Bugbear", "08": "Corcel das Trevas", "09": "Carvarel", 
    "10": "Gigante Leão", "11": "Paraelemental do Magma Peq.", "12": "Mantor", "13": "Águia", "14": "Esqueleto-Enxame", 
    "15": "Paraelemental da Fumaça", "16": "Cão do Inferno", "17": "Rato", "18": "Múmia", "19": "Grifo", 
    "20": "Limo Cinzento", "21": "Urso-das-Cavernas Esq.", "22": "Oni", "23": "Cogumelo Anão Sentinela", "24": "Bogum", 
    "25": "Cobra-Rei", "26": "Lobo Fantasma", "27": "Fofo", "28": "Paraelemental do Gelo", "29": "Golfinho", 
    "30": "Fogarta", "31": "Wyvern Esqueleto", "32": "Mantíco", "33": "Skum", "34": "Lívido", 
    "35": "Canceronte", "36": "Guardião de Folhas Grande", "37": "Búfalo de Guerra", "38": "Camelo", "39": "Asa-Assassina", 
    "40": "Dragão Azul Filhote", "41": "Tigre-de-Hynnin", "42": "Kappa", "43": "Horror Blindado", "44": "Sargento da Guarda", 
    "45": "Gênio da Terra", "46": "Lâmia", "47": "Gárgula", "48": "Dragão Branco Filhote", "49": "Fera-Cactus", 
    "50": "Lagarto Perseguidor", "51": "Cobra, Jiboia", "52": "Cavalo-Marinho", "53": "Urso Marrom", "54": "Ber-Beram", 
    "55": "Bulette", "56": "Fada-Dragão", "57": "Ente", "58": "Kabuto", "59": "Sátiro", 
    "60": "Inumano", "61": "Dragão Verde Filhote", "62": "Malafex", "63": "Pterodáctilo", "64": "Cocatriz", 
    "65": "Glop", "66": "Vardak Abençoado", "67": "Baleote", "68": "Gorlogg", "69": "Deinonico", 
    "70": "Barghest", "71": "Elemental do Ar Pequeno", "72": "Hobgoblin", "73": "Kobold Chefe", "74": "Carcaju", 
    "75": "Quapocs", "76": "Elemental da Água Médio", "77": "Uktril", "78": "Grick", "79": "Hipossauro", 
    "80": "Espada-da-Floresta", "81": "Gárgula", "82": "Grifo Dourado", "83": "Gigante Búfalo", "84": "Duplo", 
    "85": "Kobold Herói", "86": "Tubarão-Touro", "87": "Rosa do Desespero", "88": "Elemental do Fogo Peq.", "89": "Diabrete", 
    "90": "Draquineo", "91": "Cipó Assassino", "92": "Apiapi Zangão", "93": "Basilisco", "94": "Deinonico", 
    "95": "Crias do Gordolembas", "96": "Cogumelo Anão Druida", "97": "Paraelemental do Magma", "98": "Armadilefante", "99": "Mastim das Sombras"
};

const CUSTO_FORJA = {
    "Alimento": 0.2,
    "Consumíveis": 1,
    "Itens Permanentes": 2,
    "Melhorias": 16,
    "Encantamentos/Mágicos": 64,
    "Poções/Pergaminhos (1-2)": 2,
    "Poções/Pergaminhos (3-5)": 6
};

const DB_CULINARIA = {
    INGREDIENTES: {
        "Açúcar das fadas": 50, "Ave": 4, "Avelã de Norba": 40, "Carne": 16, "Carne de caça": 32,
        "Cereal": 1, "Cogumelo": 5, "Especiarias": 100, "Farinha": 1, "Fruta": 3, "Gorad": 30,
        "Legume": 1, "Leite": 1, "Molho tamuraniano": 30, "Óleo": 3, "Ovo de monstro": 50,
        "Peixe": 7, "Porco": 8, "Queijo": 6, "Verdura": 1
    },
    RECEITAS: {
        "Assado de carnes": { ing: { "Carne": 1, "Carne de caça": 1, "Porco": 1 }, cd: 25, desc: "+2 Dano corpo a corpo" },
        "Balinhas": { ing: { "Açúcar das fadas": 1, "Fruta": 1 }, cd: 25, desc: "+2 Dano magias" },
        "Banquete dos heróis": { ing: { "Carne de caça": 1, "Ovo de monstro": 1, "Avelã de Norba": 1 }, cd: 30, desc: "+1 Atributo" },
        "Batata valkariana": { ing: { "Óleo": 1, "Legume": 1 }, cd: 15, desc: "+1d6 em um teste" },
        "Bolo de cenoura": { ing: { "Farinha": 1, "Fruta": 1, "Óleo": 1 }, cd: 20, desc: "+2 Percepção" },
        "Bolo do Panteão": { ing: { "Açúcar das fadas": 1, "Avelã de Norba": 1, "Farinha": 1, "Gorad": 1 }, cd: 30, desc: "-1 Custo PM" },
        "Ensopado reforçado": { ing: { "Fruta": 1, "Porco": 1, "Verdura": 1 }, cd: 20, desc: "+20 PV Temp, -3m Desl." },
        "Estrogonofe": { ing: { "Carne": 1, "Cogumelo": 1, "Leite": 1 }, cd: 20, desc: "+2 Vontade" },
        "Futomaki": { ing: { "Cereal": 1, "Peixe": 1 }, cd: 20, desc: "+2 Diplomacia" },
        "Gorad quente": { ing: { "Gorad": 1, "Leite": 1 }, cd: 25, desc: "+2 PM Temp" },
        "Gorvelã": { ing: { "Gorad": 1, "Avelã de Norba": 1 }, cd: 30, desc: "+5 PM Temp" },
        "Javali do Bosque": { ing: { "Carne de caça": 1, "Cogumelo": 1, "Farinha": 1 }, cd: 20, desc: "+2 Defesa" },
        "Macarrão de Yuvalin": { ing: { "Farinha": 1, "Leite": 1, "Porco": 1 }, cd: 20, desc: "+5 PV Temp" },
        "Manjar dos titãs": { ing: { "Avelã de Norba": 1, "Farinha": 1, "Ovo de monstro": 1 }, cd: 30, desc: "+1d4 Perícias Físicas" },
        "Ovo frito": { ing: { "Ovo de monstro": 1, "Óleo": 1 }, cd: 25, desc: "+10 PV Temp" },
        "Pão de queijo": { ing: { "Farinha": 1, "Queijo": 1 }, cd: 20, desc: "+2 Fortitude" },
        "Pavão celestial": { ing: { "Açúcar das fadas": 1, "Carne de caça": 1, "Fruta": 1 }, cd: 30, desc: "+1d4 Perícias Mentais" },
        "Pizza": { ing: { "Farinha": 1, "Fruta": 1, "Queijo": 1 }, cd: 20, desc: "+1 Resistências" },
        "Porco deheoni": { ing: { "Porco": 1, "Fruta": 1, "Legume": 1 }, cd: 20, desc: "+1 Ataque corpo a corpo" },
        "Prato do aventureiro": { ing: { "Ave": 1, "Legume": 1 }, cd: 15, desc: "+1/nível Rec. PV" },
        "Salada de Salistick": { ing: { "Ave": 1, "Fruta": 1, "Legume": 1 }, cd: 20, desc: "+1,5m Deslocamento" },
        "Salada élfica": { ing: { "Fruta": 1, "Legume": 1, "Verdura": 1 }, cd: 20, desc: "+1 Ataque à distância" },
        "Salada imperial": { ing: { "Porco": 1, "Queijo": 1, "Verdura": 1 }, cd: 20, desc: "+2 Iniciativa" },
        "Sashimi": { ing: { "Peixe": 1, "Molho tamuraniano": 1 }, cd: 25, desc: "+2 Dano à distância" },
        "Sopa de cogumelos": { ing: { "Cogumelo": 1, "Legume": 1, "Verdura": 1 }, cd: 20, desc: "+2 Misticismo" },
        "Sopa de peixe": { ing: { "Verdura": 1, "Peixe": 1 }, cd: 15, desc: "+1/nível Rec. PM" },
        "Torta de maçã": { ing: { "Farinha": 1, "Fruta": 1 }, cd: 20, desc: "+5 Res. Veneno" }
    }
};

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
        syntax: '!solicitada <ND do Mestre> <custo_por_player> <@player1> ...'
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
    },
    {
        name: '!entregar',
        description: 'Entrega um ou mais itens para um jogador. Separe por vírgulas.',
        syntax: '!entregar <@usuario> <linkItem1>, ..., <linkItemN>'
    },
    {
        name: '!primeiramissao',
        description: 'Resgata um bônus de 300 T$ pela primeira missão do personagem (uso único).',
        syntax: '!primeiramissao'
    }/*,
    {
        name: '!ficha',
        description: 'Exibe e edita a ficha (Status, Atributos, Classes, Descanso).',
        syntax: '!ficha'
    },
    {
        name: '!resgatarforja',
        description: 'Resgata seus pontos de forja diários.',
        syntax: '!resgatarforja'
    },
    {
        name: '!forjar',
        description: 'Abre a oficina para fabricar itens.',
        syntax: '!forjar'
    },
    {
        name: '!punga',
        description: 'Realiza um saque aleatório (Dinheiro ou Item) baseado no ND do alvo.',
        syntax: '!punga'
    }*/
];

const adminCommands = [
    {
        name: '!admin-criar',
        description: 'Cria um personagem forçadamente para outro usuário.',
        syntax: '!admin-criar <@player> <Nome>'
    },
    {
        name: '!admin-extrato',
        description: 'Vê o extrato completo de um jogador.',
        syntax: '!admin-extrato <@player>'
    },
    {
        name: '!admin-setforja',
        description: 'Define quantos pontos de forja um jogador ganha por dia.',
        syntax: '!admin-setforja <@player> <pontos>'
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

function calcularNivelEPatamar(classes) {
    const nivelTotal = classes.reduce((acc, c) => acc + c.nivel, 0) || 1;
    let patamar = 1;
    if (nivelTotal >= 5) patamar = 2;
    if (nivelTotal >= 11) patamar = 3;
    if (nivelTotal >= 17) patamar = 4;
    return { nivelTotal, patamar };
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

    else if (command === 'help' || command === 'ajuda') {
        const CATEGORIAS = {
            'personagem': {
                emoji: '👤',
                titulo: 'Personagem & Economia',
                descricao: 'Gerencie sua ficha, saldo e transações.',
                comandos: [
                    { 
                        cmd: '!cadastrar', 
                        desc: 'Cria um novo personagem (limite de 2 por jogador).', 
                        syntax: '!cadastrar <nome_do_personagem>' 
                    },
                    { 
                        cmd: '!personagem', 
                        desc: 'Gerencia seus personagens. Subcomandos: listar, trocar, apagar.', 
                        syntax: '!personagem <listar | trocar | apagar> [nome]' 
                    },
                    { 
                        cmd: '!ficha', 
                        desc: 'Exibe e edita a ficha (Status, Atributos, Classes, Descanso).', 
                        syntax: '!ficha' 
                    },
                    { 
                        cmd: '!saldo', 
                        desc: 'Verifica o saldo do seu personagem ativo.', 
                        syntax: '!saldo' 
                    },
                    { 
                        cmd: '!extrato', 
                        desc: 'Mostra as últimas transações do personagem ativo.', 
                        syntax: '!extrato' 
                    },
                    { 
                        cmd: '!tix', 
                        desc: 'Transfere T$ do seu personagem para outro jogador.', 
                        syntax: '!tix <@usuário> <valor>' 
                    },
                    { 
                        cmd: '!gasto', 
                        desc: 'Registra um gasto pessoal do personagem ativo.', 
                        syntax: '!gasto <valor> <motivo>' 
                    }
                ]
            },
            'missao': {
                emoji: '🛡️',
                titulo: 'Sistema de Missões',
                descricao: 'Participe de aventuras e entregue demandas.',
                comandos: [
                    { 
                        cmd: '!inscrever', 
                        desc: 'Se candidata a uma missão aberta no canal.', 
                        syntax: '!inscrever' 
                    },
                    { 
                        cmd: '!resgatar', 
                        desc: 'Resgata recompensa de missão concluída (Ouro + Pontos).', 
                        syntax: '!resgatar "Nome da Missão"' 
                    },              
                    { 
                        cmd: '!drop', 
                        desc: 'Gera um loot aleatório baseado no ND.', 
                        syntax: '!drop <ND>' 
                    }
                ]
            },
            'sistemas': {
                emoji: '⚒️',
                titulo: 'Ofícios & Comércio',
                descricao: 'Forja, Culinária e Vendas.',
                comandos: [
                    { 
                        cmd: '!venda', 
                        desc: 'Vende um item para outro jogador.', 
                        syntax: '!venda <@comprador> <valor> <item> <link>' 
                    },
                    { 
                        cmd: '!feirinha', 
                        desc: 'Abre o mercado semanal de ingredientes.', 
                        syntax: '!feirinha' 
                    },
                    { 
                        cmd: '!aprenderculinaria', 
                        desc: 'Aprende novas receitas baseado na Inteligência.', 
                        syntax: '!aprenderculinaria' 
                    },
                    { 
                        cmd: '!cozinhar', 
                        desc: 'Prepara pratos que dão bônus (Gasta Forja).', 
                        syntax: '!cozinhar' 
                    },
                    { 
                        cmd: '!forjar', 
                        desc: 'Abre a oficina para fabricar itens.', 
                        syntax: '!forjar' 
                    },
                    { 
                        cmd: '!resgatarforja', 
                        desc: 'Resgata seus pontos de forja diários.', 
                        syntax: '!resgatarforja' 
                    },
                    { 
                        cmd: '!entregar', 
                        desc: 'Entrega itens para um jogador.', 
                        syntax: '!entregar <@usuario> <linkItem1>, <linkItem2>...' 
                    },
                    { 
                        cmd: '!missa', 
                        desc: 'Clérigo vende serviço de Missa (divide custo entre fiéis).', 
                        syntax: '!missa <valor_total> <@player1> <@player2> ...' 
                    }
                ]
            },
            'atividades': {
                emoji: '🎲',
                titulo: 'Jogos & Interação',
                descricao: 'Apostas, crimes e treinamento.',
                comandos: [
                    { 
                        cmd: '!apostar', 
                        desc: 'Aposta no Jogo do Bicho.', 
                        syntax: '!apostar <valor> <dezena|centena|milhar> <numero> <posicao>' 
                    },
                    { 
                        cmd: '!punga', 
                        desc: 'Realiza um saque aleatório (Dinheiro ou Item).', 
                        syntax: '!punga' 
                    }
                ]
            },
            'mestre': {
                emoji: '👑',
                titulo: 'Administração',
                descricao: 'Comandos exclusivos para Mestres.',
                comandos: [
                    { 
                        cmd: '!solicitada', 
                        desc: 'Registra missão solicitada e paga a recompensa ao mestre.', 
                        syntax: '!solicitada <ND> <custo_por_player> <@player1>...' 
                    },                   
                    { 
                        cmd: '!criarmissao', 
                        desc: 'Cria uma nova missão no quadro.', 
                        syntax: '!criarmissao "Nome da Missão" <ND> <Vagas>' 
                    },
                    { 
                        cmd: '!painelmissao', 
                        desc: 'Gerencia inscritos e status da missão.', 
                        syntax: '!painelmissao "Nome da Missão"' 
                    }
                ]
            }
        };

        const args = message.content.split(' ').slice(1);
        const categoriaEscolhida = args[0] ? args[0].toLowerCase() : null;

        if (!categoriaEscolhida || !CATEGORIAS[categoriaEscolhida]) {
            const embed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle('📘 Herdeiros das Cinzas - Ajuda')
                .setDescription('Digite `!help <categoria>` para ver os comandos detalhados.')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Personagem', value: '`!help personagem`', inline: true },
                    { name: '🛡️ Missões', value: '`!help missao`', inline: true },
                    { name: '⚒️ Sistemas', value: '`!help sistemas`', inline: true },
                    { name: '🎲 Atividades', value: '`!help atividades`', inline: true },
                    { name: '👑 Mestre', value: '`!help mestre`', inline: true }
                )
                .setFooter({ text: 'Exemplo: !help personagem' });

            return message.reply({ embeds: [embed] });
        }

        const cat = CATEGORIAS[categoriaEscolhida];
        
        const listaComandos = cat.comandos.map(c => `**${c.cmd}**\n*${c.desc}*\n\`${c.syntax}\``).join('\n\n');

        const embedCategoria = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`${cat.emoji} ${cat.titulo}`)
            .setDescription(cat.descricao)
            .addFields({ name: 'Comandos Disponíveis', value: listaComandos })
            .setFooter({ text: 'Use !help para voltar ao menu principal.' });

        return message.reply({ embeds: [embedCategoria] });
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
        const recompensaNarrador = 100 * dificuldade;

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

    else if (command === 'entregar') {

        const destinatarioUser = message.mentions.users.first();
        if (!destinatarioUser) {
            return message.reply("Você precisa mencionar quem receberá os itens. Ex: `!entregar @Player Espada Longa, Poção`");
        }

        const conteudo = message.content.slice(prefix.length + command.length).trim();
        const textoSemMencao = conteudo.replace(/<@!?\d+>/g, '').trim();

        if (!textoSemMencao) return message.reply("Você precisa listar pelo menos um item.");

        const listaItens = textoSemMencao.split(',').map(item => item.trim()).filter(item => item.length > 0);

        try {
            const charDestinatario = await getPersonagemAtivo(destinatarioUser.id);
            if (!charDestinatario) {
                return message.reply(`O usuário **${destinatarioUser.username}** não tem personagem ativo para receber itens.`);
            }

            const operacoes = listaItens.map(item => 
                prisma.transacao.create({
                    data: {
                        personagem_id: charDestinatario.id,
                        descricao: `Recebeu Item: ${item}`,
                        valor: 0,
                        tipo: 'RECOMPENSA',
                        categoria: 'ITEM'
                    }
                })
            );

            await prisma.$transaction(operacoes);

            const listaFormatada = listaItens.map(i => `📦 ${i}`).join('\n');
            
            const embed = new EmbedBuilder()
                .setColor('#9B59B6') 
                .setTitle('🎁 Itens Entregues!')
                .setDescription(`O player **${message.author.username}** entregou itens para **${charDestinatario.nome}**.`)
                .addFields({ name: 'Itens Recebidos', value: listaFormatada })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando !entregar:", err);
            message.reply("Ocorreu um erro ao entregar os itens.");
        }
    }

    else if (command === 'primeiramissao') {
        try {
            const personagem = await getPersonagemAtivo(message.author.id);
            if (!personagem) {
                return message.reply("Você precisa ter um personagem ativo para resgatar o bônus inicial.");
            }

            const jaResgatou = await prisma.transacao.findFirst({
                where: {
                    personagem_id: personagem.id,
                    categoria: 'PRIMEIRA_MISSAO' 
                }
            });

            if (jaResgatou) {
                return message.reply(`🚫 O personagem **${personagem.nome}** já resgatou o bônus de primeira missão!`);
            }

            const bonus = 300;

            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: personagem.id },
                    data: { saldo: { increment: bonus } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: personagem.id,
                        descricao: 'Bônus de Primeira Missão (Substitui ND1)',
                        valor: bonus,
                        tipo: 'RECOMPENSA',
                        categoria: 'PRIMEIRA_MISSAO'
                    }
                })
            ]);

            const embed = new EmbedBuilder()
                .setColor('#00FFFF') 
                .setTitle('✨ Primeira Aventura Concluída!')
                .setDescription(`Parabéns por completar sua primeira missão com **${personagem.nome}**!`)
                .addFields(
                    { name: 'Bônus Recebido', value: formatarMoeda(bonus) },
                    { name: 'Novo Saldo', value: formatarMoeda(personagem.saldo + bonus) }
                )
                .setFooter({ text: 'Este bônus é único por personagem.' });

            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando !primeiramissao:", err);
            message.reply("Ocorreu um erro ao processar o bônus.");
        }
    }

    else if (command === 'admin-extrato') {

        const alvo = message.mentions.users.first();
        if (!alvo) return message.reply("Sintaxe: `!admin-extrato <@usuario>`");

        try {
            const personagem = await getPersonagemAtivo(alvo.id);
            
            if (!personagem) {
                return message.reply(`O usuário **${alvo.username}** não tem nenhum personagem ativo no momento.`);
            }

            const transacoes = await prisma.transacao.findMany({
                where: { personagem_id: personagem.id },
                orderBy: { data: 'desc' },
                take: 10 
            });

            const extratoEmbed = new EmbedBuilder()
                .setColor('#F1C40F') 
                .setTitle(`🕵️ Extrato Administrativo: ${personagem.nome}`)
                .setDescription(`**Dono:** ${alvo.username} | **Saldo Atual:** ${formatarMoeda(personagem.saldo)}`)
                .setFooter({ text: 'Visualização restrita de administrador' });

            if (transacoes.length > 0) {
                const transacoesStr = transacoes.map(t => {
                    let icone = '🔹'; 
                    if (t.tipo === 'GASTO') icone = '🔴';
                    if (t.tipo === 'RECOMPENSA' || t.tipo === 'VENDA') icone = '🟢';
                    if (t.tipo === 'COMPRA') icone = '💸';

                    const dataFormatada = new Date(t.data).toLocaleDateString('pt-BR');
                    return `\`#${t.id}\` \`${dataFormatada}\` ${icone} **${formatarMoeda(t.valor)}**\n╰ *${t.descricao}*`;
                }).join('\n');
                
                extratoEmbed.addFields({ name: 'Últimas 10 Transações', value: transacoesStr });
            } else {
                extratoEmbed.addFields({ name: 'Histórico', value: 'Nenhuma transação registrada para este personagem.' });
            }
            
            await message.channel.send({ embeds: [extratoEmbed] });

        } catch (err) {
            console.error("Erro no comando !admin-extrato:", err);
            await message.reply("Erro ao buscar o extrato do usuário.");
        }
    }

    else if (command === 'ficha') {
        const { MessageFlags } = require('discord.js');

        const CUSTO_NIVEL = {
            3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
            11: 10, 12: 10, 13: 10, 14: 10, 15: 10, 16: 10
        };

        const LISTA_CLASSES_1 = ["Arcanista", "Alquimista", "Atleta", "Bárbaro", "Bardo", "Burguês", "Bucaneiro", "Caçador", "Cavaleiro", "Clérigo", "Duelista", "Druída", "Ermitão", "Frade", "Guerreiro"];
        const LISTA_CLASSES_2 = ["Inovador", "Inventor", "Ladino", "Lutador", "Machado de Pedra", "Magimarcialista", "Nobre", "Necromante", "Paladino", "Santo", "Seteiro", "Treinador", "Usurpador", "Vassalo", "Ventanista"];

        const PERICIAS_LISTA_1 = [
            "Acrobacia", "Adestramento", "Atletismo", "Atuação", "Cavalgar", "Conhecimento", "Cura", 
            "Diplomacia", "Enganação", "Fortitude", "Furtividade", "Guerra", "Iniciativa", 
            "Intimidação", "Intuição", "Investigação", "Jogatina", "Ladinagem", "Luta", "Misticismo"
        ];
        const PERICIAS_LISTA_2 = [
            "Nobreza", "Ofício Alquimista", "Ofício Armeiro", "Ofício Artesão", "Ofício Alfaiate", 
            "Ofício Cozinheiro", "Ofício Escriba", "Ofício Engenhoqueiro", "Ofício Tatuador", 
            "Ofício Barbeiro", "Percepção", "Pilotagem", "Pontaria", "Reflexos", "Religião", 
            "Sobrevivência", "Vontade"
        ];

        const ativo = await getPersonagemAtivo(message.author.id);
        if (!ativo) return message.reply("Você não tem um personagem ativo.");

        let char = await prisma.personagens.findFirst({
            where: { id: ativo.id },
            include: { classes: true }
        });

        const calcularDados = (p) => {
            const nivelReal = p.nivel_personagem || 3; 
            let patamar = 1;
            if (nivelReal >= 5) patamar = 2;
            if (nivelReal >= 11) patamar = 3;
            if (nivelReal >= 17) patamar = 4;
            return { nivelReal, patamar };
        };

        const montarEmbedFicha = (p) => {
            const { nivelReal, patamar } = calcularDados(p);
            const calcCD = (mod) => 10 + mod + Math.floor(nivelReal / 2);
            
            const txtVida = p.vida_temp > 0 ? `${p.vida_atual}/${p.vida_max} (+${p.vida_temp})` : `${p.vida_atual}/${p.vida_max}`;
            const txtMana = p.mana_temp > 0 ? `${p.mana_atual}/${p.mana_max} (+${p.mana_temp})` : `${p.mana_atual}/${p.mana_max}`;
            const obsTexto = p.observacoes ? p.observacoes : "Nenhuma observação registrada.";
            
            const somaClasses = p.classes.reduce((acc, c) => acc + c.nivel, 0);
            const niveisPendentes = nivelReal - somaClasses;
            const avisoClasse = niveisPendentes > 0 ? `\n⚠️ **Níveis pendentes:** ${niveisPendentes}` : "";

            const textoClasses = p.classes.length > 0 
                ? p.classes.map(c => `${c.nome_classe} ${c.nivel}`).join(' / ')
                : "Sem Classe Definida";

            const listaPericias = (p.pericias && Array.isArray(p.pericias)) ? p.pericias.join(', ') : "Nenhuma";

            const custoProx = CUSTO_NIVEL[nivelReal] || 'Max';
            const barraProgresso = `${p.pontos_missao}/${custoProx}`;

            const embed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle(`Ficha de ${p.nome}`)
                .setDescription(`**${textoClasses}**${avisoClasse}\nNível de Personagem: **${nivelReal}** (Patamar ${patamar})`)
                .addFields(
                    { name: '❤️ Vida', value: txtVida, inline: true },
                    { name: '⭐ Mana', value: txtMana, inline: true },
                    { name: '📈 Progresso', value: `Pontos: **${barraProgresso}**`, inline: true },
                    { name: '🛠️ Forja', value: `${p.pontos_forja_atual.toFixed(1)} pts`, inline: true },
                    { name: '🏃 Deslocamento', value: `${p.deslocamento}`, inline: true },
                    { name: '\u200B', value: '**Atributos**' },
                    { 
                        name: 'Físicos', 
                        value: `**FOR:** ${p.forca > 0 ? '+' : ''}${p.forca} (CD ${calcCD(p.forca)})\n**DES:** ${p.destreza > 0 ? '+' : ''}${p.destreza} (CD ${calcCD(p.destreza)})\n**CON:** ${p.constituicao > 0 ? '+' : ''}${p.constituicao} (CD ${calcCD(p.constituicao)})`, 
                        inline: true 
                    },
                    { 
                        name: 'Mentais', 
                        value: `**INT:** ${p.inteligencia > 0 ? '+' : ''}${p.inteligencia} (CD ${calcCD(p.inteligencia)})\n**SAB:** ${p.sabedoria > 0 ? '+' : ''}${p.sabedoria} (CD ${calcCD(p.sabedoria)})\n**CAR:** ${p.carisma > 0 ? '+' : ''}${p.carisma} (CD ${calcCD(p.carisma)})`, 
                        inline: true 
                    },
                    { name: '🎭 Perícias Treinadas', value: listaPericias },
                    { name: '📝 Observações', value: obsTexto }
                );

            if (p.banner_url) embed.setImage(p.banner_url);
            else embed.setThumbnail(message.author.displayAvatarURL());

            return embed;
        };

        const getBotoes = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_classes').setLabel('Classes').setStyle(ButtonStyle.Success).setEmoji('📚'),
            new ButtonBuilder().setCustomId('btn_descanso').setLabel('Descansar').setStyle(ButtonStyle.Success).setEmoji('💤'),
            new ButtonBuilder().setCustomId('edit_status').setLabel('Status').setStyle(ButtonStyle.Primary).setEmoji('❤️'),
            new ButtonBuilder().setCustomId('edit_pericias').setLabel('Perícias').setStyle(ButtonStyle.Secondary).setEmoji('🎭')
        );
        
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_fisico').setLabel('Físicos').setStyle(ButtonStyle.Secondary).setEmoji('💪'),
            new ButtonBuilder().setCustomId('edit_mental').setLabel('Mentais').setStyle(ButtonStyle.Secondary).setEmoji('🧠'),
            new ButtonBuilder().setCustomId('edit_obs').setLabel('Obs').setStyle(ButtonStyle.Secondary).setEmoji('📝')
        );

        const msg = await message.reply({ 
            embeds: [montarEmbedFicha(char)], 
            components: [getBotoes(), row2] 
        });

        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === message.author.id, 
            time: 600000 
        });

        collector.on('collect', async interaction => {
            const uniqueID = `_${msg.id}`;

            if (interaction.customId === 'edit_pericias') {
                const menu1 = new StringSelectMenuBuilder().setCustomId('menu_pericia_1').setPlaceholder('Perícias (A - M)');
                const menu2 = new StringSelectMenuBuilder().setCustomId('menu_pericia_2').setPlaceholder('Perícias (N - Z)');

                PERICIAS_LISTA_1.forEach(p => menu1.addOptions(new StringSelectMenuOptionBuilder().setLabel(p).setValue(p)));
                PERICIAS_LISTA_2.forEach(p => menu2.addOptions(new StringSelectMenuOptionBuilder().setLabel(p).setValue(p)));

                const r1 = new ActionRowBuilder().addComponents(menu1);
                const r2 = new ActionRowBuilder().addComponents(menu2);
                const r3 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_limpar_pericias').setLabel('Limpar Todas Perícias').setStyle(ButtonStyle.Danger)
                );

                const response = await interaction.reply({
                    content: `Selecione as perícias para **Adicionar** à sua ficha.\n*Atuais:* ${(char.pericias || []).join(', ')}`,
                    components: [r1, r2, r3],
                    flags: MessageFlags.Ephemeral,
                    withResponse: true
                });

                const periciaCollector = response.resource.message.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 60000
                });

                periciaCollector.on('collect', async iPericia => {
                    let novasPericias = [...(char.pericias || [])]; 

                    if (iPericia.customId === 'btn_limpar_pericias') {
                        novasPericias = [];
                        await iPericia.reply({ content: "🗑️ Todas as perícias foram removidas.", flags: MessageFlags.Ephemeral });
                    } else {
                        const selecionada = iPericia.values[0];
                        if (!novasPericias.includes(selecionada)) {
                            novasPericias.push(selecionada);
                            novasPericias.sort(); 
                            await iPericia.reply({ content: `✅ **${selecionada}** adicionada!`, flags: MessageFlags.Ephemeral });
                        } else {
                            novasPericias = novasPericias.filter(p => p !== selecionada);
                            await iPericia.reply({ content: `❌ **${selecionada}** removida!`, flags: MessageFlags.Ephemeral });
                        }
                    }

                    await prisma.personagens.update({ where: { id: char.id }, data: { pericias: novasPericias } });
                    
                    char = await prisma.personagens.findFirst({ where: { id: char.id }, include: { classes: true } });
                    await msg.edit({ embeds: [montarEmbedFicha(char)] });
                });
                return;
            }

            if (interaction.customId === 'edit_classes') {
                const menu1 = new StringSelectMenuBuilder().setCustomId('menu_classe_1').setPlaceholder('Classes A-G');
                const menu2 = new StringSelectMenuBuilder().setCustomId('menu_classe_2').setPlaceholder('Classes I-V');

                LISTA_CLASSES_1.forEach(cls => menu1.addOptions(new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)));
                LISTA_CLASSES_2.forEach(cls => menu2.addOptions(new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)));

                const r1 = new ActionRowBuilder().addComponents(menu1);
                const r2 = new ActionRowBuilder().addComponents(menu2);

                const response = await interaction.reply({ 
                    content: `Selecione uma classe para **Adicionar** ou **Editar o Nível**.\n*(Você tem ${char.nivel_personagem - char.classes.reduce((a, b) => a + b.nivel, 0)} níveis livres)*`, 
                    components: [r1, r2], 
                    flags: MessageFlags.Ephemeral,
                    withResponse: true
                });

                const menuCollector = response.resource.message.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 60000
                });

                menuCollector.on('collect', async iMenu => {
                    const classeSelecionada = iMenu.values[0];
                    const modal = new ModalBuilder().setCustomId(`modal_nivel_${classeSelecionada}${uniqueID}`).setTitle(`Nível de ${classeSelecionada}`);
                    modal.addComponents(new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('inp_nivel').setLabel('Novo nível (0 para remover)').setStyle(TextInputStyle.Short)
                    ));
                    await iMenu.showModal(modal);
                });
                return;
            }

            if (interaction.customId === 'btn_descanso') {
                if (char.ultimo_descanso) {
                    const agora = new Date();
                    const ultimo = new Date(char.ultimo_descanso);
                    const mesmoDia = agora.getDate() === ultimo.getDate();
                    const mesmoMes = agora.getMonth() === ultimo.getMonth();
                    const mesmoAno = agora.getFullYear() === ultimo.getFullYear();

                    if (mesmoDia && mesmoMes && mesmoAno) {
                        return interaction.reply({ content: `🚫 **${char.nome}** já descansou hoje! Tente novamente amanhã.`, flags: MessageFlags.Ephemeral });
                    }
                }

                const { nivelReal } = calcularDados(char);
                const botoesDescanso = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('desc_ruim').setLabel('Ruim (Nív/2)').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('desc_normal').setLabel('Normal (Nív)').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('desc_conf').setLabel('Confortável (2x)').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('desc_lux').setLabel('Luxuoso (3x)').setStyle(ButtonStyle.Success)
                );

                const menuDescansoResponse = await interaction.reply({ 
                    content: `🛏️ **Modo de Descanso**\nNível: ${nivelReal}\nEscolha a qualidade da hospedagem:\n*(Você só pode descansar uma vez por dia)*`,
                    components: [botoesDescanso],
                    flags: MessageFlags.Ephemeral,
                    withResponse: true
                });

                const descCollector = menuDescansoResponse.resource.message.createMessageComponentCollector({ time: 60000 });
                
                descCollector.on('collect', async iDesc => {
                    let tipoSelecionado = "";
                    if (iDesc.customId === 'desc_ruim') tipoSelecionado = "ruim";
                    if (iDesc.customId === 'desc_normal') tipoSelecionado = "normal";
                    if (iDesc.customId === 'desc_conf') tipoSelecionado = "confortavel";
                    if (iDesc.customId === 'desc_lux') tipoSelecionado = "luxuoso";

                    const modalDescanso = new ModalBuilder()
                        .setCustomId(`modal_descanso_${tipoSelecionado}${uniqueID}`)
                        .setTitle('Bônus de Descanso');

                    modalDescanso.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('inp_bonus_vida').setLabel('Bônus Extra de Vida (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Ex: 5')
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('inp_bonus_mana').setLabel('Bônus Extra de Mana (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Ex: 2')
                        )
                    );

                    await iDesc.showModal(modalDescanso);
                });
                return;
            }
            
            if (interaction.customId === 'edit_status') {
                const modal = new ModalBuilder().setCustomId('modal_status' + uniqueID).setTitle('Editar Status');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_vida').setLabel('Vida Atual / Máxima').setStyle(TextInputStyle.Short).setValue(`${char.vida_atual}/${char.vida_max}`)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_vida_temp').setLabel('Vida Temporária').setStyle(TextInputStyle.Short).setValue(String(char.vida_temp)).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_mana').setLabel('Mana Atual / Máxima').setStyle(TextInputStyle.Short).setValue(`${char.mana_atual}/${char.mana_max}`)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_mana_temp').setLabel('Mana Temporária').setStyle(TextInputStyle.Short).setValue(String(char.mana_temp)).setRequired(false))
                );
                await interaction.showModal(modal);
            }

            if (interaction.customId === 'edit_fisico') {
                const modal = new ModalBuilder().setCustomId('modal_fisico' + uniqueID).setTitle('Editar Físicos');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_for').setLabel('Força').setStyle(TextInputStyle.Short).setValue(String(char.forca))),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_des').setLabel('Destreza').setStyle(TextInputStyle.Short).setValue(String(char.destreza))),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_con').setLabel('Constituição').setStyle(TextInputStyle.Short).setValue(String(char.constituicao)))
                );
                await interaction.showModal(modal);
            }

            if (interaction.customId === 'edit_mental') {
                const modal = new ModalBuilder().setCustomId('modal_mental' + uniqueID).setTitle('Editar Mentais');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_int').setLabel('Inteligência').setStyle(TextInputStyle.Short).setValue(String(char.inteligencia))),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_sab').setLabel('Sabedoria').setStyle(TextInputStyle.Short).setValue(String(char.sabedoria))),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_car').setLabel('Carisma').setStyle(TextInputStyle.Short).setValue(String(char.carisma)))
                );
                await interaction.showModal(modal);
            }

            if (interaction.customId === 'edit_obs') {
                const modal = new ModalBuilder().setCustomId('modal_obs' + uniqueID).setTitle('Editar Observações');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_obs').setLabel('Anotações').setStyle(TextInputStyle.Paragraph).setValue(char.observacoes || '').setMaxLength(1000)));
                await interaction.showModal(modal);
            }
        });

        const modalHandler = async (i) => {
            if (!i.isModalSubmit() || !i.customId.endsWith(msg.id) || i.user.id !== message.author.id) return;

            let logDescricao = "";
            const uniqueID = `_${msg.id}`;

            if (i.customId.startsWith('modal_descanso_')) {
                const partes = i.customId.replace(uniqueID, '').split('_');
                const tipoDescansoCode = partes[2]; // ruim, normal, conf, lux

                const bonusVidaInput = parseInt(i.fields.getTextInputValue('inp_bonus_vida')) || 0;
                const bonusManaInput = parseInt(i.fields.getTextInputValue('inp_bonus_mana')) || 0;

                const { nivelReal } = calcularDados(char);
                let multiplicador = 1;
                let nomeTipo = "Normal";

                if (tipoDescansoCode === 'ruim') { multiplicador = 0.5; nomeTipo = "Ruim"; }
                if (tipoDescansoCode === 'confortavel') { multiplicador = 2; nomeTipo = "Confortável"; }
                if (tipoDescansoCode === 'luxuoso') { multiplicador = 3; nomeTipo = "Luxuoso"; }

                const recBase = Math.floor(nivelReal * multiplicador) || 1;
                const recVidaTotal = recBase + bonusVidaInput;
                const recManaTotal = recBase + bonusManaInput;

                const novaVida = Math.min(char.vida_max, char.vida_atual + recVidaTotal);
                const novaMana = Math.min(char.mana_max, char.mana_atual + recManaTotal);
                const curouVida = novaVida - char.vida_atual;
                const curouMana = novaMana - char.mana_atual;

                await prisma.$transaction([
                    prisma.personagens.update({
                        where: { id: char.id },
                        data: { vida_atual: novaVida, mana_atual: novaMana, ultimo_descanso: new Date() }
                    }),
                    prisma.transacao.create({
                        data: {
                            personagem_id: char.id,
                            descricao: `Descanso ${nomeTipo} (Bônus +${bonusVidaInput}/+${bonusManaInput}): +${curouVida} PV, +${curouMana} PM`,
                            valor: 0,
                            tipo: 'LOG'
                        }
                    })
                ]);
                
                logDescricao = "Realizou Descanso"; 
                await i.reply({ content: `✅ **Descanso realizado!**\nRecuperou: +${curouVida} Vida e +${curouMana} Mana.\n(Base: ${recBase} + Bônus)`, flags: MessageFlags.Ephemeral });
            }

            if (i.customId.startsWith('modal_nivel_')) {
                const classeNome = i.customId.replace('modal_nivel_', '').replace(uniqueID, '');
                const nivelInput = parseInt(i.fields.getTextInputValue('inp_nivel'));

                if (isNaN(nivelInput)) return i.reply({content: "Nível inválido", flags: MessageFlags.Ephemeral});

                if (nivelInput > 0) {
                    const somaAtual = char.classes.reduce((acc, c) => acc + (c.nome_classe === classeNome ? 0 : c.nivel), 0);
                    if (somaAtual + nivelInput > char.nivel_personagem) {
                        return i.reply({ content: `🚫 Você não pode exceder o nível total do personagem (${char.nivel_personagem}).`, flags: MessageFlags.Ephemeral });
                    }
                }

                if (nivelInput <= 0) {
                    await prisma.personagemClasse.deleteMany({ where: { personagem_id: char.id, nome_classe: classeNome } });
                    logDescricao = `Removeu a classe ${classeNome}`;
                } else {
                    const existe = await prisma.personagemClasse.findFirst({ where: { personagem_id: char.id, nome_classe: classeNome } });
                    if (existe) {
                        await prisma.personagemClasse.update({ where: { id: existe.id }, data: { nivel: nivelInput }});
                        logDescricao = `Atualizou ${classeNome} para nível ${nivelInput}`;
                    } else {
                        await prisma.personagemClasse.create({ data: { personagem_id: char.id, nome_classe: classeNome, nivel: nivelInput }});
                        logDescricao = `Adicionou ${classeNome} nível ${nivelInput}`;
                    }
                }
                
                await i.update({ content: `✅ **Sucesso:** ${logDescricao}`, components: [] });
            }

            if (i.customId === 'modal_status' + uniqueID) {
                const [vAtual, vMax] = i.fields.getTextInputValue('inp_vida').split('/').map(Number);
                const [mAtual, mMax] = i.fields.getTextInputValue('inp_mana').split('/').map(Number);
                const vTemp = parseInt(i.fields.getTextInputValue('inp_vida_temp')) || 0;
                const mTemp = parseInt(i.fields.getTextInputValue('inp_mana_temp')) || 0;

                logDescricao = `Editou Status: Vida ${vAtual}/${vMax}, Mana ${mAtual}/${mMax}`;

                await prisma.personagens.update({
                    where: { id: char.id },
                    data: { 
                        vida_atual: vAtual || 0, vida_max: vMax || vAtual || 10, vida_temp: vTemp,
                        mana_atual: mAtual || 0, mana_max: mMax || mAtual || 0, mana_temp: mTemp
                    }
                });
                await i.deferUpdate();
            }

            if (i.customId === 'modal_obs' + uniqueID) {
                const obs = i.fields.getTextInputValue('inp_obs');
                logDescricao = "Editou Observações da Ficha";
                await prisma.personagens.update({ where: { id: char.id }, data: { observacoes: obs } });
                await i.deferUpdate();
            }

            if (i.customId === 'modal_fisico' + uniqueID) {
                const nFor = parseInt(i.fields.getTextInputValue('inp_for'));
                const nDes = parseInt(i.fields.getTextInputValue('inp_des'));
                const nCon = parseInt(i.fields.getTextInputValue('inp_con'));
                logDescricao = `Editou Físicos: FOR ${nFor}, DES ${nDes}, CON ${nCon}`;
                await prisma.personagens.update({ where: { id: char.id }, data: { forca: nFor || 0, destreza: nDes || 0, constituicao: nCon || 0 } });
                await i.deferUpdate();
            }

            if (i.customId === 'modal_mental' + uniqueID) {
                const nInt = parseInt(i.fields.getTextInputValue('inp_int'));
                const nSab = parseInt(i.fields.getTextInputValue('inp_sab'));
                const nCar = parseInt(i.fields.getTextInputValue('inp_car'));
                logDescricao = `Editou Mentais: INT ${nInt}, SAB ${nSab}, CAR ${nCar}`;
                await prisma.personagens.update({ where: { id: char.id }, data: { inteligencia: nInt || 0, sabedoria: nSab || 0, carisma: nCar || 0 } });
                await i.deferUpdate();
            }

            if (logDescricao) {
                char = await prisma.personagens.findFirst({ where: { id: char.id }, include: { classes: true } });
                await msg.edit({ embeds: [montarEmbedFicha(char)] });
            }
        };

        client.on('interactionCreate', modalHandler);
        setTimeout(() => { client.off('interactionCreate', modalHandler); }, 600000);
    }

    else if (command === 'resgatarforja') {
        const char = await prisma.personagens.findFirst({
            where: { id: (await getPersonagemAtivo(message.author.id))?.id },
            include: { classes: true }
        });

        if (!char) return message.reply("Você não tem personagem ativo.");

        if (char.ultimo_resgate_forja) {
            const agora = new Date();
            const ultimo = new Date(char.ultimo_resgate_forja);
            if (agora.getDate() === ultimo.getDate() && agora.getMonth() === ultimo.getMonth() && agora.getFullYear() === ultimo.getFullYear()) {
                return message.reply(`🚫 **${char.nome}** já pegou seus pontos de forja hoje!`);
            }
        }

        const { patamar } = calcularNivelEPatamar(char.classes);
        const limiteAcumulo = char.pontos_forja_diarios * (1 + patamar);
        
        let novoTotal = char.pontos_forja_atual + char.pontos_forja_diarios;
        if (novoTotal > limiteAcumulo) novoTotal = limiteAcumulo;

        const ganhou = novoTotal - char.pontos_forja_atual;

        if (ganhou <= 0) {
            return message.reply(`⚠️ Seu estoque de pontos está cheio (Máx: ${limiteAcumulo}). Gaste forjando algo antes de resgatar.`);
        }

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: char.id },
                data: { 
                    pontos_forja_atual: novoTotal,
                    ultimo_resgate_forja: new Date()
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Resgate Forja Diário (+${ganhou})`,
                    valor: 0,
                    tipo: 'FORJA'
                }
            })
        ]);

        message.reply(`🔨 **Forja:** Você recebeu **${ganhou.toFixed(1)}** pontos! (Total: ${novoTotal.toFixed(1)} / Máx: ${limiteAcumulo})`);
    }

    else if (command === 'forjar') {
        const char = await getPersonagemAtivo(message.author.id);
        if (!char) return message.reply("Sem personagem ativo.");

        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_forja_tipo')
            .setPlaceholder('Selecione o TIPO de fabricação');

        for (const [tipo, custo] of Object.entries(CUSTO_FORJA)) {
            menu.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(`${tipo} (Custo: ${custo})`)
                .setValue(tipo)
            );
        }

        const row = new ActionRowBuilder().addComponents(menu);
        
        const msg = await message.reply({ 
            content: `🔨 **Oficina de Forja**\nSaldo: T$ ${formatarMoeda(char.saldo)}\nPontos de Forja: ${char.pontos_forja_atual.toFixed(1)}\nSelecione o **TIPO** de item que deseja criar:`,
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

        collector.on('collect', async i => {
            if (i.isStringSelectMenu()) {
                const tipoSelecionado = i.values[0];

                const modal = new ModalBuilder().setCustomId(`modal_forja_${tipoSelecionado}`).setTitle(`Forjar: ${tipoSelecionado}`);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_nome').setLabel('Nome do Item').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_qtd').setLabel('Quantidade').setStyle(TextInputStyle.Short).setValue('1')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_ouro').setLabel('Custo TOTAL em Ouro (T$)').setStyle(TextInputStyle.Short))
                );

                await i.showModal(modal);

                try {
                    const submit = await i.awaitModalSubmit({
                        filter: (inter) => inter.customId === `modal_forja_${tipoSelecionado}` && inter.user.id === i.user.id,
                        time: 120000
                    });

                    const tipo = tipoSelecionado;
                    const nomeItem = submit.fields.getTextInputValue('inp_nome');
                    const qtd = parseInt(submit.fields.getTextInputValue('inp_qtd'));
                    const custoOuro = parseFloat(submit.fields.getTextInputValue('inp_ouro'));
                    const custoPontosUnit = CUSTO_FORJA[tipo];

                    if (isNaN(qtd) || qtd <= 0) return submit.reply({ content: "Quantidade inválida.", ephemeral: true });
                    if (isNaN(custoOuro) || custoOuro < 0) return submit.reply({ content: "Valor em ouro inválido.", ephemeral: true });

                    const custoPontosTotal = parseFloat((custoPontosUnit * qtd).toFixed(2));
                    const charAtual = await getPersonagemAtivo(message.author.id);

                    if (charAtual.saldo < custoOuro) return submit.reply({ content: `🚫 Ouro insuficiente! Você tem T$ ${charAtual.saldo}.`, ephemeral: true });
                    if (charAtual.pontos_forja_atual < custoPontosTotal) return submit.reply({ content: `🚫 Pontos de Forja insuficientes! Custa ${custoPontosTotal}, você tem ${charAtual.pontos_forja_atual.toFixed(1)}.`, ephemeral: true });

                    await prisma.$transaction([
                        prisma.personagens.update({
                            where: { id: charAtual.id },
                            data: { 
                                saldo: { decrement: custoOuro },
                                pontos_forja_atual: { decrement: custoPontosTotal }
                            }
                        }),
                        prisma.transacao.create({
                            data: {
                                personagem_id: charAtual.id,
                                descricao: `Forjou ${qtd}x ${nomeItem} (${tipo})`,
                                valor: custoOuro,
                                tipo: 'GASTO'
                            }
                        })
                    ]);

                    await submit.reply({ 
                        content: `✅ **Item Forjado com Sucesso!**\n📦 **Item:** ${qtd}x ${nomeItem}\n📑 **Tipo:** ${tipo}\n💰 **Ouro Gasto:** T$ ${custoOuro}\n🔨 **Pontos Gastos:** ${custoPontosTotal}\n\n*Saldo Restante: T$ ${charAtual.saldo - custoOuro} | Pts: ${(charAtual.pontos_forja_atual - custoPontosTotal).toFixed(1)}*` 
                    });
                    
                    await msg.delete().catch(() => {});

                } catch (err) {
                    console.log("Tempo de modal expirado ou erro:", err);
                }
            }
        });
    }

    else if (command === 'admin-setforja') {
        /*if (!message.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return message.reply("🚫 Você não tem permissão para usar este comando.");
        }*/

        const alvo = message.mentions.users.first();
        const valor = parseInt(args[1]);

        if (!alvo || isNaN(valor)) {
            return message.reply("Sintaxe: `!admin-setforja @player <pontos_por_dia>`");
        }

        try {
            const charAlvo = await getPersonagemAtivo(alvo.id);
            if (!charAlvo) return message.reply("O usuário não tem personagem ativo.");

            await prisma.personagens.update({
                where: { id: charAlvo.id },
                data: { pontos_forja_diarios: valor }
            });

            message.reply(`✅ Definido! **${charAlvo.nome}** agora ganha **${valor}** pontos de forja por dia.`);
        } catch (err) { console.error(err); }
    }

    else if (command === 'help-admin') {
        /*if (!message.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return message.reply("🚫 Este pergaminho é selado apenas para administradores.");
        }*/

        const embed = new EmbedBuilder()
            .setColor('#FF0000') 
            .setTitle('🛡️ Comandos de Administrador')
            .setDescription('Ferramentas de gestão do servidor:')
            .setFooter({ text: 'Apenas para uso da staff.' });

        adminCommands.forEach(cmd => {
            embed.addFields({ name: `🔸 ${cmd.name}`, value: `**Uso:** \`${cmd.syntax}\`\n${cmd.description}` });
        });

        message.reply({ embeds: [embed] });
    }

    else if (command === 'punga') {
        const { MessageFlags } = require('discord.js');

        const char = await getPersonagemAtivo(message.author.id);
        if (!char) return message.reply("Você precisa de um personagem ativo para pungar.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('punga_dinheiro').setLabel('Dinheiro').setStyle(ButtonStyle.Success).setEmoji('💰'),
            new ButtonBuilder().setCustomId('punga_item').setLabel('Item').setStyle(ButtonStyle.Primary).setEmoji('🎁')
        );

        const msg = await message.reply({ 
            content: `🥷 **Punga - ${char.nome}**\nO que você deseja tentar roubar?`, 
            components: [row] 
        });

        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === message.author.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            try {
                const tipo = i.customId === 'punga_dinheiro' ? 'Dinheiro' : 'Item';
                
                const modal = new ModalBuilder().setCustomId(`modal_punga_${tipo}`).setTitle(`Punga: ${tipo}`);
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('inp_nd').setLabel('ND do Alvo (1-20)').setStyle(TextInputStyle.Short).setRequired(true)
                ));

                await i.showModal(modal);

                const submit = await i.awaitModalSubmit({
                    filter: (inter) => inter.customId === `modal_punga_${tipo}` && inter.user.id === i.user.id,
                    time: 60000
                }).catch(() => null);

                if (!submit) return;

                const nd = parseInt(submit.fields.getTextInputValue('inp_nd'));

                if (isNaN(nd) || nd < 1 || nd > 20) {
                    return submit.reply({ content: "ND inválido (1-20).", flags: MessageFlags.Ephemeral }).catch(() => {});
                }

                let resultado = "";

                if (tipo === 'Dinheiro') {
                    const valor = PungaSystem.processarDinheiro(nd);
                    
                    await prisma.$transaction([
                        prisma.personagens.update({
                            where: { id: char.id },
                            data: { saldo: { increment: valor } }
                        }),
                        prisma.transacao.create({
                            data: {
                                personagem_id: char.id,
                                descricao: `Punga (Alvo ND ${nd})`,
                                valor: valor,
                                tipo: 'GANHO'
                            }
                        })
                    ]);

                    const charAtualizado = await getPersonagemAtivo(message.author.id);
                    resultado = `💰 Você pungou **T$ ${valor}**!\n✅ *Valor depositado na conta.*\n💰 **Saldo Atual:** T$ ${charAtualizado.saldo}`;
                } 
                else {
                    const item = PungaSystem.processarPunga(nd);
                    resultado = `🎁 Você pungou: **${item}**`;
                }

                await submit.update({ content: `✅ **Resultado (ND ${nd}):**\n${resultado}`, components: [] }).catch(() => {});

            } catch (err) {
                if (err.code === 10062 || err.code === 40060) return;
                console.error("Erro no comando punga:", err);
            }
        });
    }

    else if (command === 'gerar') {
        if (args.length < 1) return message.reply("Sintaxe: `!gerar <diversos|consumivel|pocao|arma|esoterico|melhoria|magico>`");
        
        const tipo = args[0].toLowerCase();
        let resultado = "";

        if (tipo === 'diversos') resultado = PungaSystem.diversos();
        else if (tipo === 'consumivel') resultado = PungaSystem.consumivel();
        else if (tipo === 'pocao') resultado = PungaSystem.pocao();
        else if (tipo === 'arma') resultado = PungaSystem.equipamentos(1)[0];
        else if (tipo === 'esoterico') resultado = PungaSystem.equipamentos(2)[0];
        
        else if (tipo === 'melhoria') {
            const cat = args[1] === 'eso' ? 2 : 1; 
            const qtd = parseInt(args[2]) || 1;
            resultado = PungaSystem.melhoria(cat, qtd);
        }
        else if (tipo === 'magico') {
            const cat = args[1] === 'acessorio' ? 2 : 1;
            const tier = parseInt(args[2]) || 1;
            resultado = PungaSystem.magico(cat, tier);
        }
        else {
            return message.reply("Categoria inválida.");
        }

        message.reply(`🎲 **Gerado:** ${resultado}`);
    }

    else if (command === 'criarmissao') {
        const regex = /"([^"]+)"\s+(\d+)\s+(\d+)/;
        const match = message.content.match(regex);

        if (!match) return message.reply('Sintaxe incorreta. Use: `!criarmissao "Nome da Missão" <ND> <Vagas>`\nEx: `!criarmissao "Resgate na Floresta" 2 4`');

        const nomeMissao = match[1];
        const nd = parseInt(match[2]);
        const vagas = parseInt(match[3]);

        try {
            await prisma.missoes.create({
                data: {
                    nome: nomeMissao,
                    nd: nd,
                    vagas: vagas,
                    criador_id: message.author.id,
                    status: 'ABERTA'
                }
            });
            message.reply(`✅ **Missão Criada!**\n📜 **${nomeMissao}** (ND ${nd})\n👥 Vagas: ${vagas}\n\nJogadores, usem \`!inscrever "${nomeMissao}"\` para participar!`);
        } catch (err) {
            if (err.code === 'P2002') return message.reply("Já existe uma missão com esse nome.");
            console.error(err);
            message.reply("Erro ao criar missão.");
        }
    }

    else if (command === 'inscrever') {
        const char = await getPersonagemAtivo(message.author.id);
        if (!char) return message.reply("Você não tem personagem ativo.");

        const nomeMissao = message.content.replace('!inscrever', '').trim().replace(/"/g, '');
        if (!nomeMissao) return message.reply('Use: `!inscrever "Nome da Missão"`');

        const missao = await prisma.missoes.findUnique({ where: { nome: nomeMissao } });
        if (!missao) return message.reply("Missão não encontrada.");
        if (missao.status !== 'ABERTA') return message.reply("Esta missão não está aceitando inscrições.");

        const nivelMin = missao.nd - 2;
        const nivelMax = missao.nd + 2;

        if (char.nivel_personagem < nivelMin || char.nivel_personagem > nivelMax) {
            return message.reply(`🚫 Nível incompatível! Seu nível (${char.nivel_personagem}) deve estar entre ${nivelMin} e ${nivelMax}.`);
        }

        try {
            await prisma.inscricoes.create({
                data: {
                    missao_id: missao.id,
                    personagem_id: char.id
                }
            });
            message.reply(`✅ **${char.nome}** se inscreveu em **${missao.nome}**!`);
        } catch (err) {
            if (err.code === 'P2002') return message.reply("Você já está inscrito nesta missão.");
            console.error(err);
        }
    }

    else if (command === 'painelmissao') {
        const { MessageFlags } = require('discord.js');
        const nomeMissao = message.content.replace('!painelmissao', '').trim().replace(/"/g, '');
        
        const missao = await prisma.missoes.findUnique({ 
            where: { nome: nomeMissao },
            include: { inscricoes: { include: { personagem: true }, orderBy: { id: 'asc' } } } 
        });

        if (!missao) return message.reply("Missão não encontrada.");
        if (missao.criador_id !== message.author.id && !message.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return message.reply("Apenas o Mestre criador pode gerenciar esta missão.");
        }

        const montarPainel = (m) => {
            const selecionados = m.inscricoes.filter(i => i.selecionado);
            const fila = m.inscricoes.filter(i => !i.selecionado);

            const txtSelecionados = selecionados.map(i => `✅ **${i.personagem.nome}** (Nvl ${i.personagem.nivel_personagem})`).join('\n') || "Ninguém selecionado.";
            const txtFila = fila.map((i, idx) => `⏳ ${idx + 1}º **${i.personagem.nome}**`).join('\n') || "Fila vazia.";
            
            const embed = new EmbedBuilder()
                .setColor(m.status === 'CONCLUIDA' ? '#00FF00' : '#FFA500')
                .setTitle(`🛡️ Gestão: ${m.nome}`)
                .setDescription(`**ND:** ${m.nd} | **Vagas:** ${m.vagas}\n**Status:** ${m.status}`)
                .addFields(
                    { name: `Equipe (${selecionados.length}/${m.vagas})`, value: txtSelecionados, inline: true },
                    { name: 'Fila de Espera', value: txtFila, inline: true }
                );

            return embed;
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ms_sortear').setLabel('Sortear Equipe').setStyle(ButtonStyle.Primary).setDisabled(missao.status !== 'ABERTA'),
            new ButtonBuilder().setCustomId('ms_gerenciar').setLabel('Substituir Jogador').setStyle(ButtonStyle.Secondary).setEmoji('👥').setDisabled(missao.status === 'CONCLUIDA'),
            new ButtonBuilder().setCustomId('ms_iniciar').setLabel('Iniciar').setStyle(ButtonStyle.Success).setDisabled(missao.status !== 'ABERTA'),
            new ButtonBuilder().setCustomId('ms_concluir').setLabel('Concluir Missão').setStyle(ButtonStyle.Danger).setDisabled(missao.status === 'CONCLUIDA'),
            new ButtonBuilder().setCustomId('ms_atualizar').setLabel('🔄').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.reply({ embeds: [montarPainel(missao)], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 3600000 });

        collector.on('collect', async i => {
            try {
                if (i.user.id !== message.author.id) return i.reply({ content: "Apenas o mestre.", flags: MessageFlags.Ephemeral });

                if (i.customId === 'ms_sortear') {
                    const mAtual = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: true } });
                    const vagasRestantes = mAtual.vagas - mAtual.inscricoes.filter(i => i.selecionado).length;
                    
                    if (vagasRestantes <= 0) return i.reply({ content: "Equipe já está cheia.", flags: MessageFlags.Ephemeral });

                    const candidatos = mAtual.inscricoes.filter(insc => !insc.selecionado);
                    if (candidatos.length === 0) return i.reply({ content: "Sem ninguém na fila para sortear.", flags: MessageFlags.Ephemeral });

                    const sorteados = candidatos.sort(() => 0.5 - Math.random()).slice(0, vagasRestantes);
                    
                    await prisma.inscricoes.updateMany({
                        where: { id: { in: sorteados.map(s => s.id) } },
                        data: { selecionado: true }
                    });

                    const mNova = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: { include: { personagem: true }, orderBy: { id: 'asc' } } } });
                    await i.update({ embeds: [montarPainel(mNova)] });
                }

                if (i.customId === 'ms_gerenciar') {
                    const mAtual = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: { include: { personagem: true } } } });
                    const selecionados = mAtual.inscricoes.filter(insc => insc.selecionado);

                    if (selecionados.length === 0) return i.reply({ content: "Ninguém na equipe para remover.", flags: MessageFlags.Ephemeral });

                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('menu_remover_jogador')
                        .setPlaceholder('Selecione quem VAI SAIR da missão');

                    selecionados.forEach(insc => {
                        menu.addOptions(new StringSelectMenuOptionBuilder()
                            .setLabel(insc.personagem.nome)
                            .setValue(insc.id.toString())
                            .setEmoji('❌')
                        );
                    });

                    const rowMenu = new ActionRowBuilder().addComponents(menu);
                    
                    const menuMsg = await i.reply({ content: "Quem deve ser removido? O próximo da fila entrará automaticamente.", components: [rowMenu], flags: MessageFlags.Ephemeral, withResponse: true });
                    
                    const menuCollector = menuMsg.resource.message.createMessageComponentCollector({ time: 60000 });
                    
                    menuCollector.on('collect', async iMenu => {
                        const idRemover = parseInt(iMenu.values[0]);
                        
                        await prisma.inscricoes.delete({ where: { id: idRemover } });

                        const proximoFila = await prisma.inscricoes.findFirst({
                            where: { missao_id: missao.id, selecionado: false },
                            orderBy: { id: 'asc' }
                        });

                        let textoSub = "Jogador removido.";
                        if (proximoFila) {
                            await prisma.inscricoes.update({
                                where: { id: proximoFila.id },
                                data: { selecionado: true }
                            });
                            textoSub += ` O próximo da fila entrou: **(ID ${proximoFila.personagem_id})**`;
                        }

                        const mFinal = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: { include: { personagem: true }, orderBy: { id: 'asc' } } } });
                        await msg.edit({ embeds: [montarPainel(mFinal)] });
                        
                        await iMenu.update({ content: `✅ ${textoSub}`, components: [] });
                    });
                }

                if (i.customId === 'ms_iniciar') {
                    await prisma.missoes.update({ where: { id: missao.id }, data: { status: 'EM_ANDAMENTO' } });
                    const mNova = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: { include: { personagem: true }, orderBy: { id: 'asc' } } } });
                    await i.update({ embeds: [montarPainel(mNova)], components: [row] });
                }

                if (i.customId === 'ms_concluir') {
                    const dmChar = await getPersonagemAtivo(missao.criador_id);

                    if (dmChar) {
                        const jaInscrito = await prisma.inscricoes.findFirst({
                            where: { 
                                missao_id: missao.id, 
                                personagem_id: dmChar.id 
                            }
                        });

                        if (!jaInscrito) {
                            await prisma.inscricoes.create({
                                data: {
                                    missao_id: missao.id,
                                    personagem_id: dmChar.id,
                                    selecionado: true, 
                                    recompensa_resgatada: false
                                }
                            });
                        } else {
                            if (!jaInscrito.selecionado) {
                                await prisma.inscricoes.update({
                                    where: { id: jaInscrito.id },
                                    data: { selecionado: true }
                                });
                            }
                        }
                    }

                    await prisma.missoes.update({ where: { id: missao.id }, data: { status: 'CONCLUIDA' } });
                    
                    const mNova = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: { include: { personagem: true }, orderBy: { id: 'asc' } } } });
                    
                    await i.update({ embeds: [montarPainel(mNova)], components: [row] });
                    await i.followUp(`🏆 **Missão Concluída!**\nJogadores e Mestre, utilizem \`!resgatar "${mNova.nome}"\` para pegar suas recompensas.`);
                }

                if (i.customId === 'ms_atualizar') {
                    const mNova = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: { include: { personagem: true }, orderBy: { id: 'asc' } } } });
                    await i.update({ embeds: [montarPainel(mNova)] });
                }

            } catch (err) {
                if (err.code !== 10062) console.error(err);
            }
        });
    }

    else if (command === 'resgatar') {
        const { MessageFlags } = require('discord.js');
        const char = await getPersonagemAtivo(message.author.id);
        if (!char) return message.reply("Sem personagem ativo.");

        const inscricoesPendentes = await prisma.inscricoes.findMany({
            where: {
                personagem_id: char.id,
                selecionado: true,
                recompensa_resgatada: false,
                missao: { status: 'CONCLUIDA' }
            },
            include: { missao: true }
        });

        if (inscricoesPendentes.length === 0) {
            return message.reply("🚫 Você não tem recompensas pendentes de missões concluídas.");
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_resgate_missao')
            .setPlaceholder('Selecione a missão para resgatar');

        inscricoesPendentes.forEach(insc => {
            menu.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(`${insc.missao.nome} (ND ${insc.missao.nd})`)
                .setDescription(`Recompensa estimada: T$ ${insc.missao.nd * 100}`)
                .setValue(`${insc.id}_${insc.missao.nd}`) 
            );
        });

        const row = new ActionRowBuilder().addComponents(menu);
        const msg = await message.reply({ content: "💰 **Recompensas Disponíveis:**", components: [row] });

        const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

        collector.on('collect', async i => {
            if (!i.isStringSelectMenu()) return;

            const [inscricaoId, ndStr] = i.values[0].split('_');
            const inscId = parseInt(inscricaoId);
            const nd = parseInt(ndStr);

            const modal = new ModalBuilder().setCustomId(`modal_pontos_${inscId}_${nd}`).setTitle('Relatório da Missão');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('inp_pontos')
                    .setLabel('Quantos Pontos de Missão você ganhou?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 1')
                    .setRequired(true)
            ));

            await i.showModal(modal);
        });

        const modalHandler = async (i) => {
            if (!i.isModalSubmit() || !i.customId.startsWith('modal_pontos_')) return;
            
            const parts = i.customId.split('_'); 
            const inscId = parseInt(parts[2]);
            const ndMissao = parseInt(parts[3]);
            
            const pontosGanhos = parseInt(i.fields.getTextInputValue('inp_pontos'));
            if (isNaN(pontosGanhos) || pontosGanhos < 0) return i.reply({ content: "Valor inválido.", flags: MessageFlags.Ephemeral });

            const ouroGanho = ndMissao * 100;

            const charAtual = await getPersonagemAtivo(i.user.id);
            
            let novosPontos = charAtual.pontos_missao + pontosGanhos;
            let novoNivel = charAtual.nivel_personagem;
            let msgUpar = "";
            
            const custoProx = CUSTO_NIVEL[novoNivel]; 
            
            if (custoProx && novosPontos >= custoProx) {
                novosPontos -= custoProx;
                novoNivel++;
                msgUpar = `\n⏫ **LEVEL UP!** Agora você é nível **${novoNivel}**!`;
            }

            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: charAtual.id },
                    data: {
                        saldo: { increment: ouroGanho },
                        pontos_missao: novosPontos,
                        nivel_personagem: novoNivel
                    }
                }),
                prisma.inscricoes.update({
                    where: { id: inscId },
                    data: { recompensa_resgatada: true }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: charAtual.id,
                        descricao: `Recompensa Missão (ND ${ndMissao})`,
                        valor: ouroGanho,
                        tipo: 'GANHO'
                    }
                })
            ]);

            await i.update({ 
                content: `✅ **Recompensa Resgatada!**\n💰 **Ouro:** +T$ ${ouroGanho}\n📈 **Pontos:** +${pontosGanhos} (Total: ${novosPontos})${msgUpar}`, 
                components: [] 
            });
        };

        client.on('interactionCreate', modalHandler);
        setTimeout(() => client.off('interactionCreate', modalHandler), 120000);
    }

    else if (command === 'feirinha') {
        const { MessageFlags } = require('discord.js');
        const char = await getPersonagemAtivo(message.author.id);
        if (!char) return message.reply("Você não tem personagem ativo.");

        const agora = new Date();
        const ultimaGeracao = char.feira_data_geracao ? new Date(char.feira_data_geracao) : new Date(0);
        const diffDias = (agora - ultimaGeracao) / (1000 * 60 * 60 * 24);

        let itensLoja = char.feira_itens || [];

        if (diffDias >= 7 || !itensLoja || itensLoja.length === 0) {
            const todosIngredientes = Object.keys(DB_CULINARIA.INGREDIENTES);
            const sorteados = [];
            
            for(let i=0; i<15; i++) {
                const nome = todosIngredientes[Math.floor(Math.random() * todosIngredientes.length)];
                sorteados.push({ nome: nome, preco: DB_CULINARIA.INGREDIENTES[nome] });
            }
            itensLoja = sorteados;
            
            await prisma.personagens.update({
                where: { id: char.id },
                data: { 
                    feira_itens: itensLoja, 
                    feira_data_geracao: agora 
                }
            });
        }

        const montarMenu = (lista) => {
            if (lista.length === 0) return null;
            
            const menu = new StringSelectMenuBuilder()
                .setCustomId('menu_comprar_ingrediente')
                .setPlaceholder(`🛒 Selecione um ingrediente (${lista.length} disponíveis)`);

            lista.forEach((item, index) => {
                menu.addOptions(new StringSelectMenuOptionBuilder()
                    .setLabel(`${item.nome} - T$ ${item.preco}`)
                    .setValue(`${index}_${item.nome}_${item.preco}`)
                    .setEmoji('🥬')
                );
            });
            return new ActionRowBuilder().addComponents(menu);
        };

        const estoque = char.estoque_ingredientes || {};
        const listaEstoque = Object.entries(estoque).map(([k, v]) => `${k}: ${v}`).join(', ') || "Vazio";
        
        const rowInicial = montarMenu(itensLoja);
        const componentsInicial = rowInicial ? [rowInicial] : [];
        const contentInicial = rowInicial 
            ? `🥦 **Feirinha da Semana** (Reseta em: ${7 - Math.floor(diffDias)} dias)\n💰 **Seu Saldo:** T$ ${char.saldo}\n🎒 **Seu Estoque:** ${listaEstoque}\n\n*Selecione abaixo para comprar:*`
            : `🥦 **Feirinha da Semana**\n🚫 **Estoque Esgotado!** Volte na próxima semana.`;

        const msg = await message.reply({ 
            content: contentInicial,
            components: componentsInicial
        });

        const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

        collector.on('collect', async i => {
            if (!i.isStringSelectMenu()) return;
            
            const charAtual = await getPersonagemAtivo(message.author.id);
            const listaAtual = charAtual.feira_itens || [];
            
            const [indexStr, nome, precoStr] = i.values[0].split('_');
            const index = parseInt(indexStr);
            const preco = parseFloat(precoStr);

            if (!listaAtual[index] || listaAtual[index].nome !== nome) {
                return i.reply({ content: "Este item já foi vendido ou a lista mudou.", flags: MessageFlags.Ephemeral });
            }

            if (charAtual.saldo < preco) {
                return i.reply({ content: "Dinheiro insuficiente!", flags: MessageFlags.Ephemeral });
            }

            const novoEstoque = charAtual.estoque_ingredientes || {};
            if (!novoEstoque[nome]) novoEstoque[nome] = 0;
            novoEstoque[nome] += 1;

            listaAtual.splice(index, 1);

            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: charAtual.id },
                    data: { 
                        saldo: { decrement: preco },
                        estoque_ingredientes: novoEstoque,
                        feira_itens: listaAtual
                    }
                }),
                prisma.transacao.create({
                    data: { personagem_id: charAtual.id, descricao: `Comprou ${nome}`, valor: preco, tipo: 'GASTO' }
                })
            ]);

            const novoRow = montarMenu(listaAtual);
            const novosComponents = novoRow ? [novoRow] : [];
            const novoConteudo = novoRow 
                ? `✅ Comprou **${nome}**!\n💰 **Saldo:** T$ ${charAtual.saldo - preco}\n🎒 **Estoque:** ${Object.entries(novoEstoque).map(([k,v])=>`${k}: ${v}`).join(', ')}\n\n*Continue comprando:*`
                : `✅ Comprou **${nome}**!\n🚫 **Estoque da Feirinha acabou!**`;

            await i.update({ 
                content: novoConteudo, 
                components: novosComponents 
            });
        });
    }

    else if (command === 'aprenderculinaria') {
        const char = await getPersonagemAtivo(message.author.id);
        if (!char) return message.reply("Sem personagem.");

        const limiteReceitas = Math.max(1, char.inteligencia);
        
        const conhecidas = char.receitas_conhecidas || [];

        if (conhecidas.length >= limiteReceitas) {
            return message.reply(`🚫 **Limite atingido!** Você tem Inteligência ${char.inteligencia} e já conhece ${conhecidas.length} receitas.\nAumente sua Inteligência para aprender mais.`);
        }

        const todasReceitas = Object.keys(DB_CULINARIA.RECEITAS);
        const disponiveis = todasReceitas.filter(r => !conhecidas.includes(r));

        if (disponiveis.length === 0) return message.reply("Você já conhece todas as receitas!");

        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_aprender_receita')
            .setPlaceholder(`Aprender Receita (${conhecidas.length}/${limiteReceitas})`);

        disponiveis.slice(0, 25).forEach(nome => {
            menu.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(nome)
                .setDescription(DB_CULINARIA.RECEITAS[nome].desc)
                .setValue(nome)
            );
        });

        const msg = await message.reply({ 
            content: `📚 **Livro de Receitas**\nVocê pode aprender mais **${limiteReceitas - conhecidas.length}** receitas.`,
            components: [new ActionRowBuilder().addComponents(menu)]
        });

        const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

        collector.on('collect', async i => {
            const receitaEscolhida = i.values[0];
            const charUp = await getPersonagemAtivo(message.author.id); 
            
            const receitasAtuais = charUp.receitas_conhecidas || [];

            if (receitasAtuais.length >= Math.max(1, charUp.inteligencia)) {
                return i.reply({ content: "Limite atingido.", flags: require('discord.js').MessageFlags.Ephemeral });
            }

            const novasConhecidas = [...receitasAtuais, receitaEscolhida];

            await prisma.personagens.update({
                where: { id: charUp.id },
                data: { receitas_conhecidas: novasConhecidas }
            });

            await i.update({ content: `✅ **Você aprendeu a fazer: ${receitaEscolhida}!**`, components: [] });
        });
    }

    else if (command === 'cozinhar') {
        const { MessageFlags } = require('discord.js');
        const char = await getPersonagemAtivo(message.author.id);
        
        const receitasConhecidas = char ? (char.receitas_conhecidas || []) : [];

        if (!char || receitasConhecidas.length === 0) return message.reply("Você não conhece nenhuma receita.");

        const montarMenuReceitas = () => {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('menu_selecionar_receita')
                .setPlaceholder('🍳 Escolha o prato');

            receitasConhecidas.forEach(nome => {
                const r = DB_CULINARIA.RECEITAS[nome];
                const ingDesc = Object.entries(r.ing).map(([k,v]) => `${k} x${v}`).join(', ');
                menu.addOptions(new StringSelectMenuOptionBuilder()
                    .setLabel(nome)
                    .setDescription(`CD ${r.cd} | Ing: ${ingDesc.substring(0, 50)}...`)
                    .setValue(nome)
                );
            });
            return new ActionRowBuilder().addComponents(menu);
        };

        const msg = await message.reply({ 
            content: `🔥 **Fogão Aceso (Rende 5 Porções)**\n👤 **Cozinheiro:** ${char.nome}\n🔨 **Pontos de Forja:** ${char.pontos_forja_atual.toFixed(1)}\n🎒 **Estoque:** ${Object.entries(char.estoque_ingredientes || {}).map(([k,v])=>`${k}: ${v}`).join(', ')}`,
            components: [montarMenuReceitas()]
        });

        const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });

        let receitaSelecionada = null;

        collector.on('collect', async i => {
            const charAtual = await getPersonagemAtivo(message.author.id);
            const estoque = charAtual.estoque_ingredientes || {};

            if (i.isStringSelectMenu() && i.customId === 'menu_selecionar_receita') {
                receitaSelecionada = i.values[0];
                const r = DB_CULINARIA.RECEITAS[receitaSelecionada];
                
                let temIngredientes = true;
                let faltantes = [];
                for (const [ing, qtd] of Object.entries(r.ing)) {
                    if (!estoque[ing] || estoque[ing] < qtd) {
                        temIngredientes = false;
                        faltantes.push(`${ing} (${estoque[ing]||0}/${qtd})`);
                    }
                }

                if (!temIngredientes) {
                    return i.reply({ content: `🚫 **Faltam ingredientes:** ${faltantes.join(', ')}`, flags: MessageFlags.Ephemeral });
                }

                if (charAtual.pontos_forja_atual < 1.0) {
                    return i.reply({ content: `🚫 **Pontos de Forja insuficientes!** Custo Base: 1.0 pts. Você tem ${charAtual.pontos_forja_atual.toFixed(1)}.`, flags: MessageFlags.Ephemeral });
                }

                const temEspeciarias = (estoque['Especiarias'] || 0) >= 1;
                const podeEspecial = temEspeciarias && charAtual.pontos_forja_atual >= 2.0;

                const botoes = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_cozinhar_padrao').setLabel('Cozinhar (1 Pts)').setStyle(ButtonStyle.Success).setEmoji('🍲'),
                    new ButtonBuilder().setCustomId('btn_cozinhar_especial').setLabel('Com Especiarias (2 Pts)').setStyle(ButtonStyle.Primary).setEmoji('✨').setDisabled(!podeEspecial),
                    new ButtonBuilder().setCustomId('btn_cancelar_cozinha').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
                );

                await i.update({ 
                    content: `🥘 **Preparando: ${receitaSelecionada}**\n📦 **Rendimento:** 5 Porções\n\n🔹 **Padrão:** Custa 1.0 Pts\n✨ **Especial:** Custa 2.0 Pts + 1 Especiaria`,
                    components: [botoes] 
                });
            }

            if (i.isButton()) {
                if (i.customId === 'btn_cancelar_cozinha') {
                    await i.update({ content: "❌ Culinária cancelada.", components: [montarMenuReceitas()] });
                    return;
                }

                if (!receitaSelecionada) return i.reply({ content: "Nenhuma receita selecionada.", flags: MessageFlags.Ephemeral });

                const usarEspeciarias = i.customId === 'btn_cozinhar_especial';
                const custoPts = usarEspeciarias ? 2.0 : 1.0;
                const receita = DB_CULINARIA.RECEITAS[receitaSelecionada];

                if (charAtual.pontos_forja_atual < custoPts) return i.reply({ content: `Pontos de forja insuficientes (Precisa de ${custoPts}).`, flags: MessageFlags.Ephemeral });
                if (usarEspeciarias && (!estoque['Especiarias'] || estoque['Especiarias'] < 1)) return i.reply({ content: "Sem especiarias.", flags: MessageFlags.Ephemeral });

                for (const [ing, qtd] of Object.entries(receita.ing)) {
                    estoque[ing] -= qtd;
                    if (estoque[ing] <= 0) delete estoque[ing];
                }

                if (usarEspeciarias) {
                    estoque['Especiarias'] -= 1;
                    if (estoque['Especiarias'] <= 0) delete estoque['Especiarias'];
                }

                await prisma.personagens.update({
                    where: { id: charAtual.id },
                    data: { 
                        estoque_ingredientes: estoque,
                        pontos_forja_atual: { decrement: custoPts }
                    }
                });

                const descLog = usarEspeciarias 
                    ? `Cozinhou ${receitaSelecionada} x5 (Com Especiarias) - Gasto: ${custoPts} pts` 
                    : `Cozinhou ${receitaSelecionada} x5 - Gasto: ${custoPts} pts`;

                await prisma.transacao.create({
                    data: { 
                        personagem_id: charAtual.id, 
                        descricao: descLog, 
                        valor: 0, 
                        tipo: 'GASTO'
                    }
                });

                const msgSucesso = usarEspeciarias
                    ? `✨ **Prato Gourmet Pronto! (5 Porções)**\nVocê fez **${receitaSelecionada}** com um toque especial.\n*Efeito:* ${receita.desc} (Aprimorado)`
                    : `🍲 **Prato Pronto! (5 Porções)**\nVocê fez **${receitaSelecionada}**.\n*Efeito:* ${receita.desc}`;

                await i.update({ 
                    content: `${msgSucesso}\n\n🔨 **Restante:** ${Object.entries(estoque).map(([k,v])=>`${k}: ${v}`).join(', ')} | Pts: ${(charAtual.pontos_forja_atual - custoPts).toFixed(1)}`,
                    components: [montarMenuReceitas()] 
                });
            }
        });
    }

    else if (command === 'apostar') {
        const char = await getPersonagemAtivo(message.author.id);
        if (!char) return message.reply("Você não tem personagem ativo.");

        const args = message.content.split(' ').slice(1);
        if (args.length < 4) return message.reply("Use: `!apostar <valor> <dezena/centena/milhar> <numero> <1-5 ou todas>`");

        const valor = parseFloat(args[0]);
        const tipo = args[1].toUpperCase();
        let numero = args[2];
        const posicaoInput = args[3].toLowerCase();

        if (isNaN(valor) || valor <= 0) return message.reply("Valor inválido.");
        if (char.saldo < valor) return message.reply("Saldo insuficiente.");

        if (tipo === 'DEZENA') {
            if (numero.length > 2) return message.reply("Para Dezena use apenas 2 dígitos (00-99).");
            numero = numero.padStart(2, '0'); 
            if (!BICHOS_T20[numero]) return message.reply("Bicho inválido (00-99).");
        } else if (tipo === 'CENTENA') {
            if (numero.length > 3) return message.reply("Para Centena use até 3 dígitos.");
            numero = numero.padStart(3, '0');
        } else if (tipo === 'MILHAR') {
            if (numero.length > 4) return message.reply("Para Milhar use até 4 dígitos.");
            numero = numero.padStart(4, '0');
        } else {
            return message.reply("Tipo inválido. Use: DEZENA, CENTENA ou MILHAR.");
        }

        let posicaoBanco = "";
        if (['1', '2', '3', '4', '5'].includes(posicaoInput)) posicaoBanco = posicaoInput;
        else if (['todas', 'todos', '1-5'].includes(posicaoInput)) posicaoBanco = "TODAS";
        else return message.reply("Posição inválida. Use um número de 1 a 5, ou 'todas'.");

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: char.id },
                data: { saldo: { decrement: valor } }
            }),
            prisma.apostasBicho.create({
                data: {
                    personagem_id: char.id,
                    tipo: tipo,
                    numero: numero,
                    posicao: posicaoBanco,
                    valor: valor,
                    status: 'PENDENTE'
                }
            }),
            prisma.transacao.create({
                data: { personagem_id: char.id, descricao: `Jogo do Bicho: ${tipo} ${numero}`, valor: valor, tipo: 'GASTO' }
            })
        ]);

        const nomeBicho = tipo === 'DEZENA' ? `(${BICHOS_T20[numero]})` : '';
        message.reply(`🎫 **Aposta Registrada!**\n💰 Valor: T$ ${valor}\n🎲 Jogo: ${tipo} **${numero}** ${nomeBicho}\n📍 Posição: ${posicaoBanco === 'TODAS' ? '1º ao 5º' : posicaoBanco + 'º Prêmio'}`);
    }

    else if (command === 'sortearbicho') {
        //if (!message.member.roles.cache.has(ID_CARGO_ADMIN)) return message.reply("Apenas a banca (Admin) pode rodar a roleta.");

        const ultimoSorteio = await prisma.sorteiosBicho.findFirst({ orderBy: { data: 'desc' } });
        if (ultimoSorteio) {
            const diffDias = (new Date() - new Date(ultimoSorteio.data)) / (1000 * 60 * 60 * 24);
            if (diffDias < 7) return message.reply(`⏳ O sorteio é semanal! Faltam ${(7 - diffDias).toFixed(1)} dias.`);
        }

        const resultados = [];
        for (let i = 0; i < 5; i++) {
            const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            resultados.push(num);
        }

        const apostas = await prisma.apostasBicho.findMany({
            where: { status: 'PENDENTE' },
            include: { personagem: true }
        });

        let ganhadoresLog = [];
        const updates = [];

        for (const aposta of apostas) {
            let ganhou = false;
            let multiplicador = 0;

            if (aposta.tipo === 'DEZENA') multiplicador = 2;
            if (aposta.tipo === 'CENTENA') multiplicador = 5;
            if (aposta.tipo === 'MILHAR') multiplicador = 10;

            if (aposta.posicao === 'TODAS') multiplicador = multiplicador / 5;

            const verificarNumero = (resultadoSorteado, apostaNum, tipo) => {
                if (tipo === 'DEZENA') return resultadoSorteado.endsWith(apostaNum); 
                if (tipo === 'CENTENA') return resultadoSorteado.endsWith(apostaNum);
                if (tipo === 'MILHAR') return resultadoSorteado === apostaNum;
                return false;
            };

            resultados.forEach((res, index) => {
                const posicaoAtual = (index + 1).toString();
                
                if (aposta.posicao === posicaoAtual || aposta.posicao === 'TODAS') {
                    if (verificarNumero(res, aposta.numero, aposta.tipo)) {
                        ganhou = true;
                    }
                }
            });

            if (ganhou) {
                const premio = aposta.valor * multiplicador;
                ganhadoresLog.push(`🏆 **${aposta.personagem.nome}** ganhou **T$ ${premio}** (${aposta.tipo} ${aposta.numero})`);
                
                updates.push(prisma.personagens.update({
                    where: { id: aposta.personagem_id },
                    data: { saldo: { increment: premio } }
                }));
                updates.push(prisma.transacao.create({
                    data: { personagem_id: aposta.personagem_id, descricao: `Prêmio Bicho (${aposta.numero})`, valor: premio, tipo: 'GANHO' }
                }));
                updates.push(prisma.apostasBicho.update({ where: { id: aposta.id }, data: { status: 'GANHOU' } }));
            } else {
                updates.push(prisma.apostasBicho.update({ where: { id: aposta.id }, data: { status: 'PERDEU' } }));
            }
        }

        updates.push(prisma.sorteiosBicho.create({ data: { resultados: resultados } }));

        await prisma.$transaction(updates);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎲 Resultado do Jogo do Bicho')
            .setDescription('O resultado da semana saiu! Confira os números:')
            .addFields(
                { name: '1º Prêmio', value: `${resultados[0]} - **${BICHOS_T20[resultados[0].slice(-2)]}**` },
                { name: '2º Prêmio', value: `${resultados[1]} - **${BICHOS_T20[resultados[1].slice(-2)]}**` },
                { name: '3º Prêmio', value: `${resultados[2]} - **${BICHOS_T20[resultados[2].slice(-2)]}**` },
                { name: '4º Prêmio', value: `${resultados[3]} - **${BICHOS_T20[resultados[3].slice(-2)]}**` },
                { name: '5º Prêmio', value: `${resultados[4]} - **${BICHOS_T20[resultados[4].slice(-2)]}**` },
            );

        if (ganhadoresLog.length > 0) {
            const textoGanhadores = ganhadoresLog.slice(0, 20).join('\n') + (ganhadoresLog.length > 20 ? `\n...e mais ${ganhadoresLog.length - 20}.` : '');
            embed.addFields({ name: '🎉 Ganhadores', value: textoGanhadores });
        } else {
            embed.setFooter({ text: 'Nenhum ganhador nesta rodada. A banca agradece!' });
        }

        message.channel.send({ embeds: [embed] });
    }

    else if (command === 'drop') {

        const ndInput = args[0];
        if (!ndInput) return message.reply("Use: `!drop <ND>`");

        const resultado = gerarRecompensa(ndInput);
        let footerTexto = 'Sistema de Recompensa T20 JDA';
        let corEmbed = '#9B59B6'; 

        if (resultado.valor > 0) {
            const char = await getPersonagemAtivo(message.author.id);
            
            if (char) {
                await prisma.$transaction([
                    prisma.personagens.update({
                        where: { id: char.id },
                        data: { saldo: { increment: resultado.valor } }
                    }),
                    prisma.transacao.create({
                        data: {
                            personagem_id: char.id,
                            descricao: `Drop ND ${ndInput}`,
                            valor: resultado.valor,
                            tipo: 'GANHO'
                        }
                    })
                ]);
                
                footerTexto = `✅ T$ ${resultado.valor} creditados para ${char.nome}`;
                corEmbed = '#F1C40F'; 
            } else {
                footerTexto = '⚠️ Nenhum personagem ativo para receber o dinheiro.';
            }
        }

        const embed = new EmbedBuilder()
            .setColor(corEmbed)
            .setTitle(`🎁 Drop Gerado (ND ${ndInput})`)
            .setDescription(resultado.mensagem)
            .setFooter({ text: footerTexto });

        message.reply({ embeds: [embed] });
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