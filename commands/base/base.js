const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuOptionBuilder,
    MessageFlags
} = require("discord.js");
const { PORTES, COMODOS, TIPOS, MOBILIAS } = require("../../data/baseData.js");
const BaseService = require("../../services/BaseService.js");
const BaseRepository = require("../../repositories/BaseRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("base")
        .setDescription("Gerenciamento de Bases.")
        .addSubcommand(sub => sub.setName("fundar").setDescription("Compra uma nova base."))
        .addSubcommand(sub => sub.setName("painel").setDescription("Painel da sua base."))
        .addSubcommand(sub => sub.setName("construir").setDescription("Constrói um novo cômodo (K$ 1.000)."))
        .addSubcommand(sub => sub.setName("mobiliar").setDescription("Compra mobílias."))
        .addSubcommand(sub => sub.setName("reparar").setDescription("Conserta um cômodo danificado (K$ 500)."))
        .addSubcommand(sub =>
            sub
                .setName("morador-add")
                .setDescription("Convida um morador.")
                .addUserOption(opt => opt.setName("jogador").setDescription("O jogador").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("morador-remover")
                .setDescription("Remove um morador.")
                .addUserOption(opt => opt.setName("jogador").setDescription("O jogador").setRequired(true))
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const char = await getPersonagemAtivo(interaction.user.id);
        if (!char) return interaction.reply({ content: "🚫 Sem personagem ativo.", flags: MessageFlags.Ephemeral });

        const subcomando = interaction.options.getSubcommand();

        try {
            if (subcomando === "painel") {
                const base = await BaseRepository.buscarBaseCompleta(char.id);
                if (!base)
                    return interaction.reply({
                        content: "🚫 Você não pertence a nenhuma base.",
                        flags: MessageFlags.Ephemeral
                    });

                const limCom = PORTES[base.porte].comodos;
                const listaComodos =
                    base.comodos
                        .map(c => {
                            const mobs = c.mobilias.map(m => m.nome_item).join(", ");
                            let txt = c.danificado ? `~~${c.nome_comodo}~~ ⚠️` : `**${c.nome_comodo}**`;
                            if (mobs) txt += `\n╰ 🛋️ *${mobs}*`;
                            return txt;
                        })
                        .join("\n") || "Nenhum cômodo construído.";

                const embed = new EmbedBuilder()
                    .setTitle(`🏰 ${base.nome}`)
                    .setColor(base.manutencao_paga ? "#00AAFF" : "#ED4245")
                    .setDescription(`**Dono:** ${base.dono.nome}\n**Tipo:** ${base.tipo}\n${TIPOS[base.tipo]}`)
                    .addFields(
                        { name: "🛡️ Segurança", value: `${base.seguranca}`, inline: true },
                        {
                            name: "💰 Manutenção",
                            value: `K$ ${PORTES[base.porte].manutencao} ${base.manutencao_paga ? "✅" : "⚠️"}`,
                            inline: true
                        },
                        {
                            name: `👥 Equipe (${base.residentes.length}/4)`,
                            value: base.residentes.map(r => `• ${r.personagem.nome}`).join("\n") || "Vazia",
                            inline: true
                        },
                        { name: `🏠 Estrutura (${base.comodos.length}/${limCom})`, value: listaComodos }
                    );

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            if (subcomando === "fundar") {
                const menuPorte = new StringSelectMenuBuilder()
                    .setCustomId("sel_porte")
                    .setPlaceholder("Escolha o Porte");
                Object.entries(PORTES).forEach(([n, d]) =>
                    menuPorte.addOptions(
                        new StringSelectMenuOptionBuilder().setLabel(`${n} (K$ ${d.custo})`).setValue(n)
                    )
                );

                const resp = await interaction.reply({
                    content: "🏰 **Escolha o porte da sua fundação:**",
                    components: [new ActionRowBuilder().addComponents(menuPorte)],
                    flags: MessageFlags.Ephemeral
                });
                const col = resp.createMessageComponentCollector({ time: 60000 });

                col.on("collect", async i => {
                    const porte = i.values[0];
                    if (char.saldo < PORTES[porte].custo)
                        return i.reply({ content: "💸 Saldo insuficiente.", flags: MessageFlags.Ephemeral });

                    const modal = new ModalBuilder()
                        .setCustomId(`mod_base_${porte}`)
                        .setTitle("Nome da Base")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("nome")
                                    .setLabel("Nome da Base")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            )
                        );

                    await i.showModal(modal);
                    const subModal = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);

                    if (subModal) {
                        await subModal.deferUpdate();
                        await BaseService.fundarBase(
                            char,
                            subModal.fields.getTextInputValue("nome"),
                            "Padrão",
                            porte,
                            PORTES[porte].custo
                        );
                        await interaction.editReply({
                            content: `🎉 Base **${subModal.fields.getTextInputValue("nome")}** fundada com sucesso!`,
                            components: []
                        });
                    }
                });
            }

            if (subcomando === "reparar") {
                const base = await BaseRepository.buscarBaseCompleta(char.id);
                const danificados = base.comodos.filter(c => c.danificado);

                if (danificados.length === 0)
                    return interaction.reply({
                        content: "✅ Todos os seus cômodos estão em perfeito estado!",
                        flags: MessageFlags.Ephemeral
                    });
                if (char.saldo < 500)
                    return interaction.reply({
                        content: "💸 Você precisa de K$ 500 para realizar um reparo.",
                        flags: MessageFlags.Ephemeral
                    });

                const menuReparo = new StringSelectMenuBuilder()
                    .setCustomId("reparar_sel")
                    .setPlaceholder("Qual cômodo deseja consertar?");
                danificados.forEach(c =>
                    menuReparo.addOptions(
                        new StringSelectMenuOptionBuilder().setLabel(c.nome_comodo).setValue(String(c.id))
                    )
                );

                const resp = await interaction.reply({
                    content: "🏚️ **Cômodos Danificados:**\nEscolha qual deseja reparar por **K$ 500**:",
                    components: [new ActionRowBuilder().addComponents(menuReparo)],
                    flags: MessageFlags.Ephemeral
                });
                const col = resp.createMessageComponentCollector({ time: 30000 });

                col.on("collect", async i => {
                    await i.deferUpdate();
                    await BaseService.processarReparo(char, parseInt(i.values[0]));
                    await interaction.editReply({
                        content: "✅ Reparo concluído! O cômodo está novo de novo.",
                        components: []
                    });
                });
            }

            if (subcomando === "fundar") {
                const menuPorte = new StringSelectMenuBuilder()
                    .setCustomId("sel_porte")
                    .setPlaceholder("Escolha o Porte");
                Object.entries(PORTES).forEach(([n, d]) =>
                    menuPorte.addOptions(
                        new StringSelectMenuOptionBuilder().setLabel(`${n} (K$ ${d.custo})`).setValue(n)
                    )
                );

                const resp = await interaction.reply({
                    content: "🏰 **Escolha o porte da sua fundação:**",
                    components: [new ActionRowBuilder().addComponents(menuPorte)],
                    flags: MessageFlags.Ephemeral
                });

                const col = resp.createMessageComponentCollector({ time: 60000 });
                col.on("collect", async i => {
                    const porte = i.values[0];
                    if (char.saldo < PORTES[porte].custo)
                        return i.reply({ content: "💸 Saldo insuficiente.", flags: MessageFlags.Ephemeral });

                    await i.reply({
                        content: `✅ Você selecionou ${porte}. Use o sistema administrativo para finalizar o registro (ou implemente o modal aqui).`,
                        flags: MessageFlags.Ephemeral
                    });
                });
            }

            if (subcomando === "morador-add") {
                const base = await BaseRepository.buscarPorDono(char.id);
                if (!base)
                    return interaction.reply({
                        content: "🚫 Apenas o dono pode convidar moradores.",
                        flags: MessageFlags.Ephemeral
                    });

                const alvoUser = interaction.options.getUser("jogador");
                const alvoChar = await getPersonagemAtivo(alvoUser.id);

                if (!alvoChar)
                    return interaction.reply({
                        content: "🚫 O alvo não tem um personagem ativo.",
                        flags: MessageFlags.Ephemeral
                    });

                try {
                    await BaseService.adicionarMorador(base.id, alvoChar.id);
                    return interaction.reply({
                        content: `✅ **${alvoChar.nome}** agora é um residente oficial de **${base.nome}**!`
                    });
                } catch (e) {
                    const msg =
                        e.message === "JÁ_POSSUI_BASE"
                            ? "🚫 Este personagem já possui uma residência."
                            : "🚫 Base lotada (máx 4 moradores).";
                    return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
                }
            }

            if (subcomando === "morador-remover") {
                const base = await BaseRepository.buscarPorDono(char.id);
                if (!base)
                    return interaction.reply({
                        content: "🚫 Apenas o dono pode gerenciar moradores.",
                        flags: MessageFlags.Ephemeral
                    });

                const alvoUser = interaction.options.getUser("jogador");
                const alvoChar = await getPersonagemAtivo(alvoUser.id);

                await BaseService.expulsarMorador(base.id, alvoChar.id);
                return interaction.reply({
                    content: `👢 **${alvoChar?.nome || "O personagem"}** foi removido da base.`
                });
            }

            if (subcomando === "construir") {
                const base = await BaseRepository.buscarPorDono(char.id);
                if (!base)
                    return interaction.reply({
                        content: "🚫 Apenas o dono pode construir.",
                        flags: MessageFlags.Ephemeral
                    });

                if (base.comodos.length >= PORTES[base.porte].comodos) {
                    return interaction.reply({
                        content: "🚫 Limite de cômodos atingido para o porte atual.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const comodosArray = Object.entries(COMODOS).sort((a, b) => a[0].localeCompare(b[0]));
                const mid = Math.ceil(comodosArray.length / 2);

                const menu1 = new StringSelectMenuBuilder()
                    .setCustomId(`build_1_${interaction.id}`)
                    .setPlaceholder("Cômodos (A - L)");
                const menu2 = new StringSelectMenuBuilder()
                    .setCustomId(`build_2_${interaction.id}`)
                    .setPlaceholder("Cômodos (M - Z)");

                comodosArray
                    .slice(0, mid)
                    .forEach(([nome, d]) =>
                        menu1.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(nome)
                                .setDescription(d.desc.slice(0, 100))
                                .setValue(nome)
                        )
                    );
                comodosArray
                    .slice(mid)
                    .forEach(([nome, d]) =>
                        menu2.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(nome)
                                .setDescription(d.desc.slice(0, 100))
                                .setValue(nome)
                        )
                    );

                const resp = await interaction.reply({
                    content: `🔨 **Obras em ${base.nome}**\nCusto por cômodo: **K$ 1.000**\nSelecione o que deseja construir:`,
                    components: [
                        new ActionRowBuilder().addComponents(menu1),
                        new ActionRowBuilder().addComponents(menu2)
                    ],
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });

                const col = resp.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                col.on("collect", async i => {
                    await i.deferUpdate();
                    const escolhido = i.values[0];
                    const dados = COMODOS[escolhido];

                    if (char.saldo < 1000)
                        return i.followUp({
                            content: "💸 Saldo insuficiente para a obra.",
                            flags: MessageFlags.Ephemeral
                        });

                    if (dados.reqPorte && PORTES[base.porte].valor < PORTES[dados.reqPorte].valor) {
                        return i.followUp({
                            content: `🚫 Requer porte **${dados.reqPorte}** ou superior.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    if (dados.reqComodo && !base.comodos.some(c => c.nome_comodo === dados.reqComodo)) {
                        return i.followUp({
                            content: `🚫 Requer a construção prévia de: **${dados.reqComodo}**.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    if (escolhido !== "Suíte" && base.comodos.some(c => c.nome_comodo === escolhido)) {
                        return i.followUp({
                            content: `🚫 Você já possui um(a) ${escolhido}.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    await BaseService.construirComodo(char, base, escolhido, dados);
                    await interaction.editReply({
                        content: `✅ **${escolhido}** construído com sucesso!`,
                        components: []
                    });
                    col.stop();
                });
            }

            if (subcomando === "mobiliar") {
                const base = await BaseRepository.buscarBasePorPersonagem(char.id);
                if (!base || base.dono_id !== char.id) {
                    return interaction.reply({
                        content: "🚫 Apenas o dono pode mobiliar a base.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const mobArray = Object.entries(MOBILIAS).sort((a, b) => a[0].localeCompare(b[0]));
                const half = Math.ceil(mobArray.length / 2);

                const menu1 = new StringSelectMenuBuilder()
                    .setCustomId(`mob_1_${interaction.id}`)
                    .setPlaceholder("Mobílias (A - L)");
                const menu2 = new StringSelectMenuBuilder()
                    .setCustomId(`mob_2_${interaction.id}`)
                    .setPlaceholder("Mobílias (M - Z)");

                mobArray
                    .slice(0, half)
                    .forEach(([nome, d]) =>
                        menu1.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${nome} (K$ ${d.custo})`)
                                .setValue(nome)
                                .setDescription(d.desc.slice(0, 50))
                        )
                    );
                mobArray
                    .slice(half)
                    .forEach(([nome, d]) =>
                        menu2.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${nome} (K$ ${d.custo})`)
                                .setValue(nome)
                                .setDescription(d.desc.slice(0, 50))
                        )
                    );

                const shopMsg = await interaction.reply({
                    content: `🛋️ **Loja de Mobílias** | Saldo: ${formatarMoeda(char.saldo)}\nEscolha um item para ver as opções de instalação:`,
                    components: [
                        new ActionRowBuilder().addComponents(menu1),
                        new ActionRowBuilder().addComponents(menu2)
                    ],
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });

                const shopCol = shopMsg.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                shopCol.on("collect", async iSelect => {
                    const escolhido = iSelect.values[0];
                    const dadosMob = MOBILIAS[escolhido];

                    if (char.saldo < dadosMob.custo) {
                        return iSelect.reply({
                            content: `💸 Saldo insuficiente. Você precisa de ${formatarMoeda(dadosMob.custo)}.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (escolhido === "Gárgula animada") {
                        await iSelect.deferUpdate();
                        try {
                            await BaseService.validarEInstalarMobilia(char, base, escolhido, null);
                            return interaction.editReply({
                                content: `✅ **Gárgula Animada** instalada com sucesso! Segurança da base +2.`,
                                components: []
                            });
                        } catch (e) {
                            return interaction.followUp({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral });
                        }
                    }

                    const comodosValidos = base.comodos.filter(c => {
                        const tipoCerto =
                            dadosMob.reqComodos.length === 0 || dadosMob.reqComodos.includes(c.nome_comodo);
                        const ocupacao = c.mobilias.length;
                        const cap = c.nome_comodo === "Sala de estar" ? 3 : 1;

                        return tipoCerto && ocupacao < cap && !c.danificado;
                    });

                    if (comodosValidos.length === 0) {
                        return iSelect.reply({
                            content: `🚫 Sem cômodos compatíveis ou livres para **${escolhido}**.\n*Nota: Não é possível mobiliar cômodos danificados ou lotados.*`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const menuInstalar = new StringSelectMenuBuilder()
                        .setCustomId(`instalar_${interaction.id}`)
                        .setPlaceholder("Em qual cômodo deseja instalar?");
                    comodosValidos.forEach(c =>
                        menuInstalar.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(c.nome_comodo)
                                .setDescription(
                                    `Espaço: ${c.mobilias.length}/${c.nome_comodo === "Sala de estar" ? 3 : 1}`
                                )
                                .setValue(String(c.id))
                        )
                    );

                    await iSelect.reply({
                        content: `📍 Onde deseja colocar seu(sua) **${escolhido}**?`,
                        components: [new ActionRowBuilder().addComponents(menuInstalar)],
                        flags: MessageFlags.Ephemeral
                    });

                    const instCol = iSelect.channel.createMessageComponentCollector({
                        filter: ui => ui.user.id === interaction.user.id,
                        time: 30000,
                        max: 1
                    });

                    instCol.on("collect", async iInst => {
                        await iInst.deferUpdate();
                        try {
                            const comodoId = parseInt(iInst.values[0]);
                            await BaseService.validarEInstalarMobilia(char, base, escolhido, comodoId);

                            await interaction.editReply({
                                content: `✅ **${escolhido}** comprado e instalado com sucesso!`,
                                components: []
                            });
                            await iSelect.deleteReply().catch(() => {});
                        } catch (e) {
                            await interaction.followUp({
                                content: `❌ Erro: ${e.message}`,
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    });
                });
            }
        } catch (err) {
            console.error(err);
            interaction.reply({ content: "❌ Erro no sistema de bases.", flags: MessageFlags.Ephemeral });
        }
    }
};
