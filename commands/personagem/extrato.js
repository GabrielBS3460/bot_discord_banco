const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "extrato",

    async execute({ message, prisma, getPersonagemAtivo, formatarMoeda }) {

        try {

            const personagem = await getPersonagemAtivo(message.author.id);

            if (!personagem)
                return message.reply(
                    "Você não tem um personagem ativo. Use `!cadastrar` ou `!personagem trocar`."
                ).catch(()=>{});

            const transacoes = await prisma.transacao.findMany({
                where: { personagem_id: personagem.id },
                orderBy: { data: 'desc' },
                take: 5
            });

            const extratoEmbed = new EmbedBuilder()
                .setColor('#1ABC9C')
                .setTitle(`Extrato de ${personagem.nome}`)
                .addFields({
                    name: 'Saldo Atual',
                    value: `**${formatarMoeda(personagem.saldo)}**`
                });

            if (transacoes.length > 0) {

                const transacoesStr = transacoes.map(t => {

                    const sinal =
                        (t.tipo === 'GASTO' || t.tipo === 'COMPRA') ? '-' : '+';

                    const dataFormatada =
                        new Date(t.data).toLocaleDateString('pt-BR');

                    return `\`${dataFormatada}\` ${sinal} ${formatarMoeda(t.valor)} - *${t.descricao}*`;

                }).join('\n');

                extratoEmbed.addFields({
                    name: 'Últimas Transações',
                    value: transacoesStr
                });

            } else {

                extratoEmbed.addFields({
                    name: 'Últimas Transações',
                    value: 'Nenhuma transação registrada.'
                });

            }

            await message.reply({ embeds: [extratoEmbed] }).catch(()=>{});

        } catch (err) {

            console.error("Erro no comando !extrato:", err);

            await message.reply(
                "Ocorreu um erro ao tentar buscar seu extrato."
            ).catch(()=>{});

        }

    }

};