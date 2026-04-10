const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

const PersonagemService = require("../../services/PersonagemService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin_personagem")
        .setDescription("🛠️ Gerencia os personagens de um jogador alvo.")
        .addSubcommand(sub =>
            sub
                .setName("listar")
                .setDescription("Lista todos os personagens criados por um jogador específico.")
                .addUserOption(opt => opt.setName("jogador").setDescription("O jogador alvo").setRequired(true))
        ),

    async execute({ interaction, formatarMoeda, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcomando = interaction.options.getSubcommand();
        const alvoUser = interaction.options.getUser("jogador");

        if (alvoUser.bot) {
            return interaction.editReply("🚫 Bots não jogam RPG (ainda).");
        }

        if (subcomando === "listar") {
            try {
                const listaFormatada = await PersonagemService.listarPersonagens(alvoUser.id, formatarMoeda);

                const embed = new EmbedBuilder()
                    .setColor("#E74C3C") // Vermelho Admin
                    .setTitle(`📜 Personagens de ${alvoUser.username}`)
                    .setDescription(listaFormatada)
                    .setThumbnail(alvoUser.displayAvatarURL());

                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                if (err.message === "NENHUM_PERSONAGEM") {
                    return interaction.editReply(
                        `🚫 O jogador **${alvoUser.username}** não possui nenhum personagem cadastrado no banco de dados.`
                    );
                }

                console.error("Erro no comando admin-personagem listar:", err);
                return interaction.editReply("❌ Ocorreu um erro ao buscar os personagens desse jogador.");
            }
        }
    }
};
