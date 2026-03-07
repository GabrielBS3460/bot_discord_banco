const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("personagem")
        .setDescription("Gerencia seus personagens.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("listar")
                .setDescription("Lista todos os seus personagens criados.")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("trocar")
                .setDescription("Troca o seu personagem ativo.")
                .addStringOption(option => 
                    option.setName("nome")
                        .setDescription("Nome exato do personagem que deseja ativar")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("apagar")
                .setDescription("Apaga permanentemente um personagem seu.")
                .addStringOption(option => 
                    option.setName("nome")
                        .setDescription("Nome exato do personagem a ser apagado")
                        .setRequired(true)
                )
        ),

    async execute({ interaction, prisma, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();

        try {
            if (subcomando === 'listar') {
                const personagens = await prisma.personagens.findMany({
                    where: { usuario_id: interaction.user.id }
                });

                if (personagens.length === 0) {
                    return interaction.reply({ 
                        content: "🚫 Você não tem personagens. Use `/cadastrar`.", 
                        ephemeral: true 
                    });
                }

                const usuario = await prisma.usuarios.findUnique({
                    where: { discord_id: interaction.user.id }
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

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            else if (subcomando === 'trocar') {
                const nomeAlvo = interaction.options.getString("nome").trim();

                const personagemAlvo = await prisma.personagens.findFirst({
                    where: {
                        nome: { equals: nomeAlvo, mode: 'insensitive' },
                        usuario_id: interaction.user.id
                    }
                });

                if (!personagemAlvo) {
                    return interaction.reply({ 
                        content: "🚫 Você não possui um personagem com esse nome.", 
                        ephemeral: true 
                    });
                }

                await prisma.usuarios.update({
                    where: { discord_id: interaction.user.id },
                    data: { personagem_ativo_id: personagemAlvo.id }
                });

                return interaction.reply({ 
                    content: `🔄 Você agora está jogando como **${personagemAlvo.nome}**!`
                });
            }

            else if (subcomando === 'apagar') {
                const nomeAlvo = interaction.options.getString("nome").trim();

                const personagemAlvo = await prisma.personagens.findFirst({
                    where: {
                        nome: { equals: nomeAlvo, mode: 'insensitive' },
                        usuario_id: interaction.user.id
                    }
                });

                if (!personagemAlvo) {
                    return interaction.reply({ 
                        content: "🚫 Você não possui um personagem com esse nome.", 
                        ephemeral: true 
                    });
                }

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

                const mensagemConfirmacao = await interaction.reply({
                    embeds: [confirmacaoEmbed],
                    components: [botoes],
                    ephemeral: true,
                    fetchReply: true
                });

                const collector = mensagemConfirmacao.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async iBtn => {
                    try {
                        if (iBtn.customId === 'confirmar_apagar') {
                            const usuario = await prisma.usuarios.findUnique({
                                where: { discord_id: interaction.user.id }
                            });

                            if (usuario?.personagem_ativo_id === personagemAlvo.id) {
                                await prisma.usuarios.update({
                                    where: { discord_id: interaction.user.id },
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

                            await iBtn.update({ embeds: [sucessoEmbed], components: [] });
                        } else {
                            await iBtn.update({
                                content: 'Ação cancelada.',
                                embeds: [],
                                components: []
                            });
                        }
                    } catch (err) {
                        console.error("Erro ao apagar personagem:", err);
                        await iBtn.update({
                            content: "Ocorreu um erro ao apagar o personagem.",
                            embeds: [],
                            components: []
                        }).catch(()=>{});
                    }
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        await interaction.editReply({
                            content: '⏱️ Confirmação expirada.',
                            embeds: [],
                            components: []
                        }).catch(()=>{});
                    }
                });
            }

        } catch (err) {
            console.error("Erro no comando personagem:", err);
            
            const erroMsg = { content: "❌ Ocorreu um erro ao executar este comando.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};