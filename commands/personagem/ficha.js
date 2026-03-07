const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ficha")
        .setDescription("Exibe e permite editar a ficha do seu personagem ativo."),

    async execute({ interaction, prisma, getPersonagemAtivo }) {
        const CUSTO_NIVEL = {
            3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
            11: 10, 12: 10, 13: 10, 14: 10, 15: 10, 16: 10
        };

        const LISTA_CLASSES_1 = [
            "Arcanista","Alquimista","Atleta","Bárbaro","Bardo","Burguês","Bucaneiro",
            "Caçador","Cavaleiro","Clérigo","Duelista","Druída","Ermitão","Frade","Guerreiro"
        ];

        const LISTA_CLASSES_2 = [
            "Inovador","Inventor","Ladino","Lutador","Machado de Pedra","Magimarcialista",
            "Nobre","Necromante","Paladino","Santo","Seteiro","Treinador","Usurpador",
            "Vassalo","Ventanista"
        ];

        const PERICIAS_LISTA_1 = [
            "Acrobacia","Adestramento","Atletismo","Atuação","Cavalgar","Conhecimento","Cura",
            "Diplomacia","Enganação","Fortitude","Furtividade","Guerra","Iniciativa",
            "Intimidação","Intuição","Investigação","Jogatina","Ladinagem","Luta","Misticismo"
        ];

        const PERICIAS_LISTA_2 = [
            "Nobreza","Ofício Alquimista","Ofício Armeiro","Ofício Artesão","Ofício Alfaiate",
            "Ofício Cozinheiro","Ofício Escriba","Ofício Engenhoqueiro","Ofício Tatuador",
            "Ofício Barbeiro","Percepção","Pilotagem","Pontaria","Reflexos","Religião",
            "Sobrevivência","Vontade"
        ];

        try {
            const ativo = await getPersonagemAtivo(interaction.user.id);

            if (!ativo) {
                return interaction.reply({ 
                    content: "🚫 Você não tem um personagem ativo. Use `/cadastrar` ou `/personagem trocar`.", 
                    ephemeral: true 
                });
            }

            let char = await prisma.personagens.findFirst({
                where: { id: ativo.id },
                include: { classes: true }
            });

            const calcularDados = (p) => {
                const nivelReal = p.nivel_personagem || 3;
                let patamar = 1;
                if (nivelReal >= 5) patamar = 2;
                if (nivelReal >= 11) patamar = 3;
                if (nivelReal >= 17) patamar = 4;
                return { nivelReal, patamar };
            };

            const montarEmbedFicha = (p) => {
                const { nivelReal, patamar } = calcularDados(p);
                const calcCD = (mod) => 10 + mod + Math.floor(nivelReal / 2);

                const txtVida = p.vida_temp > 0
                    ? `${p.vida_atual}/${p.vida_max} (+${p.vida_temp})`
                    : `${p.vida_atual}/${p.vida_max}`;

                const txtMana = p.mana_temp > 0
                    ? `${p.mana_atual}/${p.mana_max} (+${p.mana_temp})`
                    : `${p.mana_atual}/${p.mana_max}`;

                const obsTexto = p.observacoes || "Nenhuma observação registrada.";

                const somaClasses = p.classes.reduce((acc, c) => acc + c.nivel, 0);
                const niveisPendentes = nivelReal - somaClasses;
                const avisoClasse = niveisPendentes > 0 ? `\n⚠️ **Níveis pendentes:** ${niveisPendentes}` : "";

                const textoClasses = p.classes.length > 0
                    ? p.classes.map(c => `${c.nome_classe} ${c.nivel}`).join(" / ")
                    : "Sem Classe Definida";

                const listaPericias = Array.isArray(p.pericias) && p.pericias.length
                    ? p.pericias.join(", ")
                    : "Nenhuma";

                const custoProx = CUSTO_NIVEL[nivelReal] || "Max";
                const barraProgresso = `${p.pontos_missao}/${custoProx}`;

                const embed = new EmbedBuilder()
                    .setColor("#2B2D31")
                    .setTitle(`Ficha de ${p.nome}`)
                    .setDescription(`**${textoClasses}**${avisoClasse}\nNível de Personagem: **${nivelReal}** (Patamar ${patamar})`)
                    .addFields(
                        { name: "❤️ Vida", value: txtVida, inline: true },
                        { name: "⭐ Mana", value: txtMana, inline: true },
                        { name: "📈 Progresso", value: `Pontos: **${barraProgresso}**`, inline: true },
                        { name: "🛠️ Forja", value: `${p.pontos_forja_atual.toFixed(1)} pts`, inline: true },
                        { name: "🏃 Deslocamento", value: `${p.deslocamento}m`, inline: true },
                        { name: "\u200B", value: "**Atributos**" },
                        {
                            name: "Físicos",
                            value: `**FOR:** ${p.forca >= 0 ? "+" : ""}${p.forca} (CD ${calcCD(p.forca)})\n` +
                                   `**DES:** ${p.destreza >= 0 ? "+" : ""}${p.destreza} (CD ${calcCD(p.destreza)})\n` +
                                   `**CON:** ${p.constituicao >= 0 ? "+" : ""}${p.constituicao} (CD ${calcCD(p.constituicao)})`,
                            inline: true
                        },
                        {
                            name: "Mentais",
                            value: `**INT:** ${p.inteligencia >= 0 ? "+" : ""}${p.inteligencia} (CD ${calcCD(p.inteligencia)})\n` +
                                   `**SAB:** ${p.sabedoria >= 0 ? "+" : ""}${p.sabedoria} (CD ${calcCD(p.sabedoria)})\n` +
                                   `**CAR:** ${p.carisma >= 0 ? "+" : ""}${p.carisma} (CD ${calcCD(p.carisma)})`,
                            inline: true
                        },
                        { name: "🎭 Perícias Treinadas", value: listaPericias },
                        { name: "📝 Observações", value: obsTexto }
                    );

                if (p.banner_url) {
                    embed.setImage(p.banner_url);
                } else {
                    embed.setThumbnail(interaction.user.displayAvatarURL());
                }

                return embed;
            };

            const getBotoes = () => new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("edit_classes").setLabel("Classes").setStyle(ButtonStyle.Success).setEmoji("📚"),
                new ButtonBuilder().setCustomId("btn_descanso").setLabel("Descansar").setStyle(ButtonStyle.Success).setEmoji("💤"),
                new ButtonBuilder().setCustomId("edit_status").setLabel("Status").setStyle(ButtonStyle.Primary).setEmoji("❤️"),
                new ButtonBuilder().setCustomId("edit_pericias").setLabel("Perícias").setStyle(ButtonStyle.Secondary).setEmoji("🎭")
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("edit_fisico").setLabel("Físicos").setStyle(ButtonStyle.Secondary).setEmoji("💪"),
                new ButtonBuilder().setCustomId("edit_mental").setLabel("Mentais").setStyle(ButtonStyle.Secondary).setEmoji("🧠"),
                new ButtonBuilder().setCustomId("edit_deslocamento").setLabel("Deslocamento").setStyle(ButtonStyle.Secondary).setEmoji("🏃"),
                new ButtonBuilder().setCustomId("edit_obs").setLabel("Obs").setStyle(ButtonStyle.Secondary).setEmoji("📝")
            );

            const msg = await interaction.reply({
                embeds: [montarEmbedFicha(char)],
                components: [getBotoes(), row2],
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 600000 
            });

            collector.on('collect', async iBtn => {
                const uniqueID = `_${msg.id}`;

                if (iBtn.customId === 'edit_pericias') {
                    const menu1 = new StringSelectMenuBuilder().setCustomId('menu_pericia_1').setPlaceholder('Perícias (A - M)');
                    const menu2 = new StringSelectMenuBuilder().setCustomId('menu_pericia_2').setPlaceholder('Perícias (N - Z)');

                    PERICIAS_LISTA_1.forEach(p => menu1.addOptions(new StringSelectMenuOptionBuilder().setLabel(p).setValue(p)));
                    PERICIAS_LISTA_2.forEach(p => menu2.addOptions(new StringSelectMenuOptionBuilder().setLabel(p).setValue(p)));

                    const r1 = new ActionRowBuilder().addComponents(menu1);
                    const r2 = new ActionRowBuilder().addComponents(menu2);
                    const r3 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('btn_limpar_pericias').setLabel('Limpar Todas').setStyle(ButtonStyle.Danger)
                    );

                    const response = await iBtn.reply({
                        content: `Selecione para adicionar/remover perícias.\nAtuais: ${(char.pericias || []).join(', ') || 'Nenhuma'}`,
                        components: [r1, r2, r3],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const periciaCollector = response.resource.message.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });

                    periciaCollector.on('collect', async iPericia => {
                        await iPericia.deferUpdate();

                        const charAtual = await prisma.personagens.findUnique({
                            where: { id: char.id },
                            include: { classes: true }
                        });

                        let novasPericias = [...(charAtual.pericias || [])];

                        if (iPericia.customId === 'btn_limpar_pericias') {
                            novasPericias = [];
                            char = await prisma.personagens.update({
                                where: { id: char.id },
                                data: { pericias: novasPericias },
                                include: { classes: true }
                            });
                            await iPericia.followUp({ content: "🗑️ Todas as perícias removidas.", ephemeral: true });
                        } else {
                            const selecionada = iPericia.values[0];
                            if (!novasPericias.includes(selecionada)) {
                                novasPericias.push(selecionada);
                                novasPericias.sort();
                                await iPericia.followUp({ content: `✅ ${selecionada} adicionada.`, ephemeral: true });
                            } else {
                                novasPericias = novasPericias.filter(p => p !== selecionada);
                                await iPericia.followUp({ content: `❌ ${selecionada} removida.`, ephemeral: true });
                            }
                            char = await prisma.personagens.update({
                                where: { id: char.id },
                                data: { pericias: novasPericias },
                                include: { classes: true }
                            });
                        }
                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                    });
                    return;
                }

                if (iBtn.customId === 'edit_classes') {
                    const menu1 = new StringSelectMenuBuilder().setCustomId('menu_classe_1').setPlaceholder('Classes A-G');
                    const menu2 = new StringSelectMenuBuilder().setCustomId('menu_classe_2').setPlaceholder('Classes I-V');

                    LISTA_CLASSES_1.forEach(cls => menu1.addOptions(new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)));
                    LISTA_CLASSES_2.forEach(cls => menu2.addOptions(new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)));

                    const r1 = new ActionRowBuilder().addComponents(menu1);
                    const r2 = new ActionRowBuilder().addComponents(menu2);

                    const response = await iBtn.reply({
                        content: `Selecione uma classe para **Adicionar** ou **Editar o Nível**.\n*(Você tem ${char.nivel_personagem - char.classes.reduce((a, b) => a + b.nivel, 0)} níveis livres)*`,
                        components: [r1, r2],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const menuCollector = response.resource.message.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });

                    menuCollector.on('collect', async iMenu => {
                        const classeSelecionada = iMenu.values[0];
                        const modalCustomId = `modal_nivel_${classeSelecionada.replace(/\s+/g, '')}${uniqueID}`;

                        const modal = new ModalBuilder()
                            .setCustomId(modalCustomId)
                            .setTitle(`Nível de ${classeSelecionada}`)
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('inp_nivel')
                                        .setLabel('Novo nível (0 remove)')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );

                        await iMenu.showModal(modal);

                        try {
                            const modalSubmit = await iMenu.awaitModalSubmit({
                                filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                                time: 60000
                            });

                            await modalSubmit.deferUpdate();

                            const nivelInput = parseInt(modalSubmit.fields.getTextInputValue('inp_nivel'));

                            if (isNaN(nivelInput)) {
                                return modalSubmit.followUp({ content: "Nível inválido.", ephemeral: true });
                            }

                            const charAtual = await prisma.personagens.findUnique({
                                where: { id: char.id },
                                include: { classes: true }
                            });

                            if (nivelInput > 0) {
                                const somaAtual = charAtual.classes.reduce((acc, c) => acc + (c.nome_classe === classeSelecionada ? 0 : c.nivel), 0);
                                if (somaAtual + nivelInput > charAtual.nivel_personagem) {
                                    return modalSubmit.followUp({
                                        content: `🚫 Você não pode exceder o nível total (${charAtual.nivel_personagem}).`,
                                        ephemeral: true
                                    });
                                }
                            }

                            if (nivelInput <= 0) {
                                await prisma.personagemClasse.deleteMany({
                                    where: { personagem_id: char.id, nome_classe: classeSelecionada }
                                });
                            } else {
                                const existe = await prisma.personagemClasse.findFirst({
                                    where: { personagem_id: char.id, nome_classe: classeSelecionada }
                                });

                                if (existe) {
                                    await prisma.personagemClasse.update({
                                        where: { id: existe.id },
                                        data: { nivel: nivelInput }
                                    });
                                } else {
                                    await prisma.personagemClasse.create({
                                        data: { personagem_id: char.id, nome_classe: classeSelecionada, nivel: nivelInput }
                                    });
                                }
                            }

                            char = await prisma.personagens.findUnique({
                                where: { id: char.id },
                                include: { classes: true }
                            });

                            await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                            await modalSubmit.followUp({ content: "✅ Classes atualizadas.", ephemeral: true });
                        } catch (err) {}
                    });
                    return;
                }

                if (iBtn.customId === 'btn_descanso') {
                    const charAtualInicial = await prisma.personagens.findUnique({
                        where: { id: char.id },
                        include: { classes: true }
                    });

                    if (charAtualInicial.ultimo_descanso) {
                        const agora = new Date();
                        const ultimo = new Date(char.ultimo_descanso);

                        const mesmoDia = agora.getDate() === ultimo.getDate() &&
                                         agora.getMonth() === ultimo.getMonth() &&
                                         agora.getFullYear() === ultimo.getFullYear();

                        if (mesmoDia) {
                            return iBtn.reply({
                                content: `🚫 **${char.nome}** já descansou hoje!`,
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    }

                    const { nivelReal } = calcularDados(char);

                    const botoesDescanso = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('desc_ruim').setLabel('Ruim (Nív/2)').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('desc_normal').setLabel('Normal (Nív)').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('desc_conf').setLabel('Confortável (2x)').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('desc_lux').setLabel('Luxuoso (3x)').setStyle(ButtonStyle.Success)
                    );

                    const response = await iBtn.reply({
                        content: `🛏️ **Modo de Descanso**\nNível: ${nivelReal}\nEscolha a qualidade da hospedagem:`,
                        components: [botoesDescanso],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const descCollector = response.resource.message.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });

                    descCollector.on('collect', async iDesc => {
                        let multiplicador = 1;
                        let nomeTipo = "Normal";

                        if (iDesc.customId === 'desc_ruim') { multiplicador = 0.5; nomeTipo = "Ruim"; }
                        if (iDesc.customId === 'desc_conf') { multiplicador = 2; nomeTipo = "Confortável"; }
                        if (iDesc.customId === 'desc_lux') { multiplicador = 3; nomeTipo = "Luxuoso"; }

                        const modalCustomId = `modal_descanso_${nomeTipo}_${msg.id}`;

                        const modal = new ModalBuilder()
                            .setCustomId(modalCustomId)
                            .setTitle(`Descanso ${nomeTipo}`)
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_bonus_vida').setLabel('Bônus Vida (opcional)').setStyle(TextInputStyle.Short).setRequired(false)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_bonus_mana').setLabel('Bônus Mana (opcional)').setStyle(TextInputStyle.Short).setRequired(false))
                            );

                        await iDesc.showModal(modal);

                        try {
                            const modalSubmit = await iDesc.awaitModalSubmit({
                                filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                                time: 60000
                            });

                            await modalSubmit.deferUpdate();

                            const charAtual = await prisma.personagens.findUnique({
                                where: { id: char.id },
                                include: { classes: true }
                            });

                            const { nivelReal: nivelAtual } = calcularDados(charAtual);

                            const bonusVida = parseInt(modalSubmit.fields.getTextInputValue('inp_bonus_vida')) || 0;
                            const bonusMana = parseInt(modalSubmit.fields.getTextInputValue('inp_bonus_mana')) || 0;

                            const recBase = Math.floor(nivelAtual * multiplicador) || 1;

                            const novaVida = Math.min(charAtual.vida_max, charAtual.vida_atual + recBase + bonusVida);
                            const novaMana = Math.min(charAtual.mana_max, charAtual.mana_atual + recBase + bonusMana);

                            const curouVida = novaVida - char.vida_atual;
                            const curouMana = novaMana - char.mana_atual;

                            await prisma.$transaction([
                                prisma.personagens.update({
                                    where: { id: char.id },
                                    data: { vida_atual: novaVida, mana_atual: novaMana, ultimo_descanso: new Date() }
                                }),
                                prisma.transacao.create({
                                    data: {
                                        personagem_id: char.id,
                                        descricao: `Descanso ${nomeTipo}: +${curouVida} PV, +${curouMana} PM`,
                                        valor: 0,
                                        tipo: 'LOG'
                                    }
                                })
                            ]);

                            char = await prisma.personagens.findUnique({
                                where: { id: char.id },
                                include: { classes: true }
                            });

                            await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                            await modalSubmit.followUp({ content: `✅ Descanso realizado!\n+${curouVida} Vida | +${curouMana} Mana`, ephemeral: true });

                        } catch (err) {}
                    });
                    return;
                }
                
                if (iBtn.customId === 'edit_status') {
                    const modalCustomId = `modal_status_${msg.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalCustomId)
                        .setTitle('Editar Status')
                        .addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_vida').setLabel('Vida Atual / Máxima').setStyle(TextInputStyle.Short).setRequired(true).setValue(`${char.vida_atual}/${char.vida_max}`)),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_vida_temp').setLabel('Vida Temporária').setStyle(TextInputStyle.Short).setRequired(false).setValue(String(char.vida_temp || 0))),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_mana').setLabel('Mana Atual / Máxima').setStyle(TextInputStyle.Short).setRequired(true).setValue(`${char.mana_atual}/${char.mana_max}`)),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_mana_temp').setLabel('Mana Temporária').setStyle(TextInputStyle.Short).setRequired(false).setValue(String(char.mana_temp || 0)))
                        );

                    await iBtn.showModal(modal);

                    try {
                        const modalSubmit = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                            time: 60000
                        });
                        await modalSubmit.deferUpdate();

                        const [vidaAtual, vidaMax] = modalSubmit.fields.getTextInputValue('inp_vida').split('/').map(v => parseInt(v.trim()));
                        const [manaAtual, manaMax] = modalSubmit.fields.getTextInputValue('inp_mana').split('/').map(v => parseInt(v.trim()));
                        const vidaTemp = parseInt(modalSubmit.fields.getTextInputValue('inp_vida_temp')) || 0;
                        const manaTemp = parseInt(modalSubmit.fields.getTextInputValue('inp_mana_temp')) || 0;

                        if (isNaN(vidaAtual) || isNaN(vidaMax) || isNaN(manaAtual) || isNaN(manaMax)) {
                            return modalSubmit.followUp({ content: "Formato inválido. Use exemplo: 12/20", ephemeral: true });
                        }

                        await prisma.personagens.update({
                            where: { id: char.id },
                            data: { vida_atual: vidaAtual, vida_max: vidaMax, vida_temp: vidaTemp, mana_atual: manaAtual, mana_max: manaMax, mana_temp: manaTemp }
                        });

                        char = await prisma.personagens.findUnique({ where: { id: char.id }, include: { classes: true } });
                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                        await modalSubmit.followUp({ content: "✅ Status atualizado com sucesso.", ephemeral: true });
                    } catch (err) {}
                    return;
                }

                if (iBtn.customId === 'edit_fisico') {
                    const modalCustomId = `modal_fisico${uniqueID}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalCustomId)
                        .setTitle('Editar Físicos')
                        .addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_for').setLabel('Força').setStyle(TextInputStyle.Short).setValue(String(char.forca))),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_des').setLabel('Destreza').setStyle(TextInputStyle.Short).setValue(String(char.destreza))),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_con').setLabel('Constituição').setStyle(TextInputStyle.Short).setValue(String(char.constituicao)))
                        );

                    await iBtn.showModal(modal);

                    try {
                        const modalSubmit = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                            time: 60000
                        });
                        await modalSubmit.deferUpdate();

                        await prisma.personagens.update({
                            where: { id: char.id },
                            data: {
                                forca: parseInt(modalSubmit.fields.getTextInputValue('inp_for')) || 0,
                                destreza: parseInt(modalSubmit.fields.getTextInputValue('inp_des')) || 0,
                                constituicao: parseInt(modalSubmit.fields.getTextInputValue('inp_con')) || 0
                            }
                        });

                        char = await prisma.personagens.findFirst({ where: { id: char.id }, include: { classes: true } });
                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                    } catch {}
                    return;
                }

                if (iBtn.customId === 'edit_mental') {
                    const modalCustomId = `modal_mental${uniqueID}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalCustomId)
                        .setTitle('Editar Mentais')
                        .addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_int').setLabel('Inteligência').setStyle(TextInputStyle.Short).setValue(String(char.inteligencia))),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_sab').setLabel('Sabedoria').setStyle(TextInputStyle.Short).setValue(String(char.sabedoria))),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_car').setLabel('Carisma').setStyle(TextInputStyle.Short).setValue(String(char.carisma)))
                        );

                    await iBtn.showModal(modal);

                    try {
                        const modalSubmit = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                            time: 60000
                        });
                        await modalSubmit.deferUpdate();

                        await prisma.personagens.update({
                            where: { id: char.id },
                            data: {
                                inteligencia: parseInt(modalSubmit.fields.getTextInputValue('inp_int')) || 0,
                                sabedoria: parseInt(modalSubmit.fields.getTextInputValue('inp_sab')) || 0,
                                carisma: parseInt(modalSubmit.fields.getTextInputValue('inp_car')) || 0
                            }
                        });

                        char = await prisma.personagens.findFirst({ where: { id: char.id }, include: { classes: true } });
                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                    } catch {}
                    return;
                }

                if (iBtn.customId === 'edit_deslocamento') {
                    const modalCustomId = `modal_deslocamento_${msg.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalCustomId)
                        .setTitle('Editar Deslocamento')
                        .addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_deslocamento').setLabel('Deslocamento (em metros)').setStyle(TextInputStyle.Short).setRequired(true).setValue(String(char.deslocamento || 9)))
                        );

                    await iBtn.showModal(modal);

                    try {
                        const modalSubmit = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                            time: 60000
                        });
                        await modalSubmit.deferUpdate();

                        const valor = parseFloat(modalSubmit.fields.getTextInputValue('inp_deslocamento'));

                        if (isNaN(valor) || valor <= 0) {
                            return modalSubmit.followUp({ content: "Valor inválido.", ephemeral: true });
                        }

                        await prisma.personagens.update({
                            where: { id: char.id },
                            data: { deslocamento: valor }
                        });

                        char = await prisma.personagens.findUnique({ where: { id: char.id }, include: { classes: true } });
                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                        await modalSubmit.followUp({ content: `✅ Deslocamento atualizado para ${valor}m.`, ephemeral: true });
                    } catch (err) {}
                    return;
                }

                if (iBtn.customId === 'edit_obs') {
                    const modalCustomId = `modal_obs_${msg.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalCustomId)
                        .setTitle('Editar Observações')
                        .addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inp_obs').setLabel('Anotações').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(false).setValue(char.observacoes || ''))
                        );

                    await iBtn.showModal(modal);

                    try {
                        const modalSubmit = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === modalCustomId && i.user.id === interaction.user.id,
                            time: 60000
                        });
                        await modalSubmit.deferUpdate();

                        const novaObs = modalSubmit.fields.getTextInputValue('inp_obs') || '';

                        await prisma.personagens.update({
                            where: { id: char.id },
                            data: { observacoes: novaObs }
                        });

                        char = await prisma.personagens.findUnique({ where: { id: char.id }, include: { classes: true } });
                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                        await modalSubmit.followUp({ content: "✅ Observações atualizadas.", ephemeral: true });
                    } catch (err) {}
                    return;
                }
            });

        } catch (err) {
            console.error("Erro no comando ficha:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao carregar sua ficha.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};