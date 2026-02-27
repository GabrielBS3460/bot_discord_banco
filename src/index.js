require('dotenv').config();

const client = require('./client');
const commandHandler = require('./handlers/commandHandler');
const interactionHandler = require('./handlers/interactionHandler');

client.once('ready', () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.on('messageCreate', commandHandler);
client.on('interactionCreate', interactionHandler);

client.login(process.env.DISCORD_TOKEN);