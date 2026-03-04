const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "conferirnota",

    async execute({
        message,
        prisma,
        ID_CARGO_ADMIN
    }) {

        if (!message.member.roles.cache.has(ID_CARGO_ADMIN)) {

            return message.reply(
                "🚫 **Acesso Negado:** Apenas administradores podem conferir avaliações."
            );

        }

        const targetUser = message.mentions.users.first();

        if (!targetUser) {

            return message.reply(
                "⚠️ Sintaxe: `!conferirNota @Mestre`"
            );

        }

        try {

            const avaliacoes =
                await prisma.avaliacao.findMany({

                    where: { mestre_id: targetUser.id }

                });

            if (avaliacoes.length === 0) {

                return message.reply(
                    `ℹ️ O mestre **${targetUser.username}** ainda não possui avaliações.`
                );

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

            const notaFinal =
                (
                    mediaRitmo +
                    mediaImersao +
                    mediaPreparo +
                    mediaConhecimento +
                    mediaGeral
                ) / 5;

            let corEmbed = "#00FF00";

            if (notaFinal < 4) corEmbed = "#FFA500";
            if (notaFinal < 2.5) corEmbed = "#FF0000";

            const embed = new EmbedBuilder()

                .setTitle(`📊 Relatório de Desempenho`)

                .setDescription(
                    `**Mestre:** ${targetUser.username}\n` +
                    `Baseado em **${qtd}** sessões avaliadas`
                )

                .setColor(corEmbed)

                .setThumbnail(
                    targetUser.displayAvatarURL()
                )

                .addFields(

                    {
                        name: "⏱️ Ritmo",
                        value: `⭐ ${mediaRitmo.toFixed(2)}`,
                        inline: true
                    },

                    {
                        name: "🎭 Imersão",
                        value: `⭐ ${mediaImersao.toFixed(2)}`,
                        inline: true
                    },

                    {
                        name: "📚 Preparo",
                        value: `⭐ ${mediaPreparo.toFixed(2)}`,
                        inline: true
                    },

                    {
                        name: "🧠 Sistema",
                        value: `⭐ ${mediaConhecimento.toFixed(2)}`,
                        inline: true
                    },

                    {
                        name: "😊 Satisfação",
                        value: `⭐ ${mediaGeral.toFixed(2)}`,
                        inline: true
                    },

                    {
                        name: "🏆 Média Global",
                        value: `🌟 **${notaFinal.toFixed(2)} / 5.0**`
                    }

                )

                .setFooter({
                    text:
                        `Relatório gerado por ${message.author.username}`
                })

                .setTimestamp();

            return message.reply({ embeds: [embed] });

        }

        catch (err) {

            console.error("Erro conferirNota:", err);

            return message.reply(
                "❌ Erro ao buscar avaliações."
            );

        }

    }

};