const { criarPersonagem } =
  require('../services/personagemService');

module.exports = {
  name: 'criar',

  async execute(message, args) {

    const nome = args.join(' ');
    if (!nome) return message.reply("Informe o nome.");

    await criarPersonagem(message.author.id, nome);

    message.reply(`Personagem ${nome} criado.`);
  }
};