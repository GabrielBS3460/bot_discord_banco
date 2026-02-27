const { buscarAtivo } =
  require('../services/personagemService');

const { formatarFicha } =
  require('../utils/fichaFormatter');

module.exports = {
  name: 'ficha',
  cooldown: 5,

  async execute(message) {

    const user =
      await buscarAtivo(message.author.id);

    if (!user?.personagemAtivo)
      return message.reply("Sem personagem ativo.");

    const embed =
      formatarFicha(user.personagemAtivo);

    message.reply({ embeds: [embed] });
  }
};