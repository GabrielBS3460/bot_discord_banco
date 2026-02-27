const cooldowns = new Map();

/*
  key format:
  commandName:userId
*/

function checkCooldown(commandName, userId, duration) {

  const key = `${commandName}:${userId}`;
  const now = Date.now();

  if (!cooldowns.has(key)) {
    cooldowns.set(key, now);
    return null;
  }

  const expirationTime = cooldowns.get(key) + duration;

  if (now < expirationTime) {
    const remaining = (expirationTime - now) / 1000;
    return Math.ceil(remaining);
  }

  cooldowns.set(key, now);
  return null;
}

module.exports = {
  checkCooldown
};