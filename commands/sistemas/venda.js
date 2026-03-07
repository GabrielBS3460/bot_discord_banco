const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("venda")
        .setDescription("Propõe a venda de um item para outro jogador.")
        .addUserOption(option => 
            option.setName("comprador")
                .setDescription("O jogador que vai comprar o item")
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("item")
                .setDescription("O nome do item que está sendo vendido")
                .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName("valor")
                .setDescription("O valor da venda em Kwanzas")
                .setRequired(true)
                .setMinValue(0.1) 
        )
        .addStringOption(option => 
            option.setName("link")
                .setDescription("Link (http/https) com a imagem ou documento do item")
                .setRequired(true)
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda }) {
        const vendedorUser = interaction.user;
        const compradorUser = interaction.options.getUser("comprador");
        const item = interaction.options.getString("item");
        const valor = interaction.options.getNumber("valor");
        const link = interaction.options.getString("link");

        if (compradorUser.bot) {
            return interaction.reply({ content: "🚫 Bots não compram itens.", ephemeral: true });
        }

        if (compradorUser.id === vendedorUser.id) {
            return interaction.reply({ content: "🚫 Você não pode vender para si mesmo.", ephemeral: true });
        }

        if (!link.startsWith('http://') && !link.startsWith('https://')) {
            return interaction.reply({ content: "🚫 O link do item deve ser válido (começar com http:// ou https://).", ephemeral: true });
        }

        try {
            const [charVendedor, charComprador] = await Promise.all([
                getPersonagemAtivo(vendedorUser.id),
                getPersonagemAtivo(compradorUser.id)
            ]);

            if (!charVendedor) {
                return interaction.reply({ content: "🚫 Você (vendedor) não tem um personagem ativo.", ephemeral: true });
            }

            if (!charComprador) {
                return interaction.reply({ content: `🚫 O comprador **${compradorUser.username}** não tem um personagem ativo.`, ephemeral: true });
            }

            if (charComprador.saldo < valor) {
                return interaction.reply({
                    content: `🚫 **${charComprador.nome}** não tem saldo suficiente para essa compra (Saldo: ${formatarMoeda(charComprador.saldo)}).`,
                    ephemeral: true
                });
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

            if (/\.(jpeg|jpg|gif|png|webp)$/i.test(link)) {
                propostaEmbed.setThumbnail(link);
            }

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

            const msg = await interaction.reply({
                content: `<@${compradorUser.id}>`,
                embeds: [propostaEmbed],
                components: [botoes],
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === compradorUser.id || i.user.id === vendedorUser.id,
                time: 60000
            });

            collector.on('collect', async iBtn => {
                await iBtn.deferUpdate();

                if (iBtn.customId === 'cancelar_venda') {
                    const canceladoEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('✖️ Venda Cancelada')
                        .setDescription(`A venda de **${item}** foi cancelada por ${iBtn.user.username}.`);

                    await msg.edit({ content: null, embeds: [canceladoEmbed], components: [] });
                    return collector.stop('cancelado');
                }

                if (iBtn.customId === 'confirmar_venda') {
                    if (iBtn.user.id !== compradorUser.id) {
                        return iBtn.followUp({ content: "🚫 Apenas o comprador pode aceitar a venda.", ephemeral: true });
                    }

                    try {
                        const cFinal = await prisma.personagens.findUnique({ where: { id: charComprador.id } });
                        if (cFinal.saldo < valor) {
                            await msg.edit({
                                content: "❌ O comprador não tem mais saldo suficiente.",
                                embeds: [],
                                components: []
                            });
                            return collector.stop('sem_saldo');
                        }

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

                        if (/\.(jpeg|jpg|gif|png|webp)$/i.test(link)) {
                            sucesso.setThumbnail(link);
                        }

                        await msg.edit({ content: null, embeds: [sucesso], components: [] });

                    } catch (err) {
                        console.error("Erro na transação de venda:", err);
                        await msg.edit({
                            content: '❌ Ocorreu um erro ao processar a venda no banco de dados.',
                            embeds: [],
                            components: []
                        });
                    }
                    collector.stop('concluido');
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    const expiradoEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('⌛ Proposta Expirada')
                        .setDescription(`A oferta de venda de **${item}** expirou porque o comprador não respondeu.`);

                    msg.edit({ content: null, embeds: [expiradoEmbed], components: [] }).catch(()=>{});
                }
            });

        } catch (err) {
            console.error("Erro ao processar venda:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao iniciar a proposta de venda.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};