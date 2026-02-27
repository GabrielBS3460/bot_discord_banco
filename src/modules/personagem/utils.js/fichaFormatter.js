const { EmbedBuilder } = require('discord.js');

function formatarFicha(p) {

  return new EmbedBuilder()
    .setTitle(`Ficha - ${p.nome}`)
    .addFields(
      { name: "Vida",
        value: `${p.vida_atual}/${p.vida_max}` },
      { name: "Mana",
        value: `${p.mana_atual}/${p.mana_max}` },
      { name: "Força",
        value: String(p.forca), inline: true },
      { name: "Destreza",
        value: String(p.destreza), inline: true },
      { name: "Inteligência",
        value: String(p.inteligencia), inline: true }
    );
}

module.exports = { formatarFicha };