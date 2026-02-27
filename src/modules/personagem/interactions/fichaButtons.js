const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

const {
  getPersonagemAtivo,
  getPersonagemCompleto
} = require('../services/personagemService');

const { montarEmbedFicha } =
  require('../services/fichaService');

const { processarDescanso } =
  require('../services/descansoService');

const requirePersonagem =
  require('../../../shared/middleware/requirePersonagem');  

module.exports = {
  match(interaction) {
    return interaction.isButton() &&
      interaction.customId.startsWith('ficha_');
  },

  async execute(interaction) {

    const ativo = await requirePersonagem(interaction);
    if (!ativo) return;

    if (interaction.customId === 'ficha_status') {

      const modal = new ModalBuilder()
        .setCustomId('modal_status')
        .setTitle('Editar Status');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('vida')
            .setLabel('Vida Atual/Máxima (ex: 20/30)')
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('mana')
            .setLabel('Mana Atual/Máxima')
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === 'ficha_descanso') {

      const resultado = await processarDescanso(ativo);

      if (resultado.erro)
        return interaction.reply({
          content: resultado.mensagem,
          ephemeral: true
        });

      const personagemAtualizado =
        await getPersonagemCompleto(ativo.id);

      const embed =
        montarEmbedFicha(personagemAtualizado, EmbedBuilder);

      return interaction.update({
        embeds: [embed]
      });
    }
  }
};