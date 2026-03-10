const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ForjaService = require("../../services/ForjaService.js");

module.exports = {
    data: new SlashCommandBuilder().setName("resgatarforja").setDescription("Resgata seus pontos de forja diários."),

    async execute({ interaction, getPersonagemAtivo }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const resultado = await ForjaService.resgatarPontosDiarios(char);

                return interaction.reply({
                    content: `🔨 **Forja:** Você recebeu **${resultado.ganhou.toFixed(1)}** pontos!\n📊 **Total:** ${resultado.novoTotal.toFixed(1)} / Máx: ${resultado.limiteAcumulo}\n*(Patamar: ${resultado.patamar} | Ganho Diário: ${resultado.ganhoDiario})*`
                });
            } catch (err) {
                if (err.message === "FORJA_NAO_CONFIGURADA") {
                    return interaction.reply({
                        content: "⚠️ Você ainda não configurou sua Forja! Use `/setforja` primeiro.",
                        flags: MessageFlags.Ephemeral
                    });
                }
                if (err.message === "JA_RESGATOU_HOJE") {
                    return interaction.reply({
                        content: `🚫 **${char.nome}** já pegou seus pontos de forja hoje!`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                if (err.message === "ESTOQUE_CHEIO") {
                    return interaction.reply({
                        content: `⚠️ Seu estoque de pontos está cheio (Máx: **${err.cause}**).\nGaste forjando/cozinhando algo antes de resgatar.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                throw err;
            }
        } catch (err) {
            console.error("Erro no comando resgatarforja:", err);

            const erroMsg = {
                content: "Ocorreu um erro ao resgatar seus pontos de forja.",
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
