const {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    UserSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("painelcontrato")
        .setDescription("Abre o painel de gerenciamento de um contrato/missão (Apenas Mestre Criador).")
        .addStringOption(option => 
            option.setName("nome")
                .setDescription("Nome exato do contrato/missão")
                .setRequired(true)
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, ID_CARGO_ADMIN }) {
        const nomeMissao = interaction.options.getString("nome").trim();

        const missao = await prisma.missoes.findUnique({
            where: { nome: nomeMissao },
            include: {
                inscricoes: {
                    include: { personagem: true }
                }
            }
        });

        if (!missao) {
            return interaction.reply({ 
                content: "🚫 Contrato não encontrado. Verifique se o nome foi digitado corretamente.", 
                ephemeral: true 
            });
        }

        if (missao.criador_id !== interaction.user.id && !interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({
                content: "🚫 Apenas o Mestre criador da missão (ou um Admin) pode gerenciar este contrato.",
                ephemeral: true
            });
        }

        const shuffle = array => [...array].sort(() => Math.random() - 0.5);

        const montarPainel = m => {
            const selecionados = m.inscricoes.filter(i => i.selecionado);
            const fila = shuffle(m.inscricoes.filter(i => !i.selecionado));

            const txtSelecionados = selecionados
                .map(i => `✅ **${i.personagem.nome}** (Nvl ${i.personagem.nivel_personagem})`)
                .join("\n") || "Ninguém selecionado.";

            const txtFila = fila
                .map(i => `⏳ **${i.personagem.nome}**`)
                .join("\n") || "Fila vazia.";

            return new EmbedBuilder()
                .setColor(m.status === "CONCLUIDA" ? "#00FF00" : "#FFA500")
                .setTitle(`🛡️ Gestão: ${m.nome}`)
                .setDescription(`**ND:** ${m.nd} | **Vagas:** ${m.vagas}\n**Status:** ${m.status}`)
                .addFields(
                    {
                        name: `Equipe (${selecionados.length}/${m.vagas})`,
                        value: txtSelecionados,
                        inline: true
                    },
                    {
                        name: "Fila de Espera",
                        value: txtFila,
                        inline: true
                    }
                );
        };

        const montarBotoes = m => {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ms_sortear")
                    .setLabel("Sortear Equipe")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(m.status !== "ABERTA"),
                new ButtonBuilder()
                    .setCustomId("ms_add_player")
                    .setLabel("Adicionar Player")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("➕")
                    .setDisabled(m.status === "CONCLUIDA"),
                new ButtonBuilder()
                    .setCustomId("ms_gerenciar")
                    .setLabel("Substituir Jogador")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("👥")
                    .setDisabled(m.status === "CONCLUIDA")
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ms_iniciar")
                    .setLabel("Iniciar Missão")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(m.status !== "ABERTA"),
                new ButtonBuilder()
                    .setCustomId("ms_concluir")
                    .setLabel("Concluir Missão")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(m.status === "CONCLUIDA"),
                new ButtonBuilder()
                    .setCustomId("ms_alterar_vagas")
                    .setLabel("Vagas")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🔢")
                    .setDisabled(m.status === "CONCLUIDA"),    
                new ButtonBuilder()
                    .setCustomId("ms_atualizar")
                    .setLabel("🔄 Atualizar Lista")
                    .setStyle(ButtonStyle.Secondary)    
            );

            return [row1, row2];
        };

        const msg = await interaction.reply({
            embeds: [montarPainel(missao)],
            components: montarBotoes(missao),
            ephemeral: true,
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 3600000, 
            idle: 300000   
        });

        collector.on("collect", async iBtn => {
            if (!iBtn.isButton() && !iBtn.isUserSelectMenu() && !iBtn.isStringSelectMenu()) return;

            try {
                if (iBtn.customId === 'ms_add_player') {
                    const userMenu = new UserSelectMenuBuilder()
                        .setCustomId('menu_pesquisa_player')
                        .setPlaceholder('Pesquise e selecione o jogador...')
                        .setMinValues(1)
                        .setMaxValues(1);

                    const rowUser = new ActionRowBuilder().addComponents(userMenu);

                    const menuMsg = await iBtn.reply({ 
                        content: "👥 **Selecione abaixo o jogador que deseja adicionar à missão:**", 
                        components: [rowUser], 
                        flags: MessageFlags.Ephemeral, 
                        withResponse: true 
                    });

                    const selectCollector = menuMsg.resource.message.createMessageComponentCollector({ 
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000 
                    });

                    selectCollector.on('collect', async iSelect => {
                        await iSelect.deferUpdate(); 
                        const targetId = iSelect.values[0]; 

                        const targetChar = await getPersonagemAtivo(targetId);
                        if (!targetChar) {
                            return iSelect.followUp({ content: "⚠️ O jogador selecionado não possui um personagem ativo.", flags: MessageFlags.Ephemeral });
                        }

                        const jaInscrito = await prisma.inscricoes.findFirst({
                            where: { missao_id: missao.id, personagem_id: targetChar.id }
                        });

                        if (jaInscrito) {
                            if (!jaInscrito.selecionado) {
                                await prisma.inscricoes.update({ where: { id: jaInscrito.id }, data: { selecionado: true } });
                            } else {
                                return iSelect.followUp({ content: "⚠️ Esse jogador já está na equipe selecionada.", flags: MessageFlags.Ephemeral });
                            }
                        } else {
                            await prisma.inscricoes.create({
                                data: {
                                    missao_id: missao.id,
                                    personagem_id: targetChar.id,
                                    selecionado: true,
                                    recompensa_resgatada: false
                                }
                            });
                        }

                        const mNova = await prisma.missoes.findUnique({ where: { id: missao.id }, include: { inscricoes: { include: { personagem: true } } } });
                        await interaction.editReply({ embeds: [montarPainel(mNova)], components: montarBotoes(mNova) });
                                            
                        await iSelect.editReply({ content: `✅ **${targetChar.nome}** foi adicionado à equipe com sucesso!`, components: [] });
                        selectCollector.stop();
                    });
                    return; 
                }

                if (iBtn.customId === 'ms_sortear') {
                    await iBtn.deferUpdate();

                    const mAtual = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } }
                    });

                    let vagasRestantes = mAtual.vagas - mAtual.inscricoes.filter(insc => insc.selecionado).length;

                    if (vagasRestantes <= 0) {
                        return iBtn.followUp({ content: "🚫 A equipe já está cheia.", flags: MessageFlags.Ephemeral });
                    }

                    const candidatos = mAtual.inscricoes.filter(insc => !insc.selecionado);
                    const sorteados = shuffle(candidatos).slice(0, vagasRestantes);

                    if (sorteados.length > 0) {
                        await prisma.inscricoes.updateMany({
                            where: { id: { in: sorteados.map(s => s.id) } },
                            data: { selecionado: true }
                        });
                    }

                    const mNova = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } } 
                    });

                    await interaction.editReply({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    });
                    return;
                }

                if (iBtn.customId === 'ms_gerenciar') {
                    const mAtual = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } }
                    });

                    const selecionados = mAtual.inscricoes.filter(insc => insc.selecionado);

                    if (selecionados.length === 0) {
                        return iBtn.reply({ content: "🚫 Ninguém na equipe para remover.", flags: MessageFlags.Ephemeral });
                    }

                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('menu_remover_jogador')
                        .setPlaceholder('Selecione quem VAI SAIR do contrato')
                        .setMinValues(1)
                        .setMaxValues(1);

                    selecionados.forEach(insc => {
                        menu.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(insc.personagem.nome)
                                .setValue(String(insc.id)) 
                                .setEmoji('❌')
                        );
                    });

                    const rowMenu = new ActionRowBuilder().addComponents(menu);

                    await iBtn.reply({
                        content: "Quem deve ser removido? O próximo da fila entrará automaticamente.",
                        components: [rowMenu],
                        ephemeral: true
                    });

                    const replyMsg = await iBtn.fetchReply();

                    const menuCollector = replyMsg.createMessageComponentCollector({
                        filter: i => i.user.id === iBtn.user.id && i.customId === 'menu_remover_jogador',
                        time: 60000,
                        max: 1
                    });

                    menuCollector.on('collect', async iMenu => {
                        try {
                            await iMenu.deferUpdate();
                            
                            const idRemover = parseInt(iMenu.values[0]);

                            await prisma.$transaction(async tx => {
                                await tx.inscricoes.delete({ where: { id: idRemover } });

                                const fila = await tx.inscricoes.findMany({
                                    where: { missao_id: missao.id, selecionado: false }
                                });

                                const filaEmbaralhada = shuffle(fila);
                                const proximoFila = filaEmbaralhada[0];

                                if (proximoFila) {
                                    await tx.inscricoes.update({
                                        where: { id: proximoFila.id },
                                        data: { selecionado: true }
                                    });
                                }
                            });

                            const mFinal = await prisma.missoes.findUnique({
                                where: { id: missao.id },
                                include: { inscricoes: { include: { personagem: true } } } 
                            });

                            await interaction.editReply({
                                embeds: [montarPainel(mFinal)],
                                components: montarBotoes(mFinal)
                            });

                            await iMenu.editReply({ 
                                content: "✅ Jogador removido com sucesso. Painel atualizado.", 
                                components: [] 
                            });

                        } catch (erroDB) {
                            console.error("Erro ao remover jogador da missão:", erroDB);
                            await iMenu.editReply({
                                content: "❌ Erro ao remover o jogador. Verifique o terminal para mais detalhes.",
                                components: []
                            }).catch(()=>{});
                        }
                    });

                    return;
                }

                if (iBtn.customId === 'ms_alterar_vagas') {
                    const mAtual = await prisma.missoes.findUnique({ where: { id: missao.id } });

                    const modalCustomId = `modal_vagas_${missao.id}_${Date.now()}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalCustomId)
                        .setTitle('Alterar Número de Vagas')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('inp_vagas')
                                    .setLabel('Novo limite de jogadores')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                                    .setValue(String(mAtual.vagas))
                            )
                        );

                    await iBtn.showModal(modal);

                    try {
                        const modalSubmit = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                            time: 60000
                        });

                        await modalSubmit.deferUpdate();

                        const novasVagas = parseInt(modalSubmit.fields.getTextInputValue('inp_vagas'));

                        if (isNaN(novasVagas) || novasVagas <= 0) {
                            return modalSubmit.followUp({ 
                                content: "🚫 Valor inválido. Digite um número maior que zero.", 
                                ephemeral: true 
                            });
                        }

                        await prisma.missoes.update({
                            where: { id: missao.id },
                            data: { vagas: novasVagas }
                        });

                        const mFinal = await prisma.missoes.findUnique({
                            where: { id: missao.id },
                            include: { inscricoes: { include: { personagem: true } } }
                        });

                        await interaction.editReply({
                            embeds: [montarPainel(mFinal)],
                            components: montarBotoes(mFinal)
                        });

                        await modalSubmit.followUp({ 
                            content: `✅ Limite de vagas alterado para **${novasVagas}** com sucesso!`, 
                            ephemeral: true 
                        });

                    } catch (err) {
                        console.error("Erro ao alterar vagas:", err);
                    }
                    return;
                }

                if (iBtn.customId === "ms_atualizar") {
                    const mNova = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } }
                    });

                    return iBtn.update({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    });
                }

                if (iBtn.customId === "ms_iniciar") {
                    await prisma.missoes.update({
                        where: { id: missao.id },
                        data: { status: "EM_ANDAMENTO" }
                    });

                    const mNova = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } }
                    });

                    return iBtn.update({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    });
                }

                if (iBtn.customId === "ms_concluir") {
                    await iBtn.deferUpdate();

                    const dmChar = await getPersonagemAtivo(missao.criador_id);

                    if (dmChar) {
                        const jaInscrito = await prisma.inscricoes.findFirst({
                            where: { missao_id: missao.id, personagem_id: dmChar.id }
                        });

                        if (!jaInscrito) {
                            await prisma.inscricoes.create({
                                data: {
                                    missao_id: missao.id,
                                    personagem_id: dmChar.id,
                                    selecionado: true,
                                    recompensa_resgatada: false
                                }
                            });
                        } else if (!jaInscrito.selecionado) {
                            await prisma.inscricoes.update({
                                where: { id: jaInscrito.id },
                                data: { selecionado: true }
                            });
                        }
                    }

                    await prisma.missoes.update({
                        where: { id: missao.id },
                        data: { status: "CONCLUIDA" }
                    });

                    const mNova = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } }
                    });

                    await interaction.editReply({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    }).catch(()=>{});

                    await interaction.channel.send({
                        content: `🏆 **Contrato "${mNova.nome}" Concluído!**\nEquipe e Mestre, utilizem \`/resgatar contrato:${mNova.nome}\` para pegar suas recompensas e os pontos de progressão.`
                    });
                }
            } catch (err) {
                if (err.code !== 10062) console.error("Erro painel contrato:", err);
            }
        });
    }
};