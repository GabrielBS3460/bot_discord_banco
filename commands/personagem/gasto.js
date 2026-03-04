const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "gasto",

    async execute({ message, args, prisma, getPersonagemAtivo, formatarMoeda }) {

        if (args.length < 2)
            return message.reply(
                "Sintaxe incorreta! Use: `!gasto <valor> <motivo do gasto>`"
            ).catch(()=>{});

        const valorGasto = parseFloat(args[0]);
        const motivo = args.slice(1).join(' ');

        if (isNaN(valorGasto) || valorGasto <= 0)
            return message.reply(
                "O valor do gasto deve ser um número positivo."
            ).catch(()=>{});

        try {

            const personagem = await getPersonagemAtivo(message.author.id);

            if (!personagem)
                return message.reply(
                    "Você não tem um personagem ativo. Use `!cadastrar` ou `!personagem trocar`."
                ).catch(()=>{});

            if (personagem.saldo < valorGasto) {
                return message.reply(
                    `Você não tem saldo suficiente! Saldo de **${personagem.nome}**: **${formatarMoeda(personagem.saldo)}**.`
                ).catch(()=>{});
            }

            const [updatedPersonagem] = await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: personagem.id },
                    data: { saldo: { decrement: valorGasto } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: personagem.id,
                        descricao: motivo,
                        valor: valorGasto,
                        tipo: 'GASTO'
                    }
                })
            ]);

            const gastoEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💸 Gasto Registrado')
                .addFields(
                    { name: 'Personagem', value: personagem.nome, inline: true },
                    { name: 'Valor', value: `- ${formatarMoeda(valorGasto)}`, inline: true },
                    { name: 'Novo Saldo', value: `**${formatarMoeda(updatedPersonagem.saldo)}**` },
                    { name: 'Motivo', value: motivo }
                )
                .setTimestamp();

            await message.reply({ embeds: [gastoEmbed] }).catch(()=>{});

        } catch (err) {

            console.error("Erro no comando !gasto:", err);

            await message.reply(
                "Ocorreu um erro ao tentar registrar seu gasto."
            ).catch(()=>{});

        }

    }

};