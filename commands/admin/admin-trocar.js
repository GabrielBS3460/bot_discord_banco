const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const PersonagemService = require("../../services/PersonagemService.js");

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

    async execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
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
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const personagemAtivado = await PersonagemService.adminTrocarPersonagemAtivo(alvo.id, nomeAlvo);

            return interaction.editReply({
                content: `🔄 Sucesso! O personagem ativo de ${alvo} foi alterado para **${personagemAtivado.nome}**.`
            });
        } catch (err) {
            if (err.message === "PERSONAGEM_NAO_ENCONTRADO") {
                return interaction.editReply({
                    content: `🚫 O jogador **${alvo.username}** não possui nenhum personagem com o nome "${nomeAlvo}".`
                });
            }

            console.error("Erro no admin-trocar:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao trocar o personagem do jogador." };

            interaction.deferred
                ? await interaction.editReply(erroMsg)
                : await interaction.reply({ ...erroMsg, flags: MessageFlags.Ephemeral });
        }
    }
};
