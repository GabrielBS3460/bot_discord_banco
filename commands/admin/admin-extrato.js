const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoRepository = require("../../repositories/TransacaoRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-extrato")
        .setDescription("Consulta o extrato das últimas 10 transações de outro jogador (Admin/Mod).")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que você deseja investigar").setRequired(true)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const eAdmin = interaction.member.roles.cache.has(ID_CARGO_ADMIN);
        const eMod = interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!eAdmin && !eMod) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando administrativo.",
                flags: MessageFlags.Ephemeral
            });
        }

        const alvo = interaction.options.getUser("jogador");
        if (alvo.bot)
            return interaction.reply({
                content: "🚫 Bots não possuem saldo ou extrato.",
                flags: MessageFlags.Ephemeral
            });

        try {
            const personagem = await getPersonagemAtivo(alvo.id);

            if (!personagem) {
                return interaction.reply({
                    content: `🚫 O usuário **${alvo.username}** não tem um personagem ativo.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const transacoes = await TransacaoRepository.buscarUltimasPorPersonagem(personagem.id, 10);

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
                        if (["RECOMPENSA", "GANHO"].includes(t.tipo)) icone = "🟢";
                        if (t.tipo === "COMPRA") icone = "💸";

                        const dataFormatada = new Date(t.data).toLocaleDateString("pt-BR");
                        const prefixo = t.valor >= 0 ? "+" : "";
                        const valorFormatado = `${prefixo}${formatarMoeda(t.valor)}`;
                        const descCurta = t.descricao.length > 80 ? t.descricao.slice(0, 80) + "..." : t.descricao;

                        return `\`#${t.id}\` \`${dataFormatada}\` ${icone} **${valorFormatado}**\n╰ *${descCurta}*`;
                    })
                    .join("\n");

                extratoEmbed.addFields({ name: "Últimas 10 Transações", value: lista });
            } else {
                extratoEmbed.addFields({
                    name: "Histórico",
                    value: "Nenhuma transação registrada para este personagem."
                });
            }

            return interaction.reply({ embeds: [extratoEmbed], flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error("Erro no admin-extrato:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao investigar o extrato.", flags: MessageFlags.Ephemeral };
            interaction.replied ? await interaction.followUp(erroMsg) : await interaction.reply(erroMsg);
        }
    }
};
