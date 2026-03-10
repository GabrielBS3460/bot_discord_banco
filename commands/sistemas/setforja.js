const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ForjaService = require("../../services/ForjaService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setforja")
        .setDescription("Configura o seu limite e ganho diário de pontos de forja.")
        .addIntegerOption(option =>
            option
                .setName("poderes")
                .setDescription("Quantidade de poderes de fabricação que você possui")
                .setRequired(true)
                .setMinValue(0)
        ),

    async execute({ interaction, getPersonagemAtivo }) {
        const poderesFabricacao = interaction.options.getInteger("poderes");

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const { oficiosTreinados, quantidadeOficios, limiteForja } = await ForjaService.configurarForja(
                char,
                poderesFabricacao
            );

            const oficiosTexto = quantidadeOficios > 0 ? oficiosTreinados.join(", ") : "Nenhum";

            await interaction.reply({
                content:
                    `⚒️ **Configuração de Forja Atualizada!**\n\n` +
                    `👤 **Personagem:** ${char.nome}\n` +
                    `⚙️ **Poderes de Fabricação:** ${poderesFabricacao}\n` +
                    `🛠️ **Ofícios Válidos (${quantidadeOficios}):** ${oficiosTexto}\n\n` +
                    `🔥 **Seu ganho base de Pontos de Forja agora é:** \`${limiteForja}\` pts.\n` +
                    `*Use \`/resgatarforja\` para encher seus pontos diariamente.*`
            });
        } catch (err) {
            console.error("Erro no comando setforja:", err);

            const erroMsg = {
                content: "❌ Ocorreu um erro ao salvar seu limite de forja.",
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
