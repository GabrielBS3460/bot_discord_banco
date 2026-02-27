const { atualizarAtributo } =
  require('../services/fichaService');

module.exports = {
  name: 'editar',

  async execute(message, args) {

    const campo = args[0];
    const valor = parseInt(args[1]);

    const user =
      await require('../services/personagemService')
      .buscarAtivo(message.author.id);

    if (!user?.personagemAtivo)
      return message.reply("Sem personagem.");

    await atualizarAtributo(
      user.personagemAtivo.id,
      campo,
      valor
    );

    message.reply("Atualizado.");
  }
};