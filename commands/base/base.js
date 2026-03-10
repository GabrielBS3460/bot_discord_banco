const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
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
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char)
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });

            const subcomando = interaction.options.getSubcommand();

            if (subcomando === "mobiliar") {
                const base = await prisma.base.findFirst({
                    where: { dono_id: char.id },
                    include: { comodos: true, mobilias: true }
                });

                if (!base) {
                    return interaction.reply({
                        content: "🚫 Apenas o **Dono da Base** pode mobiliar cômodos.",
                        flags: MessageFlags.Ephemeral
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
                                .setDescription(d.desc)
                                .setValue(nome)
                        )
                    );
                mobiliasArray
                    .slice(half)
                    .forEach(([nome, d]) =>
                        menuM_Z.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${nome} (K$ ${d.custo})`)
                                .setDescription(d.desc)
                                .setValue(nome)
                        )
                    );

                await interaction.reply({
                    content: `🛋️ **Loja de Mobílias**\n**Base:** ${base.nome} | **Seu Saldo:** ${formatarMoeda(char.saldo)}\n\n*Selecione o item que deseja comprar:*`,
                    components: [
                        new ActionRowBuilder().addComponents(menuA_L),
                        new ActionRowBuilder().addComponents(menuM_Z)
                    ],
                    flags: MessageFlags.Ephemeral
                });

                const replyMsg = await interaction.fetchReply();
                const collector = replyMsg.createMessageComponentCollector({
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
                            prisma.base.update({ where: { id: base.id }, data: { seguranca: { increment: 2 } } }) // Aplica +2 de seguranca
                        ]);

                        await interaction.editReply({
                            content: `✅ **Gárgula Animada** instalada nos muros! K$ ${dadosMob.custo} deduzidos.\n🛡️ Segurança da base aumentou em +2!`,
                            components: []
                        });
                        return collector.stop();
                    }

                    if (base.comodos.length === 0) {
                        return iSelect.followUp({
                            content: "🚫 Sua base não tem nenhum cômodo construído para abrigar mobílias.",
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
                                .setLabel(`${c.nome_comodo} (ID: ${c.id})`)
                                .setDescription(`Espaço: ${qtdAtual}/${cap}`)
                                .setValue(String(c.id))
                        );
                    });

                    const replyConfirm = await iSelect.followUp({
                        content: `**Item:** ${escolhido} (K$ ${dadosMob.custo})\nSelecione em qual cômodo deseja instalá-lo:`,
                        components: [new ActionRowBuilder().addComponents(menuInstalar)],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const msgConfirm = replyConfirm.resource ? replyConfirm.resource.message : replyConfirm;
                    const instCollector = msgConfirm.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });

                    instCollector.on("collect", async iInst => {
                        await iInst.deferUpdate();
                        const comodoId = parseInt(iInst.values[0]);

                        const charNaHora = await prisma.personagens.findUnique({ where: { id: char.id } });
                        if (charNaHora.saldo < dadosMob.custo)
                            return iInst.followUp({
                                content: "💸 Saldo insuficiente no momento da confirmação.",
                                flags: MessageFlags.Ephemeral
                            });

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

                if (!base)
                    return interaction.reply({
                        content: "🚫 Apenas o Dono da Base pode construir.",
                        flags: MessageFlags.Ephemeral
                    });

                const limiteComodos = PORTES[base.porte].comodos;
                if (base.comodos.length >= limiteComodos)
                    return interaction.reply({
                        content: `🚫 Sua base atingiu o limite de ${limiteComodos} cômodos.`,
                        flags: MessageFlags.Ephemeral
                    });
                if (char.saldo < 1000)
                    return interaction.reply({
                        content: `💸 Construir custa K$ 1.000.`,
                        flags: MessageFlags.Ephemeral
                    });

                const comodosArray = Object.entries(COMODOS).sort((a, b) => a[0].localeCompare(b[0]));
                const menuA_L = new StringSelectMenuBuilder()
                    .setCustomId(`menu_com_1_${interaction.id}`)
                    .setPlaceholder("Cômodos (A - L)");
                const menuM_Z = new StringSelectMenuBuilder()
                    .setCustomId(`menu_com_2_${interaction.id}`)
                    .setPlaceholder("Cômodos (M - Z)");

                comodosArray
                    .slice(0, 21)
                    .forEach(([nome, d]) =>
                        menuA_L.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(nome)
                                .setDescription(d.desc.substring(0, 100))
                                .setValue(nome)
                        )
                    );
                comodosArray
                    .slice(21)
                    .forEach(([nome, d]) =>
                        menuM_Z.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(nome)
                                .setDescription(d.desc.substring(0, 100))
                                .setValue(nome)
                        )
                    );

                await interaction.reply({
                    content: `🔨 **Construção de Cômodos**\n**Base:** ${base.nome} | **Espaço:** ${limiteComodos - base.comodos.length}\n*Custo:* K$ 1.000`,
                    components: [
                        new ActionRowBuilder().addComponents(menuA_L),
                        new ActionRowBuilder().addComponents(menuM_Z)
                    ],
                    flags: MessageFlags.Ephemeral
                });

                const replyMsg = await interaction.fetchReply();
                const collector = replyMsg.createMessageComponentCollector({
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
                            content: `🚫 Requer o cômodo: ${dados.reqComodo}.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    if (escolhido !== "Suíte" && base.comodos.some(c => c.nome_comodo === escolhido)) {
                        return iSelect.followUp({
                            content: `🚫 Você já possui este cômodo.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const charNaHora = await prisma.personagens.findUnique({ where: { id: char.id } });
                    if (charNaHora.saldo < 1000)
                        return iSelect.followUp({ content: "💸 Saldo insuficiente.", flags: MessageFlags.Ephemeral });

                    await prisma.$transaction(async tx => {
                        await tx.personagens.update({ where: { id: char.id }, data: { saldo: { decrement: 1000 } } });
                        await tx.transacao.create({
                            data: {
                                personagem_id: char.id,
                                descricao: `Construiu: ${escolhido}`,
                                valor: 1000,
                                tipo: "GASTO"
                            }
                        });
                        await tx.baseComodo.create({ data: { base_id: base.id, nome_comodo: escolhido } });
                        if (dados.addSeguranca > 0)
                            await tx.base.update({
                                where: { id: base.id },
                                data: { seguranca: { increment: dados.addSeguranca } }
                            });
                    });

                    let bonus = `✅ **${escolhido}** construído!`;
                    if (dados.addSeguranca > 0) bonus += `\n🛡️ Segurança +${dados.addSeguranca}!`;
                    await interaction.editReply({ content: bonus, components: [] });
                    collector.stop();
                });
            }

            if (subcomando === "fundar") {
                const baseExistente = await prisma.base.findFirst({
                    where: { OR: [{ dono_id: char.id }, { residentes: { some: { personagem_id: char.id } } }] }
                });

                if (baseExistente)
                    return interaction.reply({
                        content: `🚫 Você já pertence a uma base.`,
                        flags: MessageFlags.Ephemeral
                    });

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

                await interaction.reply({
                    content: `🏰 **Fundação**\nEscolha o Porte:`,
                    components: [new ActionRowBuilder().addComponents(menuPorte)],
                    flags: MessageFlags.Ephemeral
                });
                const replyMsg = await interaction.fetchReply();
                const collector = replyMsg.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 180000
                });

                let pEscolha = null;
                collector.on("collect", async i => {
                    if (i.customId.startsWith("sel_porte_")) {
                        pEscolha = i.values[0];
                        if (char.saldo < PORTES[pEscolha].custo)
                            return i.reply({ content: `💸 Saldo Insuficiente.`, flags: MessageFlags.Ephemeral });
                        const menuTipo = new StringSelectMenuBuilder()
                            .setCustomId(`sel_tipo_${interaction.id}`)
                            .setPlaceholder("Selecione a Especialidade...");
                        Object.entries(TIPOS).forEach(([n, d]) =>
                            menuTipo.addOptions(
                                new StringSelectMenuOptionBuilder().setLabel(n).setDescription(d).setValue(n)
                            )
                        );
                        await i.update({
                            content: `🏰 **Passo 2:** Especialidade`,
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
                                filter: m =>
                                    m.customId === `mod_nome_${interaction.id}` && m.user.id === interaction.user.id,
                                time: 60000
                            });
                            await mSub.deferUpdate();
                            const nome = mSub.fields.getTextInputValue("inp_nome").trim();
                            const custo = PORTES[pEscolha].custo;
                            const check = await prisma.personagens.findUnique({ where: { id: char.id } });
                            if (check.saldo < custo)
                                return interaction.editReply({ content: "❌ Saldo insuficiente.", components: [] });

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
                            await interaction.editReply({ content: `🎉 Base **${nome}** criada!`, components: [] });
                            collector.stop();
                            // eslint-disable-next-line no-unused-vars
                        } catch (err) {
                            /* empty */
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
                if (!base) return interaction.reply({ content: "🚫 Sem base.", flags: MessageFlags.Ephemeral });

                const montarEmbedPainel = b => {
                    const limCom = PORTES[b.porte].comodos;
                    const res = b.residentes.map(r => `• ${r.personagem.nome}`).join("\n") || "Nenhum.";

                    const coms =
                        b.comodos
                            .map(c => {
                                const mobs = c.mobilias.map(m => m.nome_item).join(", ");
                                let txt = c.danificado ? `~~${c.nome_comodo}~~ ⚠️` : c.nome_comodo;
                                if (mobs) txt += ` *[${mobs}]*`;
                                return txt;
                            })
                            .join("\n") || "Nenhum.";

                    const ext = b.mobilias
                        .filter(m => !m.comodo_id)
                        .map(m => m.nome_item)
                        .join(", ");

                    const embed = new EmbedBuilder()
                        .setColor(b.manutencao_paga ? "#00AAFF" : "#FF0000")
                        .setTitle(`🏰 ${b.nome}`)
                        .setDescription(`**Dono:** ${b.dono.nome}\n**Tipo:** ${b.tipo}\n${TIPOS[b.tipo]}`)
                        .addFields(
                            { name: "Porte", value: b.porte, inline: true },
                            { name: "Segurança", value: `${b.seguranca}`, inline: true },
                            {
                                name: "Manutenção",
                                value: `K$ ${PORTES[b.porte].manutencao} ${b.manutencao_paga ? "✅" : "⚠️"}`,
                                inline: true
                            },
                            { name: `Equipe (${b.residentes.length}/4)`, value: res, inline: true },
                            { name: `Cômodos (${b.comodos.length}/${limCom})`, value: coms, inline: false }
                        );

                    if (ext) embed.addFields({ name: "Exterior", value: ext });
                    return embed;
                };

                await interaction.reply({ embeds: [montarEmbedPainel(base)], flags: MessageFlags.Ephemeral });
            }
        } catch (err) {
            console.error("Erro no base:", err);
            interaction
                .reply({ content: "❌ Ocorreu um erro no sistema de bases.", flags: MessageFlags.Ephemeral })
                .catch(() => {});
        }
    }
};
