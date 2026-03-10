const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("extrato")
        .setDescription("Consulta o extrato das últimas transações do seu personagem ativo."),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda }) {
        try {
            const personagem = await getPersonagemAtivo(interaction.user.id);

            if (!personagem) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    ephemeral: true
                });
            }

            const transacoes = await prisma.transacao.findMany({
                where: { personagem_id: personagem.id },
                orderBy: { data: "desc" },
                take: 5
            });

            const extratoEmbed = new EmbedBuilder()
                .setColor("#1ABC9C")
                .setTitle(`📊 Extrato de ${personagem.nome}`)
                .addFields({
                    name: "Saldo Atual",
                    value: `**${formatarMoeda(personagem.saldo)}**`
                });

            if (transacoes.length > 0) {
                const transacoesStr = transacoes
                    .map(t => {
                        const sinal = t.tipo === "GASTO" || t.tipo === "COMPRA" ? "-" : "+";
                        const dataFormatada = new Date(t.data).toLocaleDateString("pt-BR");

                        return `\`${dataFormatada}\` ${sinal} ${formatarMoeda(t.valor)} - *${t.descricao}*`;
                    })
                    .join("\n");

                extratoEmbed.addFields({
                    name: "Últimas Transações",
                    value: transacoesStr
                });
            } else {
                extratoEmbed.addFields({
                    name: "Últimas Transações",
                    value: "Nenhuma transação registrada."
                });
            }

            return interaction.reply({ embeds: [extratoEmbed] });
        } catch (err) {
            console.error("Erro no comando extrato:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao tentar buscar seu extrato.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
