const { getPersonagemAtivo } = require('../../personagem/services/personagemService');
const { configurarForja } = require('../services/forjaService');

module.exports = {
  name: 'setforja',

  async execute(message, args) {
    const poderes = parseInt(args[0]);

    if (isNaN(poderes) || poderes < 0)
      return message.reply("Uso correto: !setforja <quantidade>");

    const char = await getPersonagemAtivo(message.author.id);
    if (!char) return message.reply("Sem personagem.");

    const resultado = await configurarForja(char, poderes);

    message.reply(
      `⚒️ Forja atualizada!\n` +
      `Ofícios: ${resultado.quantidadeOficios}\n` +
      `Limite: ${resultado.limite}`
    );
  }
};