const { descansar } =
  require('../services/descansoService');

module.exports = {
  name: 'descansar',

  async execute(message) {

    const user =
      await require('../services/personagemService')
      .buscarAtivo(message.author.id);

    if (!user?.personagemAtivo)
      return message.reply("Sem personagem.");

    await descansar(user.personagemAtivo.id);

    message.reply("Descanso realizado.");
  }
};