const { executarTransacao } =
  require('../services/transacaoService');

const { buscarAtivo } =
  require('../../personagem/services/personagemService');

module.exports = {
  name: 'gastar',

  async execute(message, args) {

    const valor = parseFloat(args[0]);
    const motivo = args.slice(1).join(' ');

    if (!valor || valor <= 0)
      return message.reply("Valor inválido.");

    const user =
      await buscarAtivo(message.author.id);

    if (!user?.personagemAtivo)
      return message.reply("Sem personagem.");

    await executarTransacao({
      personagemId: user.personagemAtivo.id,
      valor: -valor,
      tipo: "SAIDA",
      descricao: motivo,
      categoria: "MANUAL"
    });

    message.reply("Gasto registrado.");
  }
};