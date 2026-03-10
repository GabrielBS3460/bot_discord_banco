const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("resgatarforja").setDescription("Resgata seus pontos de forja diários."),

    async execute({ interaction, prisma, getPersonagemAtivo }) {
        try {
            const ativo = await getPersonagemAtivo(interaction.user.id);

            const char = await prisma.personagens.findFirst({
                where: { id: ativo?.id },
                include: { classes: true }
            });

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem personagem ativo.",
                    ephemeral: true
                });
            }

            if (!char.pontos_forja_max || char.pontos_forja_max <= 0) {
                return interaction.reply({
                    content: "⚠️ Você ainda não configurou sua Forja! Use `/setforja` primeiro.",
                    ephemeral: true
                });
            }

            if (char.ultimo_resgate_forja) {
                const agora = new Date();
                const ultimo = new Date(char.ultimo_resgate_forja);

                const mesmoDia =
                    agora.getDate() === ultimo.getDate() &&
                    agora.getMonth() === ultimo.getMonth() &&
                    agora.getFullYear() === ultimo.getFullYear();

                if (mesmoDia) {
                    return interaction.reply({
                        content: `🚫 **${char.nome}** já pegou seus pontos de forja hoje!`,
                        ephemeral: true
                    });
                }
            }

            const nivelReal = char.nivel_personagem || 3;
            let patamar = 1;

            if (nivelReal >= 5) patamar = 2;
            if (nivelReal >= 11) patamar = 3;
            if (nivelReal >= 17) patamar = 4;

            const ganhoDiario = char.pontos_forja_max;

            const limiteAcumulo = ganhoDiario * (patamar + 3);

            let novoTotal = char.pontos_forja_atual + ganhoDiario;

            if (novoTotal > limiteAcumulo) {
                novoTotal = limiteAcumulo;
            }

            const ganhou = novoTotal - char.pontos_forja_atual;

            if (ganhou <= 0) {
                return interaction.reply({
                    content: `⚠️ Seu estoque de pontos está cheio (Máx: **${limiteAcumulo}**).\nGaste forjando/cozinhando algo antes de resgatar.`,
                    ephemeral: true
                });
            }

            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: char.id },
                    data: {
                        pontos_forja_atual: novoTotal,
                        ultimo_resgate_forja: new Date()
                    }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: char.id,
                        descricao: `Resgate Forja Diário (+${ganhou})`,
                        valor: 0,
                        tipo: "FORJA"
                    }
                })
            ]);

            await interaction.reply({
                content:
                    `🔨 **Forja:** Você recebeu **${ganhou.toFixed(1)}** pontos!\n` +
                    `📊 **Total:** ${novoTotal.toFixed(1)} / Máx: ${limiteAcumulo}\n` +
                    `*(Patamar: ${patamar} | Ganho Diário: ${ganhoDiario})*`
            });
        } catch (err) {
            console.error("Erro no comando resgatarforja:", err);

            const erroMsg = { content: "Ocorreu um erro ao resgatar seus pontos de forja.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
