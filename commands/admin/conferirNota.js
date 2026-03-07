const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("conferirnota")
        .setDescription("Verifica as avaliações e a nota média de um Mestre (Apenas Admins).")
        .addUserOption(option => 
            option.setName("mestre")
                .setDescription("O Mestre que você deseja analisar")
                .setRequired(true)
        ),

    async execute({ interaction, prisma, ID_CARGO_ADMIN }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({
                content: "🚫 **Acesso Negado:** Apenas administradores podem conferir avaliações.",
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser("mestre");

        if (targetUser.bot) {
            return interaction.reply({
                content: "🚫 Bots não narram missões (ainda).",
                ephemeral: true
            });
        }

        try {
            const avaliacoes = await prisma.avaliacao.findMany({
                where: { mestre_id: targetUser.id }
            });

            if (avaliacoes.length === 0) {
                return interaction.reply({
                    content: `ℹ️ O mestre **${targetUser.username}** ainda não possui avaliações registradas.`,
                    ephemeral: true
                });
            }

            let totalRitmo = 0;
            let totalImersao = 0;
            let totalPreparo = 0;
            let totalConhecimento = 0;
            let totalGeral = 0;

            for (const av of avaliacoes) {
                totalRitmo += av.nota_ritmo;
                totalImersao += av.nota_imersao;
                totalPreparo += av.nota_preparo;
                totalConhecimento += av.nota_conhecimento;
                totalGeral += av.nota_geral;
            }

            const qtd = avaliacoes.length;

            const mediaRitmo = totalRitmo / qtd;
            const mediaImersao = totalImersao / qtd;
            const mediaPreparo = totalPreparo / qtd;
            const mediaConhecimento = totalConhecimento / qtd;
            const mediaGeral = totalGeral / qtd;

            const notaFinal = (mediaRitmo + mediaImersao + mediaPreparo + mediaConhecimento + mediaGeral) / 5;

            let corEmbed = "#00FF00";
            if (notaFinal < 4) corEmbed = "#FFA500";
            if (notaFinal < 2.5) corEmbed = "#FF0000";

            const embed = new EmbedBuilder()
                .setTitle(`📊 Relatório de Desempenho`)
                .setDescription(`**Mestre:** ${targetUser.username}\nBaseado em **${qtd}** sessões avaliadas`)
                .setColor(corEmbed)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: "⏱️ Ritmo", value: `⭐ ${mediaRitmo.toFixed(2)}`, inline: true },
                    { name: "🎭 Imersão", value: `⭐ ${mediaImersao.toFixed(2)}`, inline: true },
                    { name: "📚 Preparo", value: `⭐ ${mediaPreparo.toFixed(2)}`, inline: true },
                    { name: "🧠 Sistema", value: `⭐ ${mediaConhecimento.toFixed(2)}`, inline: true },
                    { name: "😊 Satisfação", value: `⭐ ${mediaGeral.toFixed(2)}`, inline: true },
                    { name: "🏆 Média Global", value: `🌟 **${notaFinal.toFixed(2)} / 5.0**` }
                )
                .setFooter({ text: `Relatório gerado por ${interaction.user.username}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (err) {
            console.error("Erro no comando conferirnota:", err);
            
            const erroMsg = { content: "❌ Ocorreu um erro ao buscar avaliações.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};