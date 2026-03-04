module.exports = {

    name: "resgatarforja",

    async execute({ message, prisma, getPersonagemAtivo }) {

        try {

            const ativo = await getPersonagemAtivo(message.author.id);

            const char = await prisma.personagens.findFirst({
                where: { id: ativo?.id },
                include: { classes: true }
            });

            if (!char)
                return message.reply("Você não tem personagem ativo.").catch(()=>{});

            if (!char.pontos_forja_max || char.pontos_forja_max <= 0) {
                return message.reply(
                    "⚠️ Você ainda não configurou sua Forja! Use `!setforja <quantidade_de_poderes>` primeiro."
                ).catch(()=>{});
            }

            if (char.ultimo_resgate_forja) {

                const agora = new Date();
                const ultimo = new Date(char.ultimo_resgate_forja);

                const mesmoDia =
                    agora.getDate() === ultimo.getDate() &&
                    agora.getMonth() === ultimo.getMonth() &&
                    agora.getFullYear() === ultimo.getFullYear();

                if (mesmoDia) {
                    return message.reply(
                        `🚫 **${char.nome}** já pegou seus pontos de forja hoje!`
                    ).catch(()=>{});
                }
            }

            const nivelReal = char.nivel_personagem || 3;

            let patamar = 1;

            if (nivelReal >= 5) patamar = 2;
            if (nivelReal >= 11) patamar = 3;
            if (nivelReal >= 17) patamar = 4;

            const ganhoDiario = char.pontos_forja_max;

            const limiteAcumulo = ganhoDiario * (patamar + 1);

            let novoTotal = char.pontos_forja_atual + ganhoDiario;

            if (novoTotal > limiteAcumulo)
                novoTotal = limiteAcumulo;

            const ganhou = novoTotal - char.pontos_forja_atual;

            if (ganhou <= 0) {
                return message.reply(
                    `⚠️ Seu estoque de pontos está cheio (Máx: **${limiteAcumulo}**).\nGaste forjando/cozinhando algo antes de resgatar.`
                ).catch(()=>{});
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
                        tipo: 'FORJA'
                    }
                })

            ]);

            await message.reply(
                `🔨 **Forja:** Você recebeu **${ganhou.toFixed(1)}** pontos!\n` +
                `📊 **Total:** ${novoTotal.toFixed(1)} / Máx: ${limiteAcumulo}\n` +
                `*(Patamar: ${patamar} | Ganho Diário: ${ganhoDiario})*`
            ).catch(()=>{});

        } catch (err) {

            console.error("Erro no comando resgatarforja:", err);

            message.reply(
                "Ocorreu um erro ao resgatar seus pontos de forja."
            ).catch(()=>{});
        }

    }

};