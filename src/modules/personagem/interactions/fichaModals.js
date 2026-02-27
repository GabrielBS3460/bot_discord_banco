const prisma = require('../../../shared/database/prisma');
const {
  getPersonagemAtivo,
  getPersonagemCompleto
} = require('../services/personagemService');

const { montarEmbedFicha } =
  require('../services/fichaService');

const requirePersonagem =
  require('../../../shared/middleware/requirePersonagem');

const { EmbedBuilder } = require('discord.js');

module.exports = {
  match(interaction) {
    return interaction.isModalSubmit() &&
      interaction.customId === 'modal_status';
  },

  async execute(interaction) {

    const ativo = await requirePersonagem(interaction);
    if (!ativo) return;

    const [vAtual, vMax] =
      interaction.fields.getTextInputValue('vida')
        .split('/')
        .map(Number);

    const [mAtual, mMax] =
      interaction.fields.getTextInputValue('mana')
        .split('/')
        .map(Number);

    await prisma.personagens.update({
      where: { id: ativo.id },
      data: {
        vida_atual: vAtual,
        vida_max: vMax,
        mana_atual: mAtual,
        mana_max: mMax
      }
    });

    const atualizado =
      await getPersonagemCompleto(ativo.id);

    const embed =
      montarEmbedFicha(atualizado, EmbedBuilder);

    await interaction.update({
      embeds: [embed]
    });
  }
};