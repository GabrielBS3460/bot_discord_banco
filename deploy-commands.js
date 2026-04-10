require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if ("data" in command && "execute" in command) {
            commands.push(command.data.toJSON());
        }
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    const nomesComandos = commands.map(cmd => cmd.name);
    const duplicados = nomesComandos.filter((item, index) => nomesComandos.indexOf(item) !== index);

    if (duplicados.length > 0) {
        console.error("🚨 ALERTA VERMELHO: O deploy foi cancelado porque há nomes duplicados!");
        console.error(`Os comandos duplicados são: [ ${[...new Set(duplicados)].join(", ")} ]`);
        console.error(
            "Dica: Verifique se você não esqueceu de alterar o .setName() em algum arquivo copiado ou se há arquivos de backup perdidos nas pastas."
        );
        process.exit(1);
    }

    try {
        console.log(`⏳ Iniciando o registro de ${commands.length} Slash Commands...`);

        const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

        console.log(`✅ Sucesso! ${data.length} Slash Commands foram registrados.`);
    } catch (error) {
        console.error(error);
    }
})();
