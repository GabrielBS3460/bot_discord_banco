const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const MestreService = require("../../services/MestreService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("conferirnota")
        .setDescription("Verifica as avaliações e a nota média de um Mestre (Apenas Admins).")
        .addUserOption(option =>
            option.setName("mestre").setDescription("O Mestre que você deseja analisar").setRequired(true)
        ),

    async execute({ interaction, ID_CARGO_ADMIN }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({
                content: "🚫 **Acesso Negado:** Apenas administradores podem conferir avaliações.",
                flags: MessageFlags.Ephemeral
            });
        }

        const targetUser = interaction.options.getUser("mestre");
        if (targetUser.bot)
            return interaction.reply({ content: "🚫 Bots não narram missões.", flags: MessageFlags.Ephemeral });

        try {
            const relatorio = await MestreService.gerarRelatorioDesempenho(targetUser.id);

            if (!relatorio) {
                return interaction.reply({
                    content: `ℹ️ O mestre **${targetUser.username}** ainda não possui avaliações registradas.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            let corEmbed = "#00FF00";
            if (relatorio.notaFinal < 4) corEmbed = "#FFA500";
            if (relatorio.notaFinal < 2.5) corEmbed = "#FF0000";
            const embed = new EmbedBuilder()
                .setTitle(`📊 Relatório de Desempenho`)
                .setDescription(`**Mestre:** ${targetUser.username}\nBaseado em **${relatorio.qtd}** sessões avaliadas`)
                .setColor(corEmbed)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: "⏱️ Ritmo", value: `⭐ ${relatorio.ritmo.toFixed(2)}`, inline: true },
                    { name: "🎭 Imersão", value: `⭐ ${relatorio.imersao.toFixed(2)}`, inline: true },
                    { name: "📚 Preparo", value: `⭐ ${relatorio.preparo.toFixed(2)}`, inline: true },
                    { name: "🧠 Sistema", value: `⭐ ${relatorio.conhecimento.toFixed(2)}`, inline: true },
                    { name: "😊 Satisfação", value: `⭐ ${relatorio.geral.toFixed(2)}`, inline: true },
                    { name: "🏆 Média Global", value: `🌟 **${relatorio.notaFinal.toFixed(2)} / 5.0**` }
                )
                .setFooter({ text: `Relatório gerado por ${interaction.user.username}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error("Erro no comando conferirnota:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao buscar avaliações.", flags: MessageFlags.Ephemeral };
            interaction.replied ? await interaction.followUp(erroMsg) : await interaction.reply(erroMsg);
        }
    }
};
