const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("venda-npc")
        .setDescription("Vende um item para um comerciante NPC e recebe Kwanzas.")
        .addNumberOption(option =>
            option.setName("valor").setDescription("Valor da venda (ex: 50 ou 50.5)").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("link").setDescription("Link do item que está sendo vendido").setRequired(true)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const valor = interaction.options.getNumber("valor");
        const linkItem = interaction.options.getString("link");

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!linkItem.startsWith("http")) {
                return interaction.reply({
                    content: "🚫 Você precisa enviar um link válido do item.",
                    flags: MessageFlags.Ephemeral
                });
            }

            await TransacaoService.registrarVendaNpc(char.id, valor);

            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("💰 Venda para NPC")
                .addFields(
                    { name: "Personagem", value: char.nome, inline: true },
                    { name: "Valor Recebido", value: formatarMoeda(valor), inline: true },
                    { name: "Item Vendido", value: linkItem }
                )
                .setFooter({ text: "O item foi vendido para um comerciante NPC." })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando venda-npc:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao registrar a venda.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
