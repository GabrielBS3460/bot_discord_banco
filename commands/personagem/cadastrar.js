module.exports = {

    name: "cadastrar",

    async execute({ message, args, prisma }) {

        const nomePersonagem = args.join(' ');

        if (!nomePersonagem) {
            return message.reply(
                "Uso incorreto! Digite `!cadastrar <nome do seu personagem>`."
            ).catch(()=>{});
        }

        try {

            await prisma.usuarios.upsert({
                where: { discord_id: message.author.id },
                update: {},
                create: { discord_id: message.author.id }
            });

            const contagem = await prisma.personagens.count({
                where: { usuario_id: message.author.id }
            });

            if (contagem >= 3) {
                return message.reply(
                    "🚫 Você já atingiu o limite de 3 personagens!"
                ).catch(()=>{});
            }

            const novoPersonagem = await prisma.personagens.create({
                data: {
                    nome: nomePersonagem,
                    usuario_id: message.author.id,
                    saldo: 0
                }
            });

            if (contagem === 0) {

                await prisma.usuarios.update({
                    where: { discord_id: message.author.id },
                    data: { personagem_ativo_id: novoPersonagem.id }
                });

                return message.reply(
                    `✅ Personagem **${novoPersonagem.nome}** criado e selecionado como ativo!`
                ).catch(()=>{});

            } else {

                return message.reply(
                    `✅ Personagem **${novoPersonagem.nome}** criado! Use \`!personagem trocar ${novoPersonagem.nome}\` para jogar com ele.`
                ).catch(()=>{});

            }

        } catch (err) {

            if (err.code === 'P2002') {
                return message.reply(
                    "Já existe um personagem com este nome no servidor. Escolha outro."
                ).catch(()=>{});
            }

            console.error("Erro ao cadastrar:", err);

            return message.reply(
                "Ocorreu um erro ao criar o personagem."
            ).catch(()=>{});
        }

    }

};