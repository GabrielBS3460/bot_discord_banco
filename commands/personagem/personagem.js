const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {

    name: "personagem",

    async execute({ message, args, prisma, formatarMoeda }) {

        try {

            const subcomando = args[0]?.toLowerCase();

            if (subcomando === 'listar') {

                const personagens = await prisma.personagens.findMany({
                    where: { usuario_id: message.author.id }
                });

                if (personagens.length === 0)
                    return message.reply("Você não tem personagens. Use `!cadastrar`.").catch(()=>{});

                const usuario = await prisma.usuarios.findUnique({
                    where: { discord_id: message.author.id }
                });

                const ativoId = usuario?.personagem_ativo_id;

                const lista = personagens.map(p => {
                    const ativo = p.id === ativoId ? " (⭐ Ativo)" : "";
                    return `• **${p.nome}**${ativo} - Saldo: ${formatarMoeda(p.saldo)}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('📜 Seus Personagens')
                    .setDescription(lista);

                return message.reply({ embeds: [embed] }).catch(()=>{});
            }

            else if (subcomando === 'trocar') {

                const nomeAlvo = args.slice(1).join(' ').trim();

                if (!nomeAlvo)
                    return message.reply("Use: `!personagem trocar <nome do personagem>`").catch(()=>{});

                const personagemAlvo = await prisma.personagens.findFirst({
                    where: {
                        nome: { equals: nomeAlvo, mode: 'insensitive' },
                        usuario_id: message.author.id
                    }
                });

                if (!personagemAlvo)
                    return message.reply("Você não possui um personagem com esse nome.").catch(()=>{});

                await prisma.usuarios.update({
                    where: { discord_id: message.author.id },
                    data: { personagem_ativo_id: personagemAlvo.id }
                });

                return message.reply(`🔄 Você agora está jogando como **${personagemAlvo.nome}**!`).catch(()=>{});
            }

            else if (subcomando === 'apagar') {

                const nomeAlvo = args.slice(1).join(' ').trim();

                if (!nomeAlvo)
                    return message.reply("Use: `!personagem apagar <nome do personagem>`").catch(()=>{});

                const personagemAlvo = await prisma.personagens.findFirst({
                    where: {
                        nome: { equals: nomeAlvo, mode: 'insensitive' },
                        usuario_id: message.author.id
                    }
                });

                if (!personagemAlvo)
                    return message.reply("Você não possui um personagem com esse nome.").catch(()=>{});

                const confirmacaoEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`⚠️ Confirmação de Exclusão`)
                    .setDescription(`Você tem certeza que deseja apagar o personagem **${personagemAlvo.nome}**?`)
                    .addFields({
                        name: 'Consequências',
                        value: 'Todo o histórico, saldo e itens deste personagem serão apagados permanentemente.'
                    })
                    .setFooter({ text: 'Esta confirmação expira em 30 segundos.' });

                const botoes = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirmar_apagar')
                        .setLabel('Sim, apagar')
                        .setStyle(ButtonStyle.Danger),

                    new ButtonBuilder()
                        .setCustomId('cancelar_apagar')
                        .setLabel('Cancelar')
                        .setStyle(ButtonStyle.Secondary)
                );

                const mensagemConfirmacao = await message.reply({
                    embeds: [confirmacaoEmbed],
                    components: [botoes],
                    fetchReply: true
                });

                const filter = i => i.user.id === message.author.id;

                const collector = mensagemConfirmacao.createMessageComponentCollector({
                    filter,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async interaction => {

                    try {

                        await interaction.deferUpdate();

                        if (interaction.customId === 'confirmar_apagar') {

                            const usuario = await prisma.usuarios.findUnique({
                                where: { discord_id: message.author.id }
                            });

                            if (usuario?.personagem_ativo_id === personagemAlvo.id) {
                                await prisma.usuarios.update({
                                    where: { discord_id: message.author.id },
                                    data: { personagem_ativo_id: null }
                                });
                            }

                            await prisma.$transaction([
                                prisma.transacao.deleteMany({ where: { personagem_id: personagemAlvo.id } }),
                                prisma.personagens.delete({ where: { id: personagemAlvo.id } })
                            ]);

                            const sucessoEmbed = new EmbedBuilder()
                                .setColor('#808080')
                                .setTitle('🗑️ Personagem Apagado')
                                .setDescription(`O personagem **${personagemAlvo.nome}** foi removido.`);

                            await interaction.editReply({ embeds: [sucessoEmbed], components: [] });

                        } else {

                            await interaction.editReply({
                                content: 'Ação cancelada.',
                                embeds: [],
                                components: []
                            });

                        }

                    } catch (err) {

                        console.error("Erro ao apagar personagem:", err);

                        if (!interaction.replied)
                            await interaction.editReply({
                                content: "Ocorreu um erro ao apagar o personagem.",
                                embeds: [],
                                components: []
                            }).catch(()=>{});

                    }

                });

                collector.on('end', async collected => {

                    if (collected.size === 0) {

                        await mensagemConfirmacao.edit({
                            content: '⏱️ Confirmação expirada.',
                            embeds: [],
                            components: []
                        }).catch(()=>{});

                    }

                });

            }

            else {

                return message.reply(
                    "Comandos disponíveis:\n`!personagem listar`\n`!personagem trocar <nome>`\n`!personagem apagar <nome>`"
                ).catch(()=>{});

            }

        } catch (err) {

            console.error("Erro no comando personagem:", err);

            return message.reply("Ocorreu um erro ao executar este comando.").catch(()=>{});

        }

    }

};