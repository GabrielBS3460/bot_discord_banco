const prisma = require("../database.js");

class UsuarioRepository {
    async upsert(discordId) {
        return prisma.usuarios.upsert({
            where: { discord_id: discordId },
            update: {},
            create: { discord_id: discordId }
        });
    }

    async atualizarPersonagemAtivo(discordId, personagemId) {
        return prisma.usuarios.update({
            where: { discord_id: discordId },
            data: { personagem_ativo_id: personagemId }
        });
    }

    async buscarPorId(discordId) {
        return prisma.usuarios.findUnique({
            where: { discord_id: discordId }
        });
    }
}

module.exports = new UsuarioRepository();
