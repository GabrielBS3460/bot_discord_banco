const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("punga")
        .setDescription("Tenta roubar um alvo NPC.")
        .addStringOption(option =>
            option
                .setName("alvo")
                .setDescription("O que você deseja tentar roubar?")
                .setRequired(true)
                .addChoices({ name: "💰 Dinheiro", value: "Dinheiro" }, { name: "🎁 Item", value: "Item" })
        )
        .addIntegerOption(option =>
            option
                .setName("nd")
                .setDescription("O Nível de Desafio (ND) do alvo (1 a 20)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(20)
        ),

    async execute({ interaction, getPersonagemAtivo, PungaSystem }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você precisa de um personagem ativo para pungar.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const tipo = interaction.options.getString("alvo");
            const nd = interaction.options.getInteger("nd");

            let resultadoMsg = "";

            if (tipo === "Dinheiro") {
                const valor = PungaSystem.processarDinheiro(nd);

                if (valor > 0) {
                    const charAtualizado = await TransacaoService.registrarPungaDinheiro(char.id, valor, nd);

                    resultadoMsg = `💰 Você pungou **K$ ${valor}**!\n✅ *Valor depositado na conta.*\n💰 **Saldo Atual:** K$ ${charAtualizado.saldo}`;
                } else {
                    resultadoMsg = "🍃 Você tentou pungar, mas os bolsos do alvo estavam vazios!";
                }
            } else {
                const item = PungaSystem.processarPunga(nd);
                resultadoMsg = `🎁 Você pungou: **${item}**`;
            }

            await interaction.reply({
                content: `🥷 **Punga Realizada por ${char.nome}**\n✅ **Resultado (Alvo ND ${nd}):**\n${resultadoMsg}`
            });
        } catch (err) {
            console.error("Erro no comando punga:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao processar a punga.", flags: MessageFlags.Ephemeral };

            interaction.replied
                ? await interaction.followUp(erroMsg).catch(() => {})
                : await interaction.reply(erroMsg).catch(() => {});
        }
    }
};
