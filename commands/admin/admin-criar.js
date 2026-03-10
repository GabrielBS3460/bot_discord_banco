const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const PersonagemService = require("../../services/PersonagemService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-criar")
        .setDescription("Cria um personagem para um jogador (Apenas Admins/Mods).")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que receberá o personagem").setRequired(true)
        )
        .addStringOption(option => option.setName("nome").setDescription("O nome do personagem").setRequired(true)),

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
        const nomePersonagem = interaction.options.getString("nome");

        if (alvo.bot) {
            return interaction.reply({
                content: "🚫 Bots não podem possuir personagens.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const { novoPersonagem, statusMsg } = await PersonagemService.adminCriarPersonagem(alvo.id, nomePersonagem);

            const embed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle("👤 Personagem Criado (Admin)")
                .setDescription(`O administrador **${interaction.user.username}** criou um personagem para ${alvo}.`)
                .addFields(
                    { name: "Nome do Personagem", value: novoPersonagem.nome, inline: true },
                    { name: "Jogador", value: alvo.username, inline: true },
                    { name: "Status", value: statusMsg }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            if (err.message === "LIMITE_EXCEDIDO") {
                return interaction.reply({
                    content: `⚠️ O usuário **${alvo.username}** já atingiu o limite de personagens.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (err.code === "P2002") {
                return interaction.reply({
                    content: `❌ O nome **"${nomePersonagem}"** já está em uso no servidor.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            console.error("Erro no admin-criar:", err);
            const msgErro = { content: "❌ Ocorreu um erro ao criar o personagem.", flags: MessageFlags.Ephemeral };
            interaction.replied ? await interaction.followUp(msgErro) : await interaction.reply(msgErro);
        }
    }
};
