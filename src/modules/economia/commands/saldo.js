const { buscarAtivo } =
  require('../../personagem/services/personagemService');

module.exports = {
  name: 'saldo',
  cooldown: 3,

  async execute(message) {

    const user =
      await buscarAtivo(message.author.id);

    if (!user?.personagemAtivo)
      return message.reply("Sem personagem ativo.");

    message.reply(
      `💰 Saldo: ${user.personagemAtivo.saldo}`
    );
  }
};