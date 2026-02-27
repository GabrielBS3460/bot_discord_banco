const fs = require('fs');
const path = require('path');

const interactions = [];

const { checkCooldown } =
  require('../shared/cooldown/cooldownManager');

function loadInteractions() {
  const modulesPath = path.join(__dirname, '../modules');
  const modules = fs.readdirSync(modulesPath);

  for (const moduleName of modules) {
    const interactionsPath = path.join(modulesPath, moduleName, 'interactions');
    if (!fs.existsSync(interactionsPath)) continue;

    const files = fs.readdirSync(interactionsPath);

    for (const file of files) {
      const interaction = require(path.join(interactionsPath, file));
      interactions.push(interaction);
    }
  }
}

loadInteractions();

module.exports = async (interaction) => {

  const key = interaction.customId || interaction.commandName;

  const remaining =
    checkCooldown(
      key,
      interaction.user.id,
      2000 // 2 segundos padrão
    );

  if (remaining)
    return interaction.reply({
      content: `⏳ Aguarde ${remaining}s.`,
      ephemeral: true
    });

  for (const handler of interactions) {
    if (handler.match(interaction)) {
      return handler.execute(interaction);
    }
  }
};