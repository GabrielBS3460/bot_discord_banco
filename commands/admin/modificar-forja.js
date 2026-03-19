const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("modificar-pontos-forja")
        .setDescription("[ADMIN] Adiciona ou remove pontos de forja de um jogador.")
        .addUserOption(opt => opt.setName("jogador").setDescription("O dono do personagem").setRequired(true))
        .addNumberOption(opt =>
            opt
                .setName("quantidade")
                .setDescription("Valor a ser alterado (use negativo para subtrair)")
                .setRequired(true)
        )
        .addStringOption(opt => opt.setName("motivo").setDescription("O motivo da alteração").setRequired(false)),

    async execute({ interaction, getPersonagemAtivo, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const alvoUser = interaction.options.getUser("jogador");
            const quantidade = interaction.options.getNumber("quantidade");
            const motivo = interaction.options.getString("motivo") || "Ajuste Administrativo";

            const charAlvo = await getPersonagemAtivo(alvoUser.id);

            if (!charAlvo) {
                return interaction.editReply({
                    content: `🚫 **${alvoUser.username}** não possui um personagem ativo.`
                });
            }

            let novoValor = charAlvo.pontos_forja_atual + quantidade;
            if (novoValor < 0) novoValor = 0;

            await prisma.personagens.update({
                where: { id: charAlvo.id },
                data: { pontos_forja_atual: novoValor }
            });

            const embedLog = new EmbedBuilder()
                .setTitle("🔨 Ajuste de Pontos de Forja")
                .setColor(quantidade >= 0 ? "#57F287" : "#ED4245")
                .addFields(
                    { name: "👤 Personagem", value: charAlvo.nome, inline: true },
                    { name: "👑 Admin", value: interaction.user.tag, inline: true },
                    {
                        name: "📈 Alteração",
                        value: `${quantidade >= 0 ? "+" : ""}${quantidade.toFixed(1)} pts`,
                        inline: true
                    },
                    { name: "🔥 Novo Total", value: `${novoValor.toFixed(1)} pts`, inline: true },
                    { name: "📝 Motivo", value: motivo }
                )
                .setTimestamp();

            await interaction.channel.send({ embeds: [embedLog] });

            return interaction.editReply({
                content: `✅ Pontos de **${charAlvo.nome}** atualizados para **${novoValor.toFixed(1)}**.`
            });
        } catch (err) {
            console.error("Erro ao modificar pontos de forja:", err);
            return interaction.editReply({ content: "❌ Ocorreu um erro ao processar a alteração." });
        }
    }
};
