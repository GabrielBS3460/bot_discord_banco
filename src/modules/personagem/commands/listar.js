const {
  listarPersonagens
} = require('../services/personagemService');

module.exports = {
  name: 'personagens',

  async execute(message) {

    const lista =
      await listarPersonagens(message.author.id);

    if (!lista.length)
      return message.reply("Nenhum personagem.");

    const texto =
      lista.map(p => `• ${p.nome}`).join('\n');

    message.reply(texto);
  }
};