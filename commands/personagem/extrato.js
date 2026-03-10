const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("extrato")
        .setDescription("Consulta o extrato das últimas transações do seu personagem ativo."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        try {
            const personagem = await getPersonagemAtivo(interaction.user.id);

            if (!personagem) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const transacoesStr = await TransacaoService.obterExtratoFormatado(personagem.id, formatarMoeda);

            const extratoEmbed = new EmbedBuilder()
                .setColor("#1ABC9C")
                .setTitle(`📊 Extrato de ${personagem.nome}`)
                .addFields(
                    {
                        name: "Saldo Atual",
                        value: `**${formatarMoeda(personagem.saldo)}**`
                    },
                    {
                        name: "Últimas Transações",
                        value: transacoesStr
                    }
                );

            return interaction.reply({ embeds: [extratoEmbed] });
        } catch (err) {
            console.error("Erro no comando extrato:", err);

            const erroMsg = {
                content: "❌ Ocorreu um erro ao tentar buscar seu extrato.",
                flags: MessageFlags.Ephemeral
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
