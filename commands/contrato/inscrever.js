module.exports = {

    name: "inscrever",

    async execute({ message, prisma, getPersonagemAtivo }) {

        try {

            const char = await getPersonagemAtivo(message.author.id);

            if (!char)
                return message.reply(
                    "Você não tem personagem ativo."
                ).catch(()=>{});

            const nomeMissao = message.content
                .replace("!inscrever", "")
                .trim()
                .replace(/"/g, "");

            if (!nomeMissao)
                return message.reply(
                    'Use: `!inscrever "Nome da Missão"`'
                ).catch(()=>{});

            const missao = await prisma.missoes.findUnique({
                where: { nome: nomeMissao }
            });

            if (!missao)
                return message.reply(
                    "Missão não encontrada."
                ).catch(()=>{});

            if (missao.status !== "ABERTA")
                return message.reply(
                    "Esta missão não está aceitando inscrições."
                ).catch(()=>{});

            const nivelMin = missao.nd - 2;
            const nivelMax = missao.nd + 2;

            if (
                char.nivel_personagem < nivelMin ||
                char.nivel_personagem > nivelMax
            ) {
                return message.reply(
                    `🚫 Nível incompatível! Seu nível (${char.nivel_personagem}) deve estar entre ${nivelMin} e ${nivelMax}.`
                ).catch(()=>{});
            }

            await prisma.$transaction(async (tx) => {
                await tx.inscricoes.create({
                    data: {
                        missao_id: missao.id,
                        personagem_id: char.id
                    }
                });

            });

            await message.reply(
                `✅ **${char.nome}** se inscreveu em **${missao.nome}**!`
            ).catch(()=>{});

        }
        catch (err) {

            if (err.code === "P2002") {
                return message.reply(
                    "Você já está inscrito nesta missão."
                ).catch(()=>{});
            }

            if (err.message === "SEM_VAGAS") {
                return message.reply(
                    "🚫 Todas as vagas desta missão já foram preenchidas."
                ).catch(()=>{});
            }

            console.error("Erro no comando inscrever:", err);

            message.reply(
                "Erro ao se inscrever na missão."
            ).catch(()=>{});

        }

    }

};