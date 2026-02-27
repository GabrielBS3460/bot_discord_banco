const fs = require('fs');
const path = require('path');
const { checkCooldown } =
  require('../shared/cooldown/cooldownManager');

const prefix = '!';
const commands = new Map();

function loadCommands() {
  const modulesPath = path.join(__dirname, '../modules');
  const modules = fs.readdirSync(modulesPath);

  for (const moduleName of modules) {
    const commandsPath =
      path.join(modulesPath, moduleName, 'commands');

    if (!fs.existsSync(commandsPath)) continue;

    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
      const command =
        require(path.join(commandsPath, file));

      commands.set(command.name, command);
    }
  }
}

loadCommands();

module.exports = async (message) => {

  if (!message.content.startsWith(prefix) ||
      message.author.bot) return;

  const args =
    message.content.slice(prefix.length)
      .trim()
      .split(/ +/);

  const commandName =
    args.shift().toLowerCase();

  const command = commands.get(commandName);
  if (!command) return;

  const cooldownDuration =
    (command.cooldown || 3) * 1000;

  const remaining =
    checkCooldown(commandName,
      message.author.id,
      cooldownDuration);

  if (remaining) {
    return message.reply(
      `⏳ Aguarde ${remaining}s antes de usar novamente.`
    );
  }

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(err);
    message.reply("Erro ao executar comando.");
  }
};