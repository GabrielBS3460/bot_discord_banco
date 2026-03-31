const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { PORTES, TIPOS, COMODOS, MOBILIAS } = require("../../data/baseData.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("base")
        .setDescription("Sistema completo de gerenciamento de Bases e Organizações.")
        .addSubcommand(sub => sub.setName("fundar").setDescription("Compra e funda uma nova base."))
        .addSubcommand(sub => sub.setName("painel").setDescription("Abre o painel de gerenciamento da sua base atual."))
        .addSubcommand(sub =>
            sub.setName("construir").setDescription("Constrói um novo cômodo na sua base (K$ 1.000).")
        )
        .addSubcommand(sub =>
            sub.setName("mobiliar").setDescription("Compra mobílias e instalações para seus cômodos.")
        )
        .addSubcommand(sub =>
            sub
                .setName("morador-add")
                .setDescription("Adiciona um novo residente à sua base.")
                .addUserOption(option =>
                    option.setName("jogador").setDescription("O jogador que você deseja convidar").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("morador-remover")
                .setDescription("Remove um residente da sua base.")
                .addUserOption(option =>
                    option.setName("jogador").setDescription("O jogador que você deseja expulsar").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("empreendimento").setDescription("Realiza o lucro mensal da base (Teste de Inteligência).")
        )
        .addSubcommand(sub =>
            sub.setName("desfazer").setDescription("Exclui permanentemente sua base (não há reembolso).")
        )
        .addSubcommand(sub =>
            sub.setName("upgrade").setDescription("Melhora o porte da sua base pagando a diferença de valor.")
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();

        if (subcomando !== "empreendimento") {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }
        }

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            const responderErro = async msg => {
                if (interaction.deferred) return interaction.editReply({ content: msg });
                return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
            };

            if (!char) return responderErro("🚫 Você não tem um personagem ativo.");

            if (subcomando === "mobiliar") {
                const base = await prisma.base.findFirst({
                    where: { dono_id: char.id },
                    include: { comodos: true, mobilias: true }
                });

                if (!base) {
                    return interaction.editReply({
                        content: "🚫 Apenas o **Dono da Base** pode mobiliar cômodos."
                    });
                }

                const mobiliasArray = Object.entries(MOBILIAS).sort((a, b) => a[0].localeCompare(b[0]));
                const half = Math.ceil(mobiliasArray.length / 2);

                const menuA_L = new StringSelectMenuBuilder()
                    .setCustomId(`menu_mob_1_${interaction.id}`)
                    .setPlaceholder("Mobílias (A - L)");
                const menuM_Z = new StringSelectMenuBuilder()
                    .setCustomId(`menu_mob_2_${interaction.id}`)
                    .setPlaceholder("Mobílias (M - Z)");

                mobiliasArray
                    .slice(0, half)
                    .forEach(([nome, d]) =>
                        menuA_L.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${nome} (K$ ${d.custo})`)
                                .setDescription(d.desc.substring(0, 100))
                                .setValue(nome)
                        )
                    );
                mobiliasArray
                    .slice(half)
                    .forEach(([nome, d]) =>
                        menuM_Z.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${nome} (K$ ${d.custo})`)
                                .setDescription(d.desc.substring(0, 100))
                                .setValue(nome)
                        )
                    );

                const response = await interaction.editReply({
                    content: `🛋️ **Loja de Mobílias**\n**Base:** ${base.nome} | **Seu Saldo:** ${formatarMoeda(char.saldo)}\n\n*Selecione o item que deseja comprar:*`,
                    components: [
                        new ActionRowBuilder().addComponents(menuA_L),
                        new ActionRowBuilder().addComponents(menuM_Z)
                    ],
                    withResponse: true
                });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 120000
                });

                collector.on("collect", async iSelect => {
                    await iSelect.deferUpdate();
                    const escolhido = iSelect.values[0];
                    const dadosMob = MOBILIAS[escolhido];

                    if (char.saldo < dadosMob.custo) {
                        return iSelect.followUp({
                            content: `💸 Você não tem K$ ${dadosMob.custo} para comprar **${escolhido}**.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (escolhido === "Gárgula animada") {
                        const valorPorte = PORTES[base.porte].valor;
                        if (valorPorte <= 3) {
                            return iSelect.followUp({
                                content: "🚫 Gárgulas só podem ser construídas em bases de porte Formidável ou maior.",
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        const maxGargulas = valorPorte - 3;
                        const qtdAtual = base.mobilias.filter(m => m.nome_item === "Gárgula animada").length;

                        if (qtdAtual >= maxGargulas) {
                            return iSelect.followUp({
                                content: `🚫 Sua base já atingiu o limite máximo de ${maxGargulas} Gárgula(s) para o porte atual.`,
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        await prisma.$transaction([
                            prisma.personagens.update({
                                where: { id: char.id },
                                data: { saldo: { decrement: dadosMob.custo } }
                            }),
                            prisma.transacao.create({
                                data: {
                                    personagem_id: char.id,
                                    descricao: `Comprou: Gárgula animada`,
                                    valor: dadosMob.custo,
                                    tipo: "GASTO"
                                }
                            }),
                            prisma.baseMobilia.create({ data: { base_id: base.id, nome_item: escolhido } }),
                            prisma.base.update({ where: { id: base.id }, data: { seguranca: { increment: 2 } } })
                        ]);

                        await interaction.editReply({
                            content: `✅ **Gárgula Animada** instalada nos muros! K$ ${dadosMob.custo} deduzidos.\n🛡️ Segurança da base aumentou em +2!`,
                            components: []
                        });
                        return collector.stop();
                    }

                    if (base.comodos.length === 0) {
                        return iSelect.followUp({
                            content: "🚫 Sua base não tem nenhum cômodo construído.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const comodosValidos = base.comodos.filter(c => {
                        if (dadosMob.reqComodos.length > 0 && !dadosMob.reqComodos.includes(c.nome_comodo))
                            return false;
                        const qtdNoComodo = base.mobilias.filter(m => m.comodo_id === c.id).length;
                        const capacidade = c.nome_comodo === "Sala de estar" ? 3 : 1;
                        return qtdNoComodo < capacidade;
                    });

                    if (comodosValidos.length === 0) {
                        return iSelect.followUp({
                            content: `🚫 Você não tem espaço disponível ou os cômodos certos construídos.\n*${escolhido} requer: ${dadosMob.reqComodos.length > 0 ? dadosMob.reqComodos.join(" ou ") : "Qualquer cômodo livre"}*.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const menuInstalar = new StringSelectMenuBuilder()
                        .setCustomId(`instalar_mob_${interaction.id}`)
                        .setPlaceholder(`Onde instalar: ${escolhido}?`);

                    comodosValidos.forEach(c => {
                        const qtdAtual = base.mobilias.filter(m => m.comodo_id === c.id).length;
                        const cap = c.nome_comodo === "Sala de estar" ? 3 : 1;
                        menuInstalar.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${c.nome_comodo}`)
                                .setDescription(`Espaço: ${qtdAtual}/${cap}`)
                                .setValue(String(c.id))
                        );
                    });

                    const msgConfirm = await iSelect.followUp({
                        content: `**Item:** ${escolhido} (K$ ${dadosMob.custo})\nSelecione o cômodo de destino:`,
                        components: [new ActionRowBuilder().addComponents(menuInstalar)],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const instCollector = msgConfirm.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });

                    instCollector.on("collect", async iInst => {
                        await iInst.deferUpdate();
                        const comodoId = parseInt(iInst.values[0]);

                        const charNaHora = await prisma.personagens.findUnique({ where: { id: char.id } });
                        if (charNaHora.saldo < dadosMob.custo) {
                            return iInst.followUp({ content: "💸 Saldo insuficiente.", flags: MessageFlags.Ephemeral });
                        }

                        await prisma.$transaction([
                            prisma.personagens.update({
                                where: { id: char.id },
                                data: { saldo: { decrement: dadosMob.custo } }
                            }),
                            prisma.transacao.create({
                                data: {
                                    personagem_id: char.id,
                                    descricao: `Comprou mobília: ${escolhido}`,
                                    valor: dadosMob.custo,
                                    tipo: "GASTO"
                                }
                            }),
                            prisma.baseMobilia.create({
                                data: { base_id: base.id, comodo_id: comodoId, nome_item: escolhido }
                            })
                        ]);

                        await interaction.editReply({
                            content: `✅ **${escolhido}** instalada com sucesso! K$ ${dadosMob.custo} deduzidos.`,
                            components: []
                        });

                        instCollector.stop();
                        collector.stop();
                    });
                });
            }

            if (subcomando === "construir") {
                const base = await prisma.base.findFirst({
                    where: { dono_id: char.id },
                    include: { comodos: true }
                });

                if (!base) {
                    return interaction.editReply({
                        content: "🚫 Apenas o Dono da Base pode construir."
                    });
                }

                const limiteComodos = PORTES[base.porte].comodos;
                if (base.comodos.length >= limiteComodos) {
                    return interaction.editReply({
                        content: `🚫 Sua base atingiu o limite de ${limiteComodos} cômodos.`
                    });
                }

                if (char.saldo < 1000) {
                    return interaction.editReply({
                        content: `💸 Você precisa de K$ 1.000 para construir um novo cômodo.`
                    });
                }

                const comodosArray = Object.entries(COMODOS).sort((a, b) => a[0].localeCompare(b[0]));
                const mid = Math.ceil(comodosArray.length / 2);

                const menu1 = new StringSelectMenuBuilder()
                    .setCustomId(`menu_com_1_${interaction.id}`)
                    .setPlaceholder("Cômodos (A - L)");
                const menu2 = new StringSelectMenuBuilder()
                    .setCustomId(`menu_com_2_${interaction.id}`)
                    .setPlaceholder("Cômodos (M - Z)");

                comodosArray
                    .slice(0, mid)
                    .forEach(([nome, d]) =>
                        menu1.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(nome)
                                .setDescription(d.desc.substring(0, 100))
                                .setValue(nome)
                        )
                    );
                comodosArray
                    .slice(mid)
                    .forEach(([nome, d]) =>
                        menu2.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(nome)
                                .setDescription(d.desc.substring(0, 100))
                                .setValue(nome)
                        )
                    );

                const response = await interaction.editReply({
                    content: `🔨 **Construção de Cômodos**\n**Base:** ${base.nome} | **Espaço:** ${limiteComodos - base.comodos.length}\n*Custo:* K$ 1.000`,
                    components: [
                        new ActionRowBuilder().addComponents(menu1),
                        new ActionRowBuilder().addComponents(menu2)
                    ],
                    withResponse: true
                });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 120000
                });

                collector.on("collect", async iSelect => {
                    await iSelect.deferUpdate();
                    const escolhido = iSelect.values[0];
                    const dados = COMODOS[escolhido];

                    if (dados.reqPorte && PORTES[base.porte].valor < PORTES[dados.reqPorte].valor) {
                        return iSelect.followUp({
                            content: `🚫 Requer porte ${dados.reqPorte} ou maior.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    if (dados.reqComodo && !base.comodos.some(c => c.nome_comodo === dados.reqComodo)) {
                        return iSelect.followUp({
                            content: `🚫 Requer o cômodo prévio: ${dados.reqComodo}.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    if (escolhido !== "Suíte" && base.comodos.some(c => c.nome_comodo === escolhido)) {
                        return iSelect.followUp({
                            content: `🚫 Você já possui este cômodo construído.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const charAtu = await prisma.personagens.findUnique({ where: { id: char.id } });
                    if (charAtu.saldo < 1000) {
                        return iSelect.followUp({ content: "💸 Saldo insuficiente.", flags: MessageFlags.Ephemeral });
                    }

                    try {
                        await prisma.$transaction(async tx => {
                            await tx.personagens.update({
                                where: { id: char.id },
                                data: { saldo: { decrement: 1000 } }
                            });
                            await tx.transacao.create({
                                data: {
                                    personagem_id: char.id,
                                    descricao: `Construiu: ${escolhido}`,
                                    valor: 1000,
                                    tipo: "GASTO"
                                }
                            });
                            await tx.baseComodo.create({ data: { base_id: base.id, nome_comodo: escolhido } });
                            if (dados.addSeguranca > 0) {
                                await tx.base.update({
                                    where: { id: base.id },
                                    data: { seguranca: { increment: dados.addSeguranca } }
                                });
                            }
                        });

                        let msgBonus = `✅ **${escolhido}** construído com sucesso!`;
                        if (dados.addSeguranca > 0)
                            msgBonus += `\n🛡️ Segurança da base aumentada em +${dados.addSeguranca}!`;

                        await interaction.editReply({ content: msgBonus, components: [] });
                        collector.stop();
                        // eslint-disable-next-line no-unused-vars
                    } catch (err) {
                        await iSelect.followUp({
                            content: "❌ Erro ao processar construção.",
                            flags: MessageFlags.Ephemeral
                        });
                    }
                });
            }

            if (subcomando === "fundar") {
                const menuPorte = new StringSelectMenuBuilder()
                    .setCustomId(`sel_porte_${interaction.id}`)
                    .setPlaceholder("Selecione o Porte...");

                Object.entries(PORTES).forEach(([n, d]) =>
                    menuPorte.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${n} (K$ ${d.custo})`)
                            .setDescription(d.desc)
                            .setValue(n)
                    )
                );

                const metodoInicial = interaction.deferred ? "editReply" : "reply";
                const response = await interaction[metodoInicial]({
                    content: `🏰 **Fundação**\nEscolha o Porte:`,
                    components: [new ActionRowBuilder().addComponents(menuPorte)],
                    withResponse: true
                });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 180000
                });

                let pEscolha = null;
                collector.on("collect", async i => {
                    if (i.customId.startsWith("sel_porte_")) {
                        pEscolha = i.values[0];

                        if (char.saldo < PORTES[pEscolha].custo) {
                            return i.reply({ content: `💸 Saldo Insuficiente.`, flags: MessageFlags.Ephemeral });
                        }

                        const menuTipo = new StringSelectMenuBuilder()
                            .setCustomId(`sel_tipo_${interaction.id}`)
                            .setPlaceholder("Selecione a Especialidade...");

                        Object.entries(TIPOS).forEach(([n, d]) =>
                            menuTipo.addOptions(
                                new StringSelectMenuOptionBuilder().setLabel(n).setDescription(d).setValue(n)
                            )
                        );

                        await i.update({
                            content: `🏰 **Passo 2:** Especialidade para porte **${pEscolha}**`,
                            components: [new ActionRowBuilder().addComponents(menuTipo)]
                        });
                    }

                    if (i.customId.startsWith("sel_tipo_")) {
                        const tEscolha = i.values[0];
                        const modal = new ModalBuilder()
                            .setCustomId(`mod_nome_${interaction.id}`)
                            .setTitle("Nome da Base")
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("inp_nome")
                                        .setLabel("Nome")
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );

                        await i.showModal(modal);

                        try {
                            const mSub = await i.awaitModalSubmit({
                                filter: m => m.customId === `mod_nome_${interaction.id}`,
                                time: 60000
                            });

                            await mSub.deferReply();

                            const nome = mSub.fields.getTextInputValue("inp_nome").trim();
                            const custo = PORTES[pEscolha].custo;

                            const check = await prisma.personagens.findUnique({ where: { id: char.id } });

                            if (check.saldo < custo) {
                                return mSub.editReply({ content: "❌ Saldo insuficiente no momento da criação." });
                            }

                            await prisma.$transaction([
                                prisma.personagens.update({
                                    where: { id: char.id },
                                    data: { saldo: { decrement: custo } }
                                }),
                                prisma.base.create({
                                    data: {
                                        nome: nome,
                                        tipo: tEscolha,
                                        porte: pEscolha,
                                        seguranca: tEscolha === "Fortificação" ? 5 : 0,
                                        dono_id: char.id
                                    }
                                })
                            ]);

                            await mSub.editReply({
                                content: `🎉 Base **${nome}** fundada com sucesso!`,
                                components: []
                            });

                            await interaction
                                .editReply({ content: `✅ Processo de fundação concluído.`, components: [] })
                                .catch(() => {});
                            collector.stop();
                        } catch (err) {
                            console.error("Erro no submit do modal:", err);
                        }
                    }
                });
            }

            if (subcomando === "painel") {
                const buscarBase = async () =>
                    await prisma.base.findFirst({
                        where: { OR: [{ dono_id: char.id }, { residentes: { some: { personagem_id: char.id } } }] },
                        include: {
                            dono: true,
                            residentes: { include: { personagem: true } },
                            comodos: { include: { mobilias: true } },
                            mobilias: true
                        }
                    });

                let base = await buscarBase();

                if (!base) {
                    return interaction.editReply({ content: "🚫 Você não pertence a nenhuma base." });
                }

                const montarEmbedPainel = b => {
                    const limCom = PORTES[b.porte].comodos;
                    const res = b.residentes.map(r => `• ${r.personagem.nome}`).join("\n") || "Nenhum.";

                    const coms =
                        b.comodos
                            .map(c => {
                                const mobs = c.mobilias.map(m => m.nome_item).join(", ");
                                let txt = c.danificado ? `~~${c.nome_comodo}~~ ⚠️` : `**${c.nome_comodo}**`;
                                if (mobs) txt += `\n╰ 🛋️ *${mobs}*`;
                                return txt;
                            })
                            .join("\n") || "Nenhum.";

                    const ext = b.mobilias
                        .filter(m => !m.comodo_id)
                        .map(m => m.nome_item)
                        .join(", ");

                    const embed = new EmbedBuilder()
                        .setColor(b.manutencao_paga ? "#00AAFF" : "#ED4245")
                        .setTitle(`🏰 ${b.nome}`)
                        .setDescription(`**Dono:** ${b.dono.nome}\n**Tipo:** ${b.tipo}\n${TIPOS[b.tipo]}`)
                        .addFields(
                            { name: "🛡️ Segurança", value: `${b.seguranca}`, inline: true },
                            {
                                name: "💰 Manutenção",
                                value: `K$ ${PORTES[b.porte].manutencao} ${b.manutencao_paga ? "✅" : "⚠️"}`,
                                inline: true
                            },
                            { name: `👥 Equipe (${b.residentes.length}/4)`, value: res, inline: true },
                            { name: `🏠 Estrutura (${b.comodos.length}/${limCom})`, value: coms, inline: false }
                        );

                    if (ext) embed.addFields({ name: "🌳 Exterior", value: ext });
                    return embed;
                };

                await interaction.editReply({ embeds: [montarEmbedPainel(base)] });
            }

            if (subcomando === "morador-add") {
                const base = await prisma.base.findFirst({
                    where: { dono_id: char.id },
                    include: { residentes: true }
                });

                if (!base) {
                    return interaction.editReply({ content: "🚫 Apenas o **Dono da Base** pode gerenciar moradores." });
                }

                const alvoUser = interaction.options.getUser("jogador");
                const alvoChar = await getPersonagemAtivo(alvoUser.id);

                if (!alvoChar) {
                    return interaction.editReply({ content: "🚫 O alvo selecionado não possui um personagem ativo." });
                }

                const jaPossuiResidencia = await prisma.base.findFirst({
                    where: {
                        OR: [{ dono_id: alvoChar.id }, { residentes: { some: { personagem_id: alvoChar.id } } }]
                    }
                });

                if (jaPossuiResidencia) {
                    return interaction.editReply({ content: `🚫 **${alvoChar.nome}** já possui uma residência fixa.` });
                }

                if (base.residentes.length >= 4) {
                    return interaction.editReply({
                        content: "🚫 Sua base já atingiu o limite máximo de 4 residentes."
                    });
                }

                await prisma.baseResidente.create({
                    data: {
                        base_id: base.id,
                        personagem_id: alvoChar.id
                    }
                });

                return interaction.editReply({
                    content: `✅ **${alvoChar.nome}** agora é oficialmente um residente de **${base.nome}**!`
                });
            }

            if (subcomando === "morador-remover") {
                const base = await prisma.base.findFirst({
                    where: { dono_id: char.id }
                });

                if (!base) {
                    return interaction.editReply({
                        content: "🚫 Apenas o **Dono da Base** pode remover moradores."
                    });
                }

                const alvoUser = interaction.options.getUser("jogador");
                const alvoChar = await getPersonagemAtivo(alvoUser.id);

                const deleteResult = await prisma.baseResidente.deleteMany({
                    where: {
                        base_id: base.id,
                        personagem_id: alvoChar ? alvoChar.id : undefined,
                        personagem: alvoChar ? undefined : { usuario_id: alvoUser.id }
                    }
                });

                if (deleteResult.count === 0) {
                    return interaction.editReply({
                        content: "⚠️ Este jogador não consta na lista de residentes da sua base."
                    });
                }

                return interaction.editReply({
                    content: `👢 **${alvoChar?.nome || alvoUser.username}** foi removido da base **${base.nome}**.`
                });
            }

            if (subcomando === "empreendimento") {
                const modal = new ModalBuilder()
                    .setCustomId(`mod_empreend_${interaction.id}`)
                    .setTitle(`Gestão de Empreendimento`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("int_valor")
                                .setLabel("Seu Modificador de Inteligência")
                                .setPlaceholder("Ex: 4")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);

                try {
                    const mSub = await interaction.awaitModalSubmit({
                        filter: m => m.customId === `mod_empreend_${interaction.id}`,
                        time: 60000
                    });

                    await mSub.deferReply();

                    const char = await getPersonagemAtivo(interaction.user.id);
                    const base = await prisma.base.findFirst({
                        where: { OR: [{ dono_id: char?.id }, { residentes: { some: { personagem_id: char?.id } } }] },
                        include: { residentes: { include: { personagem: true } }, dono: true }
                    });

                    if (!char) return mSub.editReply({ content: "🚫 Você não tem um personagem ativo." });
                    if (!base) return mSub.editReply({ content: "🚫 Você não pertence a uma base." });
                    if (base.tipo !== "Empreendimento") {
                        return mSub.editReply({ content: `🚫 Sua base (${base.tipo}) não é um Empreendimento.` });
                    }

                    const modInt = parseInt(mSub.fields.getTextInputValue("int_valor")) || 0;
                    const dado = Math.floor(Math.random() * 20) + 1;
                    const bonusPorte = PORTES[base.porte].comodos;
                    const resultadoTeste = dado + modInt + bonusPorte;

                    const ehDono = base.dono_id === char.id;
                    const multiplicador = ehDono ? 20 : 10;
                    const totalLucro = resultadoTeste * multiplicador;

                    const todosResidentes = [base.dono_id, ...base.residentes.map(r => r.personagem_id)];
                    const lucroPorCada = Math.floor(totalLucro / todosResidentes.length);

                    await prisma.$transaction([
                        ...todosResidentes.map(id =>
                            prisma.personagens.update({ where: { id }, data: { saldo: { increment: lucroPorCada } } })
                        ),
                        prisma.transacao.create({
                            data: {
                                personagem_id: char.id,
                                descricao: `Lucro: ${base.nome} (${ehDono ? "Dono" : "Morador"})`,
                                valor: totalLucro,
                                tipo: "RECOMPENSA"
                            }
                        })
                    ]);

                    const embedResult = new EmbedBuilder()
                        .setTitle(`💰 Resultado do Empreendimento: ${base.nome}`)
                        .setColor(ehDono ? "#FFD700" : "#C0C0C0")
                        .setDescription(`**${char.nome}** administrou os negócios!`)
                        .addFields(
                            {
                                name: "🎲 Teste",
                                value: `d20(${dado}) + Int(${modInt}) + Bônus(${bonusPorte}) = **${resultadoTeste}**`,
                                inline: true
                            },
                            { name: "📊 Cargo", value: ehDono ? "👑 Dono (x20)" : "👥 Morador (x10)", inline: true },
                            { name: "💵 Lucro Total", value: `**K$ ${totalLucro}**`, inline: true },
                            { name: "👥 Divisão", value: `Cada um recebeu **K$ ${lucroPorCada}**`, inline: false }
                        );

                    return mSub.editReply({ embeds: [embedResult] });
                } catch (err) {
                    console.error("Erro no modal de empreendimento:", err);
                }
            }

            if (subcomando === "desfazer") {
                const base = await prisma.base.findFirst({
                    where: { dono_id: char.id },
                    include: { comodos: true, residentes: true, mobilias: true }
                });

                if (!base) {
                    return interaction.editReply({
                        content: "🚫 Você não possui uma base para desfazer ou não é o dono oficial dela."
                    });
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm_delete_${interaction.id}`)
                        .setLabel("Confirmar Exclusão")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`cancel_delete_${interaction.id}`)
                        .setLabel("Cancelar")
                        .setStyle(ButtonStyle.Secondary)
                );

                const response = await interaction.editReply({
                    content: `⚠️ **ATENÇÃO:** Você está prestes a destruir a base **${base.nome}**.\nIsso removerá todos os ${base.comodos.length} cômodos e expulsará todos os moradores.\n**Não haverá reembolso de Kwanzas.** Deseja continuar?`,
                    components: [row]
                });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 30000
                });

                collector.on("collect", async i => {
                    if (i.customId.startsWith("cancel_delete_")) {
                        await i.update({ content: "✅ Exclusão cancelada. Sua base continua segura.", components: [] });
                        return collector.stop();
                    }

                    if (i.customId.startsWith("confirm_delete_")) {
                        await i.deferUpdate();

                        await prisma.$transaction([
                            prisma.baseMobilia.deleteMany({ where: { base_id: base.id } }),
                            prisma.baseComodo.deleteMany({ where: { base_id: base.id } }),
                            prisma.baseResidente.deleteMany({ where: { base_id: base.id } }),
                            prisma.base.delete({ where: { id: base.id } })
                        ]);

                        await interaction.editReply({
                            content: `💣 **${base.nome}** foi demolida com sucesso. Você agora não possui mais uma base.`,
                            components: []
                        });
                        return collector.stop();
                    }
                });

                collector.on("end", (collected, reason) => {
                    if (reason === "time") {
                        interaction
                            .editReply({ content: "⏰ Tempo de confirmação expirado.", components: [] })
                            .catch(() => {});
                    }
                });
            }

            if (subcomando === "upgrade") {
                const base = await prisma.base.findFirst({
                    where: { dono_id: char.id }
                });

                if (!base) {
                    return interaction.editReply({
                        content: "🚫 Apenas o **Dono da Base** pode fazer upgrades (ou você não possui uma)."
                    });
                }

                const porteAtual = PORTES[base.porte];
                
                const upgradesDisponiveis = Object.entries(PORTES).filter(
                    ([nome, dados]) => dados.valor > porteAtual.valor
                );

                if (upgradesDisponiveis.length === 0) {
                    return interaction.editReply({
                        content: "⭐ Sua base já atingiu o porte máximo disponível!"
                    });
                }

                const menuUpgrade = new StringSelectMenuBuilder()
                    .setCustomId(`sel_upg_${interaction.id}`)
                    .setPlaceholder("Selecione o novo porte...");

                upgradesDisponiveis.forEach(([nome, dados]) => {
                    const custoDiferenca = dados.custo - porteAtual.custo;
                    menuUpgrade.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${nome} (K$ ${custoDiferenca})`)
                            .setDescription(`Cômodos: ${dados.comodos} | Manutenção: K$ ${dados.manutencao}`)
                            .setValue(nome)
                    );
                });

                const response = await interaction.editReply({
                    content: `⬆️ **Upgrade de Base**\n**Base:** ${base.nome} | **Porte Atual:** ${base.porte}\n**Seu Saldo:** ${formatarMoeda(char.saldo)}\n\n*Escolha para qual porte deseja evoluir (você paga apenas a diferença):*`,
                    components: [new ActionRowBuilder().addComponents(menuUpgrade)],
                    withResponse: true
                });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                collector.on("collect", async iSelect => {
                    await iSelect.deferUpdate();
                    const novoPorteNome = iSelect.values[0];
                    const dadosNovoPorte = PORTES[novoPorteNome];
                    
                    const custoUpgrade = dadosNovoPorte.custo - porteAtual.custo;

                    const charNaHora = await prisma.personagens.findUnique({ where: { id: char.id } });
                    
                    if (charNaHora.saldo < custoUpgrade) {
                        return iSelect.followUp({
                            content: `💸 Saldo insuficiente. Você precisa de **K$ ${custoUpgrade}** para este upgrade.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    await prisma.$transaction([
                        prisma.personagens.update({
                            where: { id: char.id },
                            data: { saldo: { decrement: custoUpgrade } }
                        }),
                        prisma.transacao.create({
                            data: {
                                personagem_id: char.id,
                                descricao: `Upgrade de Base: ${base.porte} ➡️ ${novoPorteNome}`,
                                valor: custoUpgrade,
                                tipo: "GASTO"
                            }
                        }),
                        prisma.base.update({
                            where: { id: base.id },
                            data: { porte: novoPorteNome }
                        })
                    ]);

                    await interaction.editReply({
                        content: `🎉 **Upgrade Concluído!**\nSua base **${base.nome}** agora é de porte **${novoPorteNome}**.\nK$ ${custoUpgrade} foram deduzidos do seu saldo.`,
                        components: []
                    });
                    
                    collector.stop();
                });
            }
        } catch (err) {
            console.error("Erro crítico no comando base:", err);
            if (interaction.deferred) {
                await interaction.editReply({ content: "❌ Ocorreu um erro no sistema de bases." });
            }
        }
    }
};
