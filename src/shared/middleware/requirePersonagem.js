const { getPersonagemAtivo } =
  require('../../modules/personagem/services/personagemService');

async function requirePersonagem(messageOrInteraction) {

  const discordId =
    messageOrInteraction.user?.id ||
    messageOrInteraction.author?.id;

  const personagem = await getPersonagemAtivo(discordId);

  if (!personagem) {

    if (messageOrInteraction.reply)
      await messageOrInteraction.reply({
        content: "Você não tem personagem ativo.",
        ephemeral: true
      });

    return null;
  }

  return personagem;
}

module.exports = requirePersonagem;