const { transferir } =
  require('../services/transferenciaService');

const { buscarAtivo } =
  require('../../personagem/services/personagemService');

module.exports = {
  name: 'pagar',

  async execute(message, args) {

    const userMention =
      message.mentions.users.first();

    const valor = parseFloat(args[1]);

    if (!userMention || !valor)
      return message.reply("Uso: !pagar @user valor");

    const remetente =
      await buscarAtivo(message.author.id);

    const destinatario =
      await buscarAtivo(userMention.id);

    if (!remetente?.personagemAtivo ||
        !destinatario?.personagemAtivo)
      return message.reply("Personagem inválido.");

    await transferir(
      remetente.personagemAtivo.id,
      destinatario.personagemAtivo.id,
      valor
    );

    message.reply("Transferência concluída.");
  }
};