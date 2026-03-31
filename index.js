require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { Player } = require('discord-player');

const prisma = require("./database.js");
const PungaSystem = require("./punga_sistema.js");
const { gerarRecompensa } = require("./sistema_drop.js");
const startKeepAlive = require("./utils/keepAlive.js");

const helpers = require("./utils/helpers.js");
const geralData = require("./data/geralData.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const player = new Player(client);

client.commands = new Collection();

player.extractors.loadDefault().then(() => {
    console.log("🎵 Extratores de música carregados com sucesso!");
});

process.on("unhandledRejection", reason => console.error("Unhandled Rejection:", reason));
process.on("uncaughtException", err => console.error("Uncaught Exception:", err));
client.on("error", console.error);
client.on("shardError", console.error);

client.once("ready", () => {
    console.log(`✅ Logado com sucesso como ${client.user.tag}!`);
});

const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[AVISO] O comando ${file} não possui "data" ou "execute".`);
        }
    }
}

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute({
            interaction,
            client,
            prisma,
            PungaSystem,
            gerarRecompensa,
            ...helpers,
            ...geralData
        });
    } catch (err) {
        console.error(`Erro crítico no comando ${interaction.commandName}:`, err);
        const erroMsg = { content: "🚨 Ocorreu um erro interno ao executar este comando!", flags: 64 };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(erroMsg).catch(() => {});
        } else {
            await interaction.reply(erroMsg).catch(() => {});
        }
    }
});

startKeepAlive();
client.login(process.env.DISCORD_TOKEN);
