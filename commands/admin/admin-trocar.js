const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-trocar")
        .setDescription("Altera o personagem ativo de um jogador (Apenas Admins/Mods).")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que terá o personagem trocado").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("nome").setDescription("O nome exato do personagem que ficará ativo").setRequired(true)
        ),

    async execute({ interaction, prisma, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN) && !interaction.member.roles.cache.has(ID_CARGO_MOD)) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        const alvo = interaction.options.getUser("jogador");
        const nomeAlvo = interaction.options.getString("nome").trim();

        if (alvo.bot) {
            return interaction.reply({
                content: "🚫 Bots não possuem personagens no sistema.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply();

            const personagemAlvo = await prisma.personagens.findFirst({
                where: {
                    nome: { equals: nomeAlvo, mode: "insensitive" },
                    usuario_id: alvo.id
                }
            });

            if (!personagemAlvo) {
                return interaction.editReply({
                    content: `🚫 O jogador **${alvo.username}** não possui nenhum personagem com o nome "${nomeAlvo}".`
                });
            }

            await prisma.usuarios.update({
                where: { discord_id: alvo.id },
                data: { personagem_ativo_id: personagemAlvo.id }
            });

            return interaction.editReply({
                content: `🔄 Sucesso! O personagem ativo de ${alvo} foi alterado para **${personagemAlvo.nome}**.`
            });
        } catch (err) {
            console.error("Erro no admin-trocar:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao trocar o personagem do jogador." };
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(erroMsg).catch(() => {
                    /* ignora */
                });
            } else {
                await interaction.reply({ ...erroMsg, flags: MessageFlags.Ephemeral }).catch(() => {
                    /* ignora */
                });
            }
        }
    }
};
