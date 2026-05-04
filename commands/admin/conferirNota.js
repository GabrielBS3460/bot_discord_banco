const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");

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

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const avaliacoes = await prisma.avaliacao.findMany({
                where: { mestre_id: targetUser.id }
            });

            if (avaliacoes.length === 0) {
                return interaction.editReply({
                    content: `ℹ️ O mestre **${targetUser.username}** ainda não possui avaliações registradas.`
                });
            }

            const avQuadro = avaliacoes.filter(a => a.tipo_contrato === "Quadro");
            const avSolicitadas = avaliacoes.filter(a => a.tipo_contrato === "Solicitada");

            const calcularMedia = lista => {
                if (lista.length === 0)
                    return { ritmo: 0, imersao: 0, preparo: 0, conhecimento: 0, geral: 0, final: 0, qtd: 0 };

                const sum = lista.reduce(
                    (acc, a) => {
                        acc.ritmo += a.nota_ritmo;
                        acc.imersao += a.nota_imersao;
                        acc.preparo += a.nota_preparo;
                        acc.conhecimento += a.nota_conhecimento;
                        acc.geral += a.nota_geral;
                        return acc;
                    },
                    { ritmo: 0, imersao: 0, preparo: 0, conhecimento: 0, geral: 0 }
                );

                const qtd = lista.length;
                const res = {
                    ritmo: sum.ritmo / qtd,
                    imersao: sum.imersao / qtd,
                    preparo: sum.preparo / qtd,
                    conhecimento: sum.conhecimento / qtd,
                    geral: sum.geral / qtd,
                    qtd
                };
                res.final = (res.ritmo + res.imersao + res.preparo + res.conhecimento + res.geral) / 5;
                return res;
            };

            const statsQuadro = calcularMedia(avQuadro);
            const statsSolicitadas = calcularMedia(avSolicitadas);

            const formatarNotas = stats => {
                if (stats.qtd === 0) return "*Nenhuma avaliação deste tipo.*";
                return `⏱️ **Ritmo** 🎭 **Imersão** 📚 **Preparo**\n⭐ ${stats.ritmo.toFixed(2)} ㅤ⭐ ${stats.imersao.toFixed(2)} ㅤ⭐ ${stats.preparo.toFixed(2)}\n\n🧠 **Sistema** ㅤ😊 **Satisfação**\n⭐ ${stats.conhecimento.toFixed(2)} ㅤ⭐ ${stats.geral.toFixed(2)}\n\n🏆 **Média Global**\n🌟 **${stats.final.toFixed(2)} / 5.0**\n\nQuantidade de avaliações: ${stats.qtd}`;
            };

            const mesAtual = new Date().getMonth();
            const anoAtual = new Date().getFullYear();
            const avaliacoesMes = avaliacoes.filter(
                a => a.data_avaliacao.getMonth() === mesAtual && a.data_avaliacao.getFullYear() === anoAtual
            );

            const mesasNoMes = new Set(avaliacoesMes.map(a => a.link_missao)).size;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Relatório de Desempenho Geral`)
                .setDescription(`**Mestre:** ${targetUser.username}`)
                .setColor("#2b2d31")
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: "AVALIAÇÕES DE QUADRO", value: formatarNotas(statsQuadro), inline: true },
                    { name: "AVALIAÇÕES DE SOLICITADAS", value: formatarNotas(statsSolicitadas), inline: true },
                    {
                        name: "\u200B",
                        value: `**Quantidade de mesas narradas neste mês:** ${mesasNoMes}`,
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando conferirnota:", err);
            await interaction.editReply({ content: "❌ Ocorreu um erro ao buscar avaliações." });
        }
    }
};
