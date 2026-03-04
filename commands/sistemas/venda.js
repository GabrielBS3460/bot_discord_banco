const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {

    name: "venda",

    async execute({ message, args, prisma, getPersonagemAtivo, formatarMoeda }) {

        const vendedorUser = message.author;

        const compradorMencionado = message.mentions.users.first();

        if (!compradorMencionado || compradorMencionado.bot)
            return message.reply("Mencione um comprador válido. Ex: `!venda @Player 100 Item Link`").catch(()=>{});

        if (compradorMencionado.id === vendedorUser.id)
            return message.reply("Não pode vender para si mesmo.").catch(()=>{});

        const link = args.find(arg =>
            arg.startsWith('http://') || arg.startsWith('https://')
        );

        const valorStr = args.find(arg =>
            !isNaN(parseFloat(arg)) &&
            !arg.includes('<@') &&
            !arg.startsWith('http')
        );

        const valor = parseFloat(valorStr);

        if (isNaN(valor) || valor <= 0)
            return message.reply("Valor inválido. Informe um preço positivo.").catch(()=>{});

        if (!link)
            return message.reply("Você precisa fornecer um link (http/https) para o item.").catch(()=>{});

        const itemParts = args.filter(arg =>
            !arg.includes(compradorMencionado.id) &&
            arg !== link &&
            arg !== valorStr
        );

        const item = itemParts.join(' ');

        if (!item)
            return message.reply("Você precisa escrever o nome do item.").catch(()=>{});

        try {

            const [charVendedor, charComprador] = await Promise.all([
                getPersonagemAtivo(vendedorUser.id),
                getPersonagemAtivo(compradorMencionado.id)
            ]);

            if (!charVendedor)
                return message.reply("Você (vendedor) não tem personagem ativo.").catch(()=>{});

            if (!charComprador)
                return message.reply(`O comprador ${compradorMencionado.username} não tem personagem ativo.`).catch(()=>{});

            if (charComprador.saldo < valor) {
                return message.reply(
                    `**${charComprador.nome}** não tem saldo suficiente (Saldo: ${formatarMoeda(charComprador.saldo)}).`
                ).catch(()=>{});
            }

            const propostaEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('❓ Proposta de Venda')
                .setDescription(`**${charVendedor.nome}** quer vender **[${item}](${link})** para **${charComprador.nome}**.`)
                .addFields(
                    { name: 'Valor', value: formatarMoeda(valor) },
                    { name: 'Comprador', value: `Aguardando confirmação de ${charComprador.nome}...` }
                )
                .setFooter({ text: 'Expira em 60 segundos.' });

            if (/\.(jpeg|jpg|gif|png|webp)$/i.test(link))
                propostaEmbed.setThumbnail(link);

            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirmar_venda')
                    .setLabel('Comprar')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✔️'),

                new ButtonBuilder()
                    .setCustomId('cancelar_venda')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✖️')
            );

            const msg = await message.channel.send({
                content: `${compradorMencionado}`,
                embeds: [propostaEmbed],
                components: [botoes]
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === compradorMencionado.id,
                time: 60000
            });

            collector.on('collect', async interaction => {

                await interaction.deferUpdate();

                if (interaction.customId === 'confirmar_venda') {

                    try {

                        await prisma.$transaction([

                            prisma.personagens.update({
                                where: { id: charComprador.id },
                                data: { saldo: { decrement: valor } }
                            }),

                            prisma.transacao.create({
                                data: {
                                    personagem_id: charComprador.id,
                                    descricao: `Comprou ${item} de ${charVendedor.nome}`,
                                    valor: valor,
                                    tipo: 'COMPRA'
                                }
                            }),

                            prisma.personagens.update({
                                where: { id: charVendedor.id },
                                data: { saldo: { increment: valor } }
                            }),

                            prisma.transacao.create({
                                data: {
                                    personagem_id: charVendedor.id,
                                    descricao: `Vendeu ${item} para ${charComprador.nome}`,
                                    valor: valor,
                                    tipo: 'VENDA'
                                }
                            })

                        ]);

                        const sucesso = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Venda Concluída')
                            .setDescription(`**[${item}](${link})** foi transferido com sucesso!`)
                            .addFields(
                                { name: 'Vendedor', value: charVendedor.nome, inline: true },
                                { name: 'Comprador', value: charComprador.nome, inline: true },
                                { name: 'Valor', value: formatarMoeda(valor) }
                            );

                        if (/\.(jpeg|jpg|gif|png|webp)$/i.test(link))
                            sucesso.setThumbnail(link);

                        await msg.edit({ embeds: [sucesso], components: [] });

                    } catch (err) {

                        console.error("Erro na transação de venda:", err);

                        await msg.edit({
                            content: '❌ Ocorreu um erro ao processar a venda.',
                            embeds: [],
                            components: []
                        });

                    }

                    collector.stop('concluido');
                }

                else if (interaction.customId === 'cancelar_venda') {

                    const canceladoEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('✖️ Venda Cancelada')
                        .setDescription(`A venda de **${item}** foi recusada pelo comprador.`);

                    await msg.edit({ embeds: [canceladoEmbed], components: [] });

                    collector.stop('cancelado');
                }

            });

            collector.on('end', (collected, reason) => {

                if (reason === 'time') {

                    const expiradoEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('⌛ Proposta Expirada')
                        .setDescription(`A oferta de venda de **${item}** expirou porque o comprador não respondeu.`);

                    msg.edit({ embeds: [expiradoEmbed], components: [] }).catch(()=>{});
                }

            });

        } catch (err) {

            console.error(err);

            message.reply("Erro ao processar venda.").catch(()=>{});
        }

    }

};