const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mesas-quadro")
        .setDescription("Exibe a quantidade de missões do Quadro narradas na comunidade.")
        .addUserOption(option =>
            option
                .setName("mestre")
                .setDescription("O Mestre que você deseja consultar (deixe em branco para ver o total geral)")
                .setRequired(false)
        ),

    async execute({ interaction }) {
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser("mestre");

            if (targetUser) {
                if (targetUser.bot) {
                    return interaction.editReply({ content: "🚫 Bots não narram missões." });
                }

                const concluidas = await prisma.missoes.count({
                    where: { criador_id: targetUser.id, status: "CONCLUIDA" }
                });

                const emAndamento = await prisma.missoes.count({
                    where: { criador_id: targetUser.id, status: "EM_ANDAMENTO" }
                });

                const abertas = await prisma.missoes.count({
                    where: { criador_id: targetUser.id, status: "ABERTA" }
                });

                const embed = new EmbedBuilder()
                    .setTitle(`📋 Estatísticas do Quadro: ${targetUser.username}`)
                    .setColor("#5865F2")
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: "🏆 Missões Concluídas", value: `**${concluidas}** missões`, inline: true },
                        { name: "⚔️ Em Andamento", value: `**${emAndamento}** missões`, inline: true },
                        { name: "📜 Abertas", value: `**${abertas}** missões`, inline: true }
                    )
                    .setFooter({ text: `Consultado por ${interaction.user.username}` })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } else {
                const totalConcluidas = await prisma.missoes.count({
                    where: { status: "CONCLUIDA" }
                });

                const totalEmAndamento = await prisma.missoes.count({
                    where: { status: "EM_ANDAMENTO" }
                });

                const totalAbertas = await prisma.missoes.count({
                    where: { status: "ABERTA" }
                });

                const totalGeral = await prisma.missoes.count();

                const topMestresGroup = await prisma.missoes.groupBy({
                    by: ["criador_id"],
                    where: { status: "CONCLUIDA" },
                    _count: { id: true },
                    orderBy: {
                        _count: {
                            id: "desc"
                        }
                    },
                    take: 5
                });

                let rankingStr = "Nenhuma missão concluída no quadro ainda.";
                if (topMestresGroup.length > 0) {
                    const rankingList = topMestresGroup.map((item, index) => {
                        const medalha = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎖️";
                        return `${medalha} <@${item.criador_id}> — **${item._count.id}** missões`;
                    });
                    rankingStr = rankingList.join("\n");
                }

                const embed = new EmbedBuilder()
                    .setTitle("📜 Painel Geral de Missões do Quadro")
                    .setColor("#F1C40F")
                    .addFields(
                        { name: "🏆 Total Concluídas", value: `**${totalConcluidas}** missões`, inline: true },
                        { name: "⚔️ Em Andamento", value: `**${totalEmAndamento}** missões`, inline: true },
                        { name: "📜 Vagas Abertas", value: `**${totalAbertas}** missões`, inline: true },
                        { name: "📊 Total Registradas", value: `**${totalGeral}** missões`, inline: true },
                        { name: "👑 Top Mestres do Quadro", value: rankingStr, inline: false }
                    )
                    .setFooter({ text: "Use /mesas-quadro mestre:@usuario para consultar um mestre específico" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (err) {
            console.error("Erro no comando mesas-quadro:", err);
            return interaction.editReply({ content: "❌ Ocorreu um erro ao consultar as estatísticas do Quadro." });
        }
    }
};
