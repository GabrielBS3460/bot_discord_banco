const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const ApostaService = require("../../services/ApostaService.js");
const SorteioRepository = require("../../repositories/SorteioRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sortearbicho")
        .setDescription("Roda o sorteio semanal do Bicho e paga os vencedores (Apenas Admins)."),

    async execute({ interaction, ID_CARGO_ADMIN, BICHOS_T20 }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({
                content: "🚫 Apenas a banca pode rodar o sorteio.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const ultimo = await SorteioRepository.buscarUltimo();
            if (ultimo) {
                const diffDias = (Date.now() - new Date(ultimo.data)) / (1000 * 60 * 60 * 24);
                if (diffDias < 7) {
                    return interaction.reply({
                        content: `⏳ O sorteio é semanal. Faltam ${(7 - diffDias).toFixed(1)} dias.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            await interaction.deferReply();

            const resultados = Array.from({ length: 5 }, () =>
                Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, "0")
            );

            const ganhadores = await ApostaService.realizarSorteio(resultados);

            const embed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("🎲 Resultado do Jogo do Bicho")
                .setDescription("O sorteio semanal foi realizado! Confira os números:")
                .addFields(
                    resultados.map((res, i) => ({
                        name: `${i + 1}º Prêmio`,
                        value: `**${res}** - ${BICHOS_T20[res.slice(-2)] || "Desconhecido"}`,
                        inline: true
                    }))
                );

            if (ganhadores.length > 0) {
                const lista = ganhadores.map(g => `🏆 **${g.nome}** ganhou **K$ ${g.valor}**`).join("\n");
                embed.addFields({
                    name: "🎉 Ganhadores",
                    value: lista.length > 1024 ? lista.slice(0, 1000) + "..." : lista
                });
            } else {
                embed.setFooter({ text: "Nenhum ganhador nesta rodada. A casa ganha!" });
            }

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            const msg = "❌ Erro ao realizar o sorteio.";
            interaction.deferred
                ? await interaction.editReply(msg)
                : await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
