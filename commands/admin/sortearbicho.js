const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sortearbicho")
        .setDescription("Roda o sorteio semanal do Bicho e paga os vencedores (Apenas Admins)."),

    async execute({ interaction, prisma, ID_CARGO_ADMIN, BICHOS_T20 }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({
                content: "🚫 **Acesso Negado:** Apenas a banca (Admins) pode rodar o sorteio.",
                ephemeral: true
            });
        }

        try {
            const ultimoSorteio = await prisma.sorteiosBicho.findFirst({
                orderBy: { data: "desc" }
            });

            if (ultimoSorteio) {
                const diffDias = (Date.now() - new Date(ultimoSorteio.data)) / (1000 * 60 * 60 * 24);

                if (diffDias < 7) {
                    return interaction.reply({
                        content: `⏳ O sorteio é semanal. Faltam ${(7 - diffDias).toFixed(1)} dias para a próxima rodada.`,
                        ephemeral: true
                    });
                }
            }

            await interaction.deferReply();

            const resultados = [];
            for (let i = 0; i < 5; i++) {
                const num = Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, "0");
                resultados.push(num);
            }

            const apostas = await prisma.apostasBicho.findMany({
                where: { status: "PENDENTE" },
                include: { personagem: true }
            });

            let ganhadoresLog = [];

            await prisma.$transaction(async tx => {
                for (const aposta of apostas) {
                    let multiplicador = 0;

                    if (aposta.tipo === "DEZENA") multiplicador = 2;
                    if (aposta.tipo === "CENTENA") multiplicador = 5;
                    if (aposta.tipo === "MILHAR") multiplicador = 10;

                    if (aposta.posicao === "TODAS") {
                        multiplicador /= 5;
                    }

                    let ganhou = false;

                    for (let i = 0; i < resultados.length; i++) {
                        const resultado = resultados[i];
                        const posicao = (i + 1).toString();

                        if (aposta.posicao !== "TODAS" && aposta.posicao !== posicao) continue;

                        if (aposta.tipo === "DEZENA" && resultado.endsWith(aposta.numero)) ganhou = true;
                        if (aposta.tipo === "CENTENA" && resultado.endsWith(aposta.numero)) ganhou = true;
                        if (aposta.tipo === "MILHAR" && resultado === aposta.numero) ganhou = true;

                        if (ganhou) break;
                    }

                    if (ganhou) {
                        const premio = aposta.valor * multiplicador;

                        ganhadoresLog.push(`🏆 **${aposta.personagem.nome}** ganhou **K$ ${premio}**`);

                        await tx.personagens.update({
                            where: { id: aposta.personagem_id },
                            data: { saldo: { increment: premio } }
                        });

                        await tx.transacao.create({
                            data: {
                                personagem_id: aposta.personagem_id,
                                descricao: `Prêmio Bicho (${aposta.numero})`,
                                valor: premio,
                                tipo: "GANHO"
                            }
                        });

                        await tx.apostasBicho.update({
                            where: { id: aposta.id },
                            data: { status: "GANHOU" }
                        });
                    } else {
                        await tx.apostasBicho.update({
                            where: { id: aposta.id },
                            data: { status: "PERDEU" }
                        });
                    }
                }

                await tx.sorteiosBicho.create({
                    data: { resultados }
                });
            });

            const embed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("🎲 Resultado do Jogo do Bicho")
                .addFields(
                    { name: "1º Prêmio", value: `${resultados[0]} - **${BICHOS_T20[resultados[0].slice(-2)]}**` },
                    { name: "2º Prêmio", value: `${resultados[1]} - **${BICHOS_T20[resultados[1].slice(-2)]}**` },
                    { name: "3º Prêmio", value: `${resultados[2]} - **${BICHOS_T20[resultados[2].slice(-2)]}**` },
                    { name: "4º Prêmio", value: `${resultados[3]} - **${BICHOS_T20[resultados[3].slice(-2)]}**` },
                    { name: "5º Prêmio", value: `${resultados[4]} - **${BICHOS_T20[resultados[4].slice(-2)]}**` }
                );

            if (ganhadoresLog.length > 0) {
                embed.addFields({
                    name: "🎉 Ganhadores",
                    value:
                        ganhadoresLog.slice(0, 20).join("\n") +
                        (ganhadoresLog.length > 20 ? `\n...e mais ${ganhadoresLog.length - 20}` : "")
                });
            } else {
                embed.setFooter({ text: "Nenhum ganhador nesta rodada." });
            }

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro sorteio bicho:", err);

            const erroMsg = "❌ Erro ao realizar o sorteio.";
            if (interaction.deferred) {
                await interaction.editReply({ content: erroMsg });
            } else {
                await interaction.reply({ content: erroMsg, ephemeral: true });
            }
        }
    }
};
