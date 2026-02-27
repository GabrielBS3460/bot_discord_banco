const {
  listarPersonagens,
  trocarPersonagem
} = require('../services/personagemService');

module.exports = {
  name: 'trocar',

  async execute(message, args) {

    const nome = args.join(' ');
    const lista =
      await listarPersonagens(message.author.id);

    const personagem =
      lista.find(p => p.nome === nome);

    if (!personagem)
      return message.reply("Não encontrado.");

    await trocarPersonagem(
      message.author.id,
      personagem.id
    );

    message.reply("Personagem ativo alterado.");
  }
};