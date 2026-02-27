const { obterExtrato } =
  require('../services/extratoService');

const { buscarAtivo } =
  require('../../personagem/services/personagemService');

module.exports = {
  name: 'extrato',
  cooldown: 5,

  async execute(message) {

    const user =
      await buscarAtivo(message.author.id);

    if (!user?.personagemAtivo)
      return message.reply("Sem personagem.");

    const lista =
      await obterExtrato(user.personagemAtivo.id);

    if (!lista.length)
      return message.reply("Sem transações.");

    const texto = lista.map(t =>
      `${t.tipo === "SAIDA" ? "-" : "+"}${t.valor} | ${t.descricao}`
    ).join('\n');

    message.reply(texto);
  }
};