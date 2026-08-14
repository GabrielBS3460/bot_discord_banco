const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const MestreService = require("../../services/MestreService.js");
const ContratoRepository = require("../../repositories/ContratoRepository.js");

function formatStars(score) {
    const filled = Math.round(score);
    const stars = "⭐".repeat(filled) + "▫️".repeat(Math.max(0, 5 - filled));
    return `${stars} **${score.toFixed(1)}/5.0**`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nota-mesa")
        .setDescription("Exibe o relatório de notas e avaliações de uma mesa (Mestre da mesa e Admins).")
        .addStringOption(opt =>
            opt.setName("nome").setDescription("Nome exato da missão/mesa").setRequired(true)
        ),

    async execute({ interaction, ID_CARGO_ADMIN }) {
        await interaction.deferReply({ ephemeral: true });

        const nomeMissao = interaction.options.getString("nome").trim();
        const missao = await ContratoRepository.buscarPorNomeCompleto(nomeMissao);
        const relatorio = await MestreService.gerarRelatorioMesa(nomeMissao);

        if (!missao && !relatorio) {
            return interaction.editReply({
                content: `🚫 Nenhuma mesa ou avaliação foi encontrada com o nome **"${nomeMissao}"**.`
            });
        }

        const eAdmin = interaction.member?.roles?.cache?.has(ID_CARGO_ADMIN);
        const mestreId = missao ? missao.criador_id : relatorio?.mestreId;

        if (mestreId !== interaction.user.id && !eAdmin) {
            return interaction.editReply({
                content: "🚫 **Acesso Negado:** Apenas o Mestre responsável por esta mesa ou Administradores podem visualizar as notas."
            });
        }

        if (!relatorio) {
            return interaction.editReply({
                content: `ℹ️ A mesa **"${nomeMissao}"** ainda não possui nenhuma avaliação registrada pelos jogadores.`
            });
        }

        let feedbackText = "Nenhum comentário por escrito.";
        if (relatorio.feedbacks && relatorio.feedbacks.length > 0) {
            feedbackText = relatorio.feedbacks.map((f, i) => `**${i + 1}.** "${f}"`).join("\n");
            if (feedbackText.length > 1000) {
                feedbackText = feedbackText.slice(0, 995) + "...";
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 Relatório de Avaliações — ${missao ? missao.nome : nomeMissao}`)
            .setColor("#00AE86")
            .setTimestamp()
            .addFields(
                { name: "📜 Contrato / Mesa", value: `**${nomeMissao}**`, inline: true },
                { name: "🧙‍♂️ Mestre", value: `<@${mestreId}>`, inline: true },
                { name: "👥 Avaliações", value: `**${relatorio.qtd}** avaliador(es)`, inline: true },
                { name: "🥁 Ritmo da Mesa", value: formatStars(relatorio.ritmo), inline: false },
                { name: "🎭 Imersão & Narrativa", value: formatStars(relatorio.imersao), inline: false },
                { name: "📚 Preparo do Mestre", value: formatStars(relatorio.preparo), inline: false },
                { name: "🎲 Domínio do Sistema", value: formatStars(relatorio.conhecimento), inline: false },
                { name: "🌟 Satisfação Geral", value: formatStars(relatorio.geral), inline: false },
                { name: "🏆 Média Final Geral", value: formatStars(relatorio.notaFinal), inline: false },
                { name: "💬 Feedbacks e Comentários (Sigilosos)", value: feedbackText, inline: false }
            );

        if (missao) {
            embed.setFooter({ text: `Status da Mesa: ${missao.status} | ND ${missao.nd}` });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
