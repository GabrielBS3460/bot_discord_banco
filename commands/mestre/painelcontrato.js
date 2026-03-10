const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const ContratoService = require("../../services/ContratoService.js");
const ContratoRepository = require("../../repositories/ContratoRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("painelcontrato")
        .setDescription("Gerencia um contrato (Apenas Mestre Criador).")
        .addStringOption(opt => opt.setName("nome").setDescription("Nome exato do contrato").setRequired(true)),

    async execute({ interaction, getPersonagemAtivo, ID_CARGO_ADMIN }) {
        const nomeMissao = interaction.options.getString("nome").trim();
        let missao = await ContratoRepository.buscarPorNomeCompleto(nomeMissao);

        if (!missao)
            return interaction.reply({ content: "🚫 Contrato não encontrado.", flags: MessageFlags.Ephemeral });

        const eAdmin = interaction.member.roles.cache.has(ID_CARGO_ADMIN);
        if (missao.criador_id !== interaction.user.id && !eAdmin) {
            return interaction.reply({ content: "🚫 Sem permissão.", flags: MessageFlags.Ephemeral });
        }

        const atualizarInterface = async it => {
            missao = await ContratoRepository.buscarPorNomeCompleto(nomeMissao); // Refresh dados
            const selecionados = missao.inscricoes.filter(i => i.selecionado);
            const fila = missao.inscricoes.filter(i => !i.selecionado);

            const embed = new EmbedBuilder()
                .setColor(missao.status === "CONCLUIDA" ? "#00FF00" : "#FFA500")
                .setTitle(`🛡️ Gestão: ${missao.nome}`)
                .setDescription(`**ND:** ${missao.nd} | **Vagas:** ${missao.vagas} | **Status:** ${missao.status}`)
                .addFields(
                    {
                        name: `Equipe (${selecionados.length}/${missao.vagas})`,
                        value: selecionados.map(i => `✅ **${i.personagem.nome}**`).join("\n") || "Vazia",
                        inline: true
                    },
                    {
                        name: "Fila",
                        value: fila.map(i => `⏳ ${i.personagem.nome}`).join("\n") || "Vazia",
                        inline: true
                    }
                );

            const buttons1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ms_sortear")
                    .setLabel("Sortear Equipe")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(missao.status !== "ABERTA"),
                new ButtonBuilder()
                    .setCustomId("ms_add_player")
                    .setLabel("Adicionar Player")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("➕")
                    .setDisabled(missao.status === "CONCLUIDA"),
                new ButtonBuilder()
                    .setCustomId("ms_gerenciar")
                    .setLabel("Remover player")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("❌")
                    .setDisabled(missao.status === "CONCLUIDA")
            );

            const buttons2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ms_iniciar")
                    .setLabel("Iniciar Contrato")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(missao.status !== "ABERTA"),
                new ButtonBuilder()
                    .setCustomId("ms_concluir")
                    .setLabel("Concluir Contrato")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(missao.status === "CONCLUIDA"),
                new ButtonBuilder()
                    .setCustomId("ms_vagas")
                    .setLabel("Modificar Vagas")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🔢")
                    .setDisabled(missao.status === "CONCLUIDA")
            );

            const payload = { embeds: [embed], components: [buttons1, buttons2] };
            return it.replied ? it.editReply(payload) : it.reply(payload);
        };

        await atualizarInterface(interaction);
        const msg = await interaction.fetchReply();
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 600000
        });

        collector.on("collect", async i => {
            try {
                if (i.customId === "ms_sortear") {
                    await i.deferUpdate();
                    await ContratoService.sortearEquipe(missao);
                    return atualizarInterface(interaction);
                }

                if (i.customId === "ms_iniciar") {
                    await i.deferUpdate();
                    await ContratoRepository.atualizarStatus(missao.id, "EM_ANDAMENTO");
                    return atualizarInterface(interaction);
                }

                if (i.customId === "ms_concluir") {
                    await i.deferUpdate();
                    const mestreChar = await getPersonagemAtivo(missao.criador_id);
                    await ContratoService.concluirMissao(missao.id, mestreChar?.id);
                    await interaction.channel.send({ content: `🏆 **Contrato "${missao.nome}" Concluído!**` });
                    return atualizarInterface(interaction);
                }

                if (i.customId === "ms_add_player") {
                    const userMenu = new UserSelectMenuBuilder()
                        .setCustomId("sel_add")
                        .setPlaceholder("Selecione o jogador...");
                    const row = new ActionRowBuilder().addComponents(userMenu);
                    const prompt = await i.reply({
                        content: "👥 Escolha quem adicionar:",
                        components: [row],
                        flags: MessageFlags.Ephemeral,
                        fetchReply: true
                    });

                    const sel = await prompt.awaitMessageComponent({ time: 30000 }).catch(() => null);
                    if (sel) {
                        await sel.deferUpdate();
                        const targetChar = await getPersonagemAtivo(sel.values[0]);
                        if (targetChar) {
                            await ContratoService.adicionarJogadorManual(missao.id, targetChar.id);
                            await i.editReply({ content: `✅ ${targetChar.nome} adicionado!`, components: [] });
                            return atualizarInterface(interaction);
                        }
                    }
                }

                if (i.customId === "ms_gerenciar") {
                    const selecionados = missao.inscricoes.filter(insc => insc.selecionado);
                    if (selecionados.length === 0)
                        return i.reply({ content: "Equipe vazia.", flags: MessageFlags.Ephemeral });

                    const menu = new StringSelectMenuBuilder().setCustomId("sel_rem").setPlaceholder("Quem remover?");
                    selecionados.forEach(s =>
                        menu.addOptions(
                            new StringSelectMenuOptionBuilder().setLabel(s.personagem.nome).setValue(String(s.id))
                        )
                    );

                    const row = new ActionRowBuilder().addComponents(menu);
                    const prompt = await i.reply({
                        content: "❌ Selecione quem sai (o próximo da fila entrará):",
                        components: [row],
                        flags: MessageFlags.Ephemeral,
                        fetchReply: true
                    });

                    const sel = await prompt.awaitMessageComponent({ time: 30000 }).catch(() => null);
                    if (sel) {
                        await sel.deferUpdate();
                        await ContratoService.removerJogadorComPromocao(missao.id, parseInt(sel.values[0]));
                        await i.editReply({ content: "✅ Jogador removido e fila atualizada.", components: [] });
                        return atualizarInterface(interaction);
                    }
                }

                if (i.customId === "ms_vagas") {
                    const modal = new ModalBuilder()
                        .setCustomId("mod_vagas")
                        .setTitle("Vagas")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("v")
                                    .setLabel("Total")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(String(missao.vagas))
                            )
                        );
                    await i.showModal(modal);
                    const sub = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
                    if (sub) {
                        await sub.deferUpdate();
                        await ContratoRepository.atualizarVagas(missao.id, parseInt(sub.fields.getTextInputValue("v")));
                        return atualizarInterface(interaction);
                    }
                }
            } catch (err) {
                console.error(err);
                if (!i.replied) await i.reply({ content: "❌ Erro na operação.", flags: MessageFlags.Ephemeral });
            }
        });
    }
};
