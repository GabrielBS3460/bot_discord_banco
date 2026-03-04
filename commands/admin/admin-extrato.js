const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "admin-extrato",

    async execute({
        message,
        args,
        prisma,
        getPersonagemAtivo,
        formatarMoeda,
        ID_CARGO_ADMIN,
        ID_CARGO_MOD
    }) {

        if (
            !message.member.roles.cache.has(ID_CARGO_ADMIN) &&
            !message.member.roles.cache.has(ID_CARGO_MOD)
        ) {
            return message.reply("🚫 Você não tem permissão para usar este comando.");
        }

        const alvo = message.mentions.users.first();

        if (!alvo) {
            return message.reply("Sintaxe: `!admin-extrato <@usuario>`");
        }

        try {

            const personagem = await getPersonagemAtivo(alvo.id);

            if (!personagem) {

                return message.reply(
                    `O usuário **${alvo.username}** não tem personagem ativo.`
                );

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

                .setFooter({
                    text: `Solicitado por ${message.author.username}`
                })

                .setTimestamp();

            if (transacoes.length > 0) {

                const lista = transacoes.map(t => {

                    let icone = "🔹";

                    if (t.tipo === "GASTO") icone = "🔴";
                    if (t.tipo === "RECOMPENSA" || t.tipo === "GANHO") icone = "🟢";
                    if (t.tipo === "COMPRA") icone = "💸";

                    const dataFormatada =
                        new Date(t.data).toLocaleDateString("pt-BR");

                    const valorFormatado =
                        `${t.valor >= 0 ? "+" : ""}${formatarMoeda(t.valor)}`;

                    const descricao =
                        t.descricao.length > 80
                            ? t.descricao.slice(0, 80) + "..."
                            : t.descricao;

                    return (
                        `\`#${t.id}\` \`${dataFormatada}\` ${icone} **${valorFormatado}**\n` +
                        `╰ *${descricao}*`
                    );

                }).join("\n");

                extratoEmbed.addFields({
                    name: "Últimas 10 Transações",
                    value: lista
                });

            }
            else {

                extratoEmbed.addFields({
                    name: "Histórico",
                    value: "Nenhuma transação registrada."
                });

            }

            return message.reply({ embeds: [extratoEmbed] });

        }
        catch (err) {

            console.error("Erro admin-extrato:", err);

            return message.reply(
                "❌ Erro ao buscar o extrato."
            );

        }

    }

};