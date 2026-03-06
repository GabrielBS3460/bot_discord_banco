const {
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    UserSelectMenuBuilder
} = require("discord.js");

module.exports = {

    name: "painelcontrato",

    async execute({
        message,
        prisma,
        getPersonagemAtivo,
        client,
        ID_CARGO_ADMIN
    }) {

        const nomeMissao = message.content
            .replace("!painelcontrato", "")
            .trim()
            .replace(/"/g, "");

        const missao = await prisma.missoes.findUnique({
            where: { nome: nomeMissao },
            include: {
                inscricoes: {
                    include: { personagem: true }
                }
            }
        });

        if (!missao)
            return message.reply("Contrato não encontrado.");

        if (
            missao.criador_id !== message.author.id &&
            !message.member.roles.cache.has(ID_CARGO_ADMIN)
        ) {
            return message.reply(
                "Apenas o Mestre criador pode gerenciar este contrato."
            );
        }

        const shuffle = array =>
            [...array].sort(() => Math.random() - 0.5);

        const montarPainel = m => {

            const selecionados = m.inscricoes.filter(i => i.selecionado);

            const fila = shuffle(
                m.inscricoes.filter(i => !i.selecionado)
            );

            const txtSelecionados =
                selecionados
                    .map(i =>
                        `✅ **${i.personagem.nome}** (Nvl ${i.personagem.nivel_personagem})`
                    )
                    .join("\n") || "Ninguém selecionado.";

            const txtFila =
                fila
                    .map(i =>
                        `⏳ **${i.personagem.nome}**`
                    )
                    .join("\n") || "Fila vazia.";

            return new EmbedBuilder()
                .setColor(m.status === "CONCLUIDA" ? "#00FF00" : "#FFA500")
                .setTitle(`🛡️ Gestão: ${m.nome}`)
                .setDescription(
                    `**ND:** ${m.nd} | **Vagas:** ${m.vagas}\n**Status:** ${m.status}`
                )
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
                    .setLabel("Iniciar")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(m.status !== "ABERTA"),

                new ButtonBuilder()
                    .setCustomId("ms_concluir")
                    .setLabel("Concluir Missão")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(m.status === "CONCLUIDA"),

                new ButtonBuilder()
                    .setCustomId("ms_atualizar")
                    .setLabel("🔄 Atualizar")
                    .setStyle(ButtonStyle.Secondary)

            );

            return [row1, row2];

        };

        const msg = await message.reply({
            embeds: [montarPainel(missao)],
            components: montarBotoes(missao)
        });

        const collector = msg.createMessageComponentCollector({
            time: 3600000,
            idle: 300000
        });

        collector.on("collect", async i => {

            if (!i.isButton() && !i.isUserSelectMenu() && !i.isStringSelectMenu()) return;

            try {

                if (i.user.id !== message.author.id) {
                    return i.reply({
                        content: "Apenas o mestre pode usar estes botões.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (i.customId === 'ms_add_player') {
                
                    const userMenu = new UserSelectMenuBuilder()
                        .setCustomId('menu_pesquisa_player')
                        .setPlaceholder('Pesquise e selecione o jogador...')
                        .setMinValues(1)
                        .setMaxValues(1);
                
                    const rowUser = new ActionRowBuilder().addComponents(userMenu);
                
                    const menuMsg = await i.reply({ 
                        content: "👥 **Selecione abaixo o jogador que deseja adicionar à missão:**", 
                        components: [rowUser], 
                        flags: MessageFlags.Ephemeral, 
                        withResponse: true 
                    });
                
                    const selectCollector = menuMsg.resource.message.createMessageComponentCollector({ time: 60000 });
                
                    selectCollector.on('collect', async iSelect => {
                        await iSelect.deferUpdate(); 
                        const targetId = iSelect.values[0]; 
                
                        const targetChar = await getPersonagemAtivo(targetId);
                        if (!targetChar) return iSelect.followUp({ content: "⚠️ O jogador selecionado não possui um personagem ativo.", flags: MessageFlags.Ephemeral });
                
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
                        await msg.edit({ embeds: [montarPainel(mNova)], components: montarBotoes(mNova) });
                                            
                        await iSelect.editReply({ content: `✅ **${targetChar.nome}** foi adicionado à equipe com sucesso!`, components: [] });
                        selectCollector.stop();
                    });
                    return; 
                }
                
                if (i.customId === 'ms_sortear') {
                
                    await i.deferUpdate();
                
                    const mAtual = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } }
                    });
                
                    let vagasRestantes =
                        mAtual.vagas -
                        mAtual.inscricoes.filter(insc => insc.selecionado).length;
                
                    if (vagasRestantes <= 0)
                        return i.followUp({
                            content: "Equipe já está cheia.",
                            flags: MessageFlags.Ephemeral
                        });
                
                    if (vagasRestantes > 0) {

                        const candidatos = mAtual.inscricoes.filter(insc =>
                            !insc.selecionado
                        );

                        const sorteados = candidatos
                            .sort(() => 0.5 - Math.random())
                            .slice(0, vagasRestantes);

                        if (sorteados.length > 0) {
                            await prisma.inscricoes.updateMany({
                                where: { id: { in: sorteados.map(s => s.id) } },
                                data: { selecionado: true }
                            });
                        }
                    }
                
                    const mNova = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } } });
                
                    await msg.edit({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    });
                }
                
                if (i.customId === 'ms_gerenciar') {
                
                    await i.deferReply({ ephemeral: true });
                
                    const mAtual = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: { inscricoes: { include: { personagem: true } } }
                    });
                
                    const selecionados = mAtual.inscricoes.filter(insc => insc.selecionado);
                
                    if (selecionados.length === 0) {
                        return i.editReply({
                            content: "Ninguém na equipe para remover."
                        });
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
                                .setValue(insc.id.toString())
                                .setEmoji('❌')
                        );
                    });
                
                    const rowMenu = new ActionRowBuilder().addComponents(menu);
                
                    const reply = await i.editReply({
                        content: "Quem deve ser removido? O próximo da fila entrará automaticamente.",
                        components: [rowMenu],
                        fetchReply: true
                    });
                
                    const menuCollector = reply.createMessageComponentCollector({
                        filter: interaction =>
                            interaction.user.id === i.user.id &&
                            interaction.customId === 'menu_remover_jogador',
                        time: 60000,
                        max: 1
                    });
                
                    menuCollector.on('collect', async iMenu => {
                
                        await iMenu.deferUpdate();
                
                        const idRemover = parseInt(iMenu.values[0]);
                
                        await prisma.$transaction(async tx => {
                
                            await tx.inscricoes.delete({
                                where: { id: idRemover }
                            });
                    
                            const fila = await tx.inscricoes.findMany({
                                where: {
                                    missao_id: missao.id,
                                    selecionado: false
                                }
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
                
                        await msg.edit({
                            embeds: [montarPainel(mFinal)],
                            components: montarBotoes(mFinal)
                        });
                
                        await i.editReply({
                            content: "✅ Jogador removido com sucesso. Painel atualizado.",
                            components: []
                        });
                
                        menuCollector.stop();
                    });
                
                    return;
                }

                if (i.customId === "ms_atualizar") {

                    const mNova = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: {
                            inscricoes: {
                                include: { personagem: true }
                            }
                        }
                    });

                    return i.update({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    });

                }

                if (i.customId === "ms_iniciar") {

                    await prisma.missoes.update({
                        where: { id: missao.id },
                        data: { status: "EM_ANDAMENTO" }
                    });

                    const mNova = await prisma.missoes.findUnique({
                        where: { id: missao.id },
                        include: {
                            inscricoes: {
                                include: { personagem: true }
                            }
                        }
                    });

                    return i.update({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    });

                }

                if (i.customId === "ms_concluir") {

                    await i.deferUpdate();

                    const dmChar =
                        await getPersonagemAtivo(missao.criador_id);

                    if (dmChar) {

                        const jaInscrito =
                            await prisma.inscricoes.findFirst({
                                where: {
                                    missao_id: missao.id,
                                    personagem_id: dmChar.id
                                }
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

                        }
                        else if (!jaInscrito.selecionado) {

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
                        include: {
                            inscricoes: {
                                include: { personagem: true }
                            }
                        }
                    });

                    await msg.edit({
                        embeds: [montarPainel(mNova)],
                        components: montarBotoes(mNova)
                    }).catch(()=>{});

                    await i.followUp(
                        `🏆 **Contrato Concluído!**\nJogadores e Mestre, utilizem \`!resgatar "${mNova.nome}"\` para pegar suas recompensas.`
                    );

                }



            }
            catch (err) {

                if (err.code !== 10062)
                    console.error("Erro painel contrato:", err);

            }

        });

    }

};