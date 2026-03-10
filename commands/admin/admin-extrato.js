const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-extrato")
        .setDescription("Consulta o extrato das últimas 10 transações de outro jogador (Apenas Admins/Mods).")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que você deseja investigar").setRequired(true)
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN) && !interaction.member.roles.cache.has(ID_CARGO_MOD)) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        const alvo = interaction.options.getUser("jogador");

        if (alvo.bot) {
            return interaction.reply({
                content: "🚫 Bots não possuem saldo ou extrato.",
                ephemeral: true
            });
        }

        try {
            const personagem = await getPersonagemAtivo(alvo.id);

            if (!personagem) {
                return interaction.reply({
                    content: `🚫 O usuário **${alvo.username}** não tem um personagem ativo.`,
                    ephemeral: true
                });
            }

            const transacoes = await prisma.transacao.findMany({
                where: { personagem_id: personagem.id },
                orderBy: { data: "desc" },
                take: 10
            });

            const extratoEmbed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle(`🕵️ Extrato Administrativo`)
                .setDescription(
                    `**Personagem:** ${personagem.nome}\n` +
                        `**Dono:** ${alvo.username}\n` +
                        `💰 **Saldo Atual:** ${formatarMoeda(personagem.saldo)}`
                )
                .setFooter({ text: `Solicitado por ${interaction.user.username}` })
                .setTimestamp();

            if (transacoes.length > 0) {
                const lista = transacoes
                    .map(t => {
                        let icone = "🔹";

                        if (t.tipo === "GASTO") icone = "🔴";
                        if (t.tipo === "RECOMPENSA" || t.tipo === "GANHO") icone = "🟢";
                        if (t.tipo === "COMPRA") icone = "💸";

                        const dataFormatada = new Date(t.data).toLocaleDateString("pt-BR");
                        const valorFormatado = `${t.valor >= 0 ? "+" : ""}${formatarMoeda(t.valor)}`;

                        const descricao = t.descricao.length > 80 ? t.descricao.slice(0, 80) + "..." : t.descricao;

                        return `\`#${t.id}\` \`${dataFormatada}\` ${icone} **${valorFormatado}**\n╰ *${descricao}*`;
                    })
                    .join("\n");

                extratoEmbed.addFields({
                    name: "Últimas 10 Transações",
                    value: lista
                });
            } else {
                extratoEmbed.addFields({
                    name: "Histórico",
                    value: "Nenhuma transação registrada."
                });
            }

            return interaction.reply({ embeds: [extratoEmbed], ephemeral: true });
        } catch (err) {
            console.error("Erro no comando admin-extrato:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao buscar o extrato.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
