const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("conferirnota")
        .setDescription("Verifica as avaliações e a nota média de um Mestre (Apenas Admins).")
        .addUserOption(option =>
            option.setName("mestre").setDescription("O Mestre que você deseja analisar (deixe em branco para ver sua própria nota)").setRequired(false)
        ),

    async execute({ interaction, ID_CARGO_ADMIN, verificarLimiteMestre }) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const eAdmin = interaction.member.roles.cache.has(ID_CARGO_ADMIN);
        const targetUser = interaction.options.getUser("mestre") || interaction.user;

        if (targetUser.bot)
            return interaction.editReply({ content: "🚫 Bots não narram missões." });

        if (!eAdmin && targetUser.id !== interaction.user.id) {
            return interaction.editReply({
                content: "🚫 **Acesso Negado:** Você só pode verificar a sua própria nota."
            });
        }

        if (targetUser.id === interaction.user.id && !eAdmin) {
            const userDb = await prisma.usuarios.findUnique({ where: { discord_id: interaction.user.id } });
            if (userDb && userDb.ultimo_check_nota) {
                const diasPassados = (Date.now() - new Date(userDb.ultimo_check_nota).getTime()) / (1000 * 60 * 60 * 24);
                if (diasPassados < 7) {
                    const diasRestantes = Math.ceil(7 - diasPassados);
                    return interaction.editReply({
                        content: `⏳ **Limite de consulta atingido:** Você só pode consultar sua própria nota 1 vez por semana. Tente novamente em **${diasRestantes} dia(s)**.`
                    });
                }
            }

            await prisma.usuarios.upsert({
                where: { discord_id: interaction.user.id },
                update: { ultimo_check_nota: new Date() },
                create: { discord_id: interaction.user.id, ultimo_check_nota: new Date() }
            });
        }

        try {
            const mestreData = await prisma.usuarios.findUnique({
                where: { discord_id: targetUser.id }
            });

            if (!mestreData) {
                return interaction.editReply({ content: "🚫 Usuário não encontrado no banco de dados." });
            }

            const statsMestre = await verificarLimiteMestre(mestreData);

            const avaliacoes = await prisma.avaliacao.findMany({
                where: { mestre_id: targetUser.id },
                orderBy: { data_avaliacao: "desc" }
            });

            if (avaliacoes.length === 0 && statsMestre.contagem === 0) {
                return interaction.editReply({
                    content: `ℹ️ O mestre **${targetUser.username}** ainda não possui avaliações ou missões registradas.`
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
                return `⏱️ **Ritmo** ㅤ🎭 **Imersão** ㅤ📚 **Preparo**\n⭐ ${stats.ritmo.toFixed(2)} ㅤ⭐ ${stats.imersao.toFixed(2)} ㅤ⭐ ${stats.preparo.toFixed(2)}\n\n🧠 **Sistema** ㅤ😊 **Satisfação**\n⭐ ${stats.conhecimento.toFixed(2)} ㅤ⭐ ${stats.geral.toFixed(2)}\n\n🏆 **Média Global**\n🌟 **${stats.final.toFixed(2)} / 5.0**\n\nAvaliações: ${stats.qtd}`;
            };

            const embed = new EmbedBuilder()
                .setTitle(`📊 Relatório de Desempenho: ${targetUser.username}`)
                .setDescription(`Nível de Narrador: **${mestreData.nivel_narrador}**`)
                .setColor("#2b2d31")
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: "AVALIAÇÕES DE QUADRO", value: formatarNotas(statsQuadro), inline: true },
                    { name: "AVALIAÇÕES DE SOLICITADAS", value: formatarNotas(statsSolicitadas), inline: true },
                    {
                        name: "📈 Atividade Mensal",
                        value: `**Mesas Narradas:** ${statsMestre.contagem} / ${statsMestre.limite}\n*A atividade é baseada em registros de missões concluídas este mês.*`,
                        inline: false
                    }
                )
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`feedbacks_${targetUser.id}`)
                    .setLabel("Ver Últimos Feedbacks")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("💬")
            );

            const msg = await interaction.editReply({ embeds: [embed], components: [row] });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on("collect", async i => {
                if (i.customId === `feedbacks_${targetUser.id}`) {
                    const freshAvaliacoes = await prisma.avaliacao.findMany({
                        where: { mestre_id: targetUser.id },
                        orderBy: { data_avaliacao: "desc" }
                    });

                    const feedbacks = freshAvaliacoes
                        .filter(a => a.feedback && a.feedback.trim() !== "")
                        .slice(0, 10);

                    if (feedbacks.length === 0) {
                        return i.reply({ content: "ℹ️ Este mestre ainda não possui feedbacks em texto.", flags: MessageFlags.Ephemeral });
                    }

                    const embedFeedback = new EmbedBuilder()
                        .setTitle(`💬 Últimos Feedbacks: ${targetUser.username}`)
                        .setColor("#5865f2")
                        .setDescription(feedbacks.map(f => `**Missão:** ${f.nome_missao}\n> ${f.feedback}\n*Data: ${f.data_avaliacao.toLocaleDateString("pt-BR")}*`).join("\n\n"));

                    await i.reply({ embeds: [embedFeedback], flags: MessageFlags.Ephemeral });
                }
            });

        } catch (err) {
            console.error("Erro no comando conferirnota:", err);
            await interaction.editReply({ content: "❌ Ocorreu um erro ao buscar avaliações." });
        }
    }
};
