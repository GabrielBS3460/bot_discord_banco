require('dotenv').config();

const fs = require("fs");
const path = require("path");

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

const ID_CARGO_MOD = '1462994696921157652';

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

const CUSTO_NIVEL = {
    3: 4, 4: 5,
    5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
    11: 10, 12: 10, 13: 10, 14: 10, 15: 10, 16: 10
};


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
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', 'K$');
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

client.commands = new Map();

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    process.exit(1);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

client.on("error", console.error);
client.on("shardError", console.error);
client.on("disconnect", () => {
    console.log("Bot desconectado.");
    process.exit(1);
});

client.once('ready', () => {
    console.log(`Logado como ${client.user.tag}!`);
});

const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {

    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        const command = require(path.join(folderPath, file));

        if (command.name) {
            client.commands.set(command.name, command);
        }

    }
}

client.on('messageCreate', async (message) => {

    try {

        if (!message) return;
        if (!message.content) return;
        if (message.author?.bot) return;
        if (!message.guild) return;

        const prefix = "!";

        if (!message.content.startsWith(prefix)) return;

        const args = message.content
            .slice(prefix.length)
            .trim()
            .split(/\s+/);

        const command = args.shift()?.toLowerCase();

        if (!command) return;

        const cmd = client.commands.get(command);

        if (!cmd) return;

        try {

            await cmd.execute({
                message,
                args,
                prisma,
                client,
                getPersonagemAtivo,
                formatarMoeda,
                verificarLimiteMestre,
                calcularNivelEPatamar,
                gerarRecompensa,
                PungaSystem,
                DB_CULINARIA,
                CUSTO_FORJA,
                BICHOS_T20,
                ID_CARGO_ADMIN,
                ID_CARGO_MOD,
                CUSTO_NIVEL
            });

        } catch (err) {

            console.error(`Erro no comando ${command}:`, err);

            message.reply("Ocorreu um erro ao executar este comando.").catch(()=>{});
        }

    } catch (err) {
        console.error("Erro no messageCreate:", err);
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