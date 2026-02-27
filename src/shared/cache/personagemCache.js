const cache = new Map();

function get(discordId) {
  return cache.get(discordId);
}

function set(discordId, personagem) {
  cache.set(discordId, personagem);
}

function clear(discordId) {
  cache.delete(discordId);
}

module.exports = {
  get,
  set,
  clear
};