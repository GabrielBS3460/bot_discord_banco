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
    MessageFlags
} = require("discord.js");

const {
    CUSTO_NIVEL,
    LISTA_CLASSES_1,
    LISTA_CLASSES_2,
    PERICIAS_LISTA_1,
    PERICIAS_LISTA_2
} = require("../../data/fichaData.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");
const PersonagemService = require("../../services/PersonagemService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ficha")
        .setDescription("Exibe e permite editar a ficha do seu personagem ativo."),

    async execute({ interaction, getPersonagemAtivo }) {
        try {
            const ativo = await getPersonagemAtivo(interaction.user.id);

            if (!ativo) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            let char = await PersonagemRepository.obterFichaCompleta(ativo.id);

            const montarEmbedFicha = p => {
                const { nivelReal, patamar } = PersonagemService.calcularDadosBase(p);
                const calcCD = mod => 10 + mod + Math.floor(nivelReal / 2);

                const txtVida =
                    p.vida_temp > 0
                        ? `${p.vida_atual}/${p.vida_max} (+${p.vida_temp})`
                        : `${p.vida_atual}/${p.vida_max}`;
                const txtMana =
                    p.mana_temp > 0
                        ? `${p.mana_atual}/${p.mana_max} (+${p.mana_temp})`
                        : `${p.mana_atual}/${p.mana_max}`;
                const obsTexto = p.observacoes || "Nenhuma observação registrada.";

                const somaClasses = p.classes.reduce((acc, c) => acc + c.nivel, 0);
                const niveisPendentes = nivelReal - somaClasses;
                const avisoClasse = niveisPendentes > 0 ? `\n⚠️ **Níveis pendentes:** ${niveisPendentes}` : "";
                const textoClasses =
                    p.classes.length > 0
                        ? p.classes.map(c => `${c.nome_classe} ${c.nivel}`).join(" / ")
                        : "Sem Classe Definida";
                const listaPericias =
                    Array.isArray(p.pericias) && p.pericias.length ? p.pericias.join(", ") : "Nenhuma";
                const custoProx = CUSTO_NIVEL[nivelReal] || "Max";
                const barraProgresso = `${p.pontos_missao}/${custoProx}`;

                const embed = new EmbedBuilder()
                    .setColor("#2B2D31")
                    .setTitle(`Ficha de ${p.nome}`)
                    .setDescription(
                        `**${textoClasses}**${avisoClasse}\nNível de Personagem: **${nivelReal}** (Patamar ${patamar})`
                    )
                    .addFields(
                        { name: "❤️ Vida", value: txtVida, inline: true },
                        { name: "⭐ Mana", value: txtMana, inline: true },
                        { name: "📈 Progresso", value: `Pontos: **${barraProgresso}**`, inline: true },
                        { name: "🛠️ Forja", value: `${p.pontos_forja_atual.toFixed(1)} pts`, inline: true },
                        { name: "🏃 Deslocamento", value: `${p.deslocamento}m`, inline: true },
                        { name: "\u200B", value: "**Atributos**" },
                        {
                            name: "Físicos",
                            value: `**FOR:** ${p.forca >= 0 ? "+" : ""}${p.forca} (CD ${calcCD(p.forca)})\n**DES:** ${p.destreza >= 0 ? "+" : ""}${p.destreza} (CD ${calcCD(p.destreza)})\n**CON:** ${p.constituicao >= 0 ? "+" : ""}${p.constituicao} (CD ${calcCD(p.constituicao)})`,
                            inline: true
                        },
                        {
                            name: "Mentais",
                            value: `**INT:** ${p.inteligencia >= 0 ? "+" : ""}${p.inteligencia} (CD ${calcCD(p.inteligencia)})\n**SAB:** ${p.sabedoria >= 0 ? "+" : ""}${p.sabedoria} (CD ${calcCD(p.sabedoria)})\n**CAR:** ${p.carisma >= 0 ? "+" : ""}${p.carisma} (CD ${calcCD(p.carisma)})`,
                            inline: true
                        },
                        { name: "🎭 Perícias Treinadas", value: listaPericias },
                        { name: "📝 Observações", value: obsTexto }
                    );

                if (p.banner_url) embed.setImage(p.banner_url);
                else embed.setThumbnail(interaction.user.displayAvatarURL());

                return embed;
            };

            const botoes1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("edit_classes")
                    .setLabel("Classes")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("📚"),
                new ButtonBuilder()
                    .setCustomId("btn_descanso")
                    .setLabel("Descansar")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("💤"),
                new ButtonBuilder()
                    .setCustomId("edit_status")
                    .setLabel("Status")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("❤️"),
                new ButtonBuilder()
                    .setCustomId("edit_pericias")
                    .setLabel("Perícias")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🎭")
            );

            const botoes2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("edit_fisico")
                    .setLabel("Físicos")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("💪"),
                new ButtonBuilder()
                    .setCustomId("edit_mental")
                    .setLabel("Mentais")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🧠"),
                new ButtonBuilder()
                    .setCustomId("edit_deslocamento")
                    .setLabel("Deslocamento")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🏃"),
                new ButtonBuilder()
                    .setCustomId("edit_obs")
                    .setLabel("Obs")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("📝")
            );

            const msg = await interaction.reply({
                embeds: [montarEmbedFicha(char)],
                components: [botoes1, botoes2],
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 600000
            });

            collector.on("collect", async iBtn => {
                const uniqueID = `_${msg.id}`;

                if (iBtn.customId === "btn_descanso") {
                    if (!PersonagemService.verificarPodeDescansar(char)) {
                        return iBtn.reply({
                            content: `🚫 **${char.nome}** já descansou hoje!`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const { nivelReal } = PersonagemService.calcularDadosBase(char);
                    const botoesDescanso = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("desc_ruim").setLabel("Ruim").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("desc_normal").setLabel("Normal").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId("desc_conf")
                            .setLabel("Confortável")
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId("desc_lux").setLabel("Luxuoso").setStyle(ButtonStyle.Success)
                    );

                    const response = await iBtn.reply({
                        content: `🛏️ **Modo de Descanso**\nNível: ${nivelReal}\nEscolha:`,
                        components: [botoesDescanso],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const descCollector = response.resource.message.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });

                    descCollector.on("collect", async iDesc => {
                        const modal = new ModalBuilder()
                            .setCustomId(`modal_descanso_${uniqueID}`)
                            .setTitle("Descanso")
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("inp_bonus_vida")
                                        .setLabel("Bônus Vida")
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(false)
                                ),
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("inp_bonus_mana")
                                        .setLabel("Bônus Mana")
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(false)
                                )
                            );

                        await iDesc.showModal(modal);

                        try {
                            const modalSubmit = await iDesc.awaitModalSubmit({
                                filter: i => i.customId === `modal_descanso_${uniqueID}`,
                                time: 60000
                            });
                            await modalSubmit.deferUpdate();

                            const bonusV = parseInt(modalSubmit.fields.getTextInputValue("inp_bonus_vida")) || 0;
                            const bonusM = parseInt(modalSubmit.fields.getTextInputValue("inp_bonus_mana")) || 0;

                            const resultado = await PersonagemService.processarDescanso(
                                char,
                                iDesc.customId,
                                bonusV,
                                bonusM
                            );
                            char = resultado.charAtualizado;

                            await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                            await modalSubmit.followUp({
                                content: `✅ Descanso!\n+${resultado.curouVida} Vida | +${resultado.curouMana} Mana`,
                                flags: MessageFlags.Ephemeral
                            });
                            // eslint-disable-next-line no-unused-vars
                        } catch (err) {
                            /* ignora */
                        }
                    });
                    return;
                }

                if (iBtn.customId === "edit_status") {
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_status${uniqueID}`)
                        .setTitle("Editar Status")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_vida")
                                    .setLabel("Vida Atual / Máx")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${char.vida_atual}/${char.vida_max}`)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_vida_temp")
                                    .setLabel("Vida Temp")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(String(char.vida_temp || 0))
                                    .setRequired(false)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_mana")
                                    .setLabel("Mana Atual / Máx")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${char.mana_atual}/${char.mana_max}`)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_mana_temp")
                                    .setLabel("Mana Temp")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(String(char.mana_temp || 0))
                                    .setRequired(false)
                            )
                        );

                    await iBtn.showModal(modal);

                    try {
                        const modalSubmit = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === `modal_status${uniqueID}`,
                            time: 60000
                        });
                        await modalSubmit.deferUpdate();

                        const [vidaAtual, vidaMax] = modalSubmit.fields
                            .getTextInputValue("inp_vida")
                            .split("/")
                            .map(v => parseInt(v.trim()));
                        const [manaAtual, manaMax] = modalSubmit.fields
                            .getTextInputValue("inp_mana")
                            .split("/")
                            .map(v => parseInt(v.trim()));

                        if (isNaN(vidaAtual) || isNaN(vidaMax) || isNaN(manaAtual) || isNaN(manaMax)) {
                            return modalSubmit.followUp({
                                content: "Formato inválido. Use 12/20",
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        char = await PersonagemRepository.atualizar(char.id, {
                            vida_atual: vidaAtual,
                            vida_max: vidaMax,
                            vida_temp: parseInt(modalSubmit.fields.getTextInputValue("inp_vida_temp")) || 0,
                            mana_atual: manaAtual,
                            mana_max: manaMax,
                            mana_temp: parseInt(modalSubmit.fields.getTextInputValue("inp_mana_temp")) || 0
                        });

                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                        // eslint-disable-next-line no-unused-vars
                    } catch (err) {
                        /* ignora */
                    }
                    return;
                }

                if (iBtn.customId === "edit_classes") {
                    const m1 = new StringSelectMenuBuilder()
                        .setCustomId("m_c1")
                        .setPlaceholder("A-G")
                        .addOptions(LISTA_CLASSES_1.map(c => ({ label: c, value: c })));
                    const m2 = new StringSelectMenuBuilder()
                        .setCustomId("m_c2")
                        .setPlaceholder("I-V")
                        .addOptions(LISTA_CLASSES_2.map(c => ({ label: c, value: c })));
                    const response = await iBtn.reply({
                        content: `Selecione a classe:`,
                        components: [
                            new ActionRowBuilder().addComponents(m1),
                            new ActionRowBuilder().addComponents(m2)
                        ],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const menuColl = response.resource.message.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });
                    menuColl.on("collect", async iMenu => {
                        const classeSelec = iMenu.values[0];
                        const modal = new ModalBuilder()
                            .setCustomId(`mod_class_${uniqueID}`)
                            .setTitle(`Nível de ${classeSelec}`)
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("inp_nvl")
                                        .setLabel("Novo nível (0 remove)")
                                        .setStyle(TextInputStyle.Short)
                                )
                            );

                        await iMenu.showModal(modal);

                        try {
                            const sub = await iMenu.awaitModalSubmit({
                                filter: i => i.customId === `mod_class_${uniqueID}`,
                                time: 60000
                            });
                            await sub.deferUpdate();
                            const novoNvl = parseInt(sub.fields.getTextInputValue("inp_nvl"));

                            if (novoNvl <= 0) {
                                await PersonagemRepository.removerClasse(char.id, classeSelec);
                            } else {
                                await PersonagemRepository.upsertClasse(char.id, classeSelec, novoNvl);
                            }

                            char = await PersonagemRepository.obterFichaCompleta(char.id);
                            await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                            await sub.followUp({ content: "✅ Classes atualizadas.", flags: MessageFlags.Ephemeral });
                            // eslint-disable-next-line no-unused-vars
                        } catch (err) {
                            /* ignora */
                        }
                    });
                    return;
                }

                if (iBtn.customId === "edit_pericias") {
                    const menu1 = new StringSelectMenuBuilder()
                        .setCustomId("menu_pericia_1")
                        .setPlaceholder("Perícias (A - M)")
                        .addOptions(PERICIAS_LISTA_1.map(p => ({ label: p, value: p })));

                    const menu2 = new StringSelectMenuBuilder()
                        .setCustomId("menu_pericia_2")
                        .setPlaceholder("Perícias (N - Z)")
                        .addOptions(PERICIAS_LISTA_2.map(p => ({ label: p, value: p })));

                    const r1 = new ActionRowBuilder().addComponents(menu1);
                    const r2 = new ActionRowBuilder().addComponents(menu2);
                    const r3 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("btn_limpar_pericias")
                            .setLabel("Limpar Todas")
                            .setStyle(ButtonStyle.Danger)
                    );

                    const response = await iBtn.reply({
                        content: `Selecione para adicionar/remover perícias.\nAtuais: ${(char.pericias || []).join(", ") || "Nenhuma"}`,
                        components: [r1, r2, r3],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });

                    const periciaCollector = response.resource.message.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000
                    });

                    periciaCollector.on("collect", async iPericia => {
                        await iPericia.deferUpdate();

                        let novasPericias = [...(char.pericias || [])];

                        if (iPericia.customId === "btn_limpar_pericias") {
                            novasPericias = [];
                            char = await PersonagemRepository.atualizar(char.id, { pericias: novasPericias });
                            await iPericia.followUp({
                                content: "🗑️ Todas as perícias removidas.",
                                flags: MessageFlags.Ephemeral
                            });
                        } else {
                            const selecionada = iPericia.values[0];
                            if (!novasPericias.includes(selecionada)) {
                                novasPericias.push(selecionada);
                                novasPericias.sort();
                                await iPericia.followUp({
                                    content: `✅ ${selecionada} adicionada.`,
                                    flags: MessageFlags.Ephemeral
                                });
                            } else {
                                novasPericias = novasPericias.filter(p => p !== selecionada);
                                await iPericia.followUp({
                                    content: `❌ ${selecionada} removida.`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                            char = await PersonagemRepository.atualizar(char.id, { pericias: novasPericias });
                        }

                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                    });
                    return;
                }

                if (["edit_fisico", "edit_mental", "edit_deslocamento", "edit_obs"].includes(iBtn.customId)) {
                    let componentes = [];
                    if (iBtn.customId === "edit_fisico")
                        componentes = [
                            ["inp_for", "Força", char.forca],
                            ["inp_des", "Destreza", char.destreza],
                            ["inp_con", "Constituição", char.constituicao]
                        ];
                    else if (iBtn.customId === "edit_mental")
                        componentes = [
                            ["inp_int", "Inteligência", char.inteligencia],
                            ["inp_sab", "Sabedoria", char.sabedoria],
                            ["inp_car", "Carisma", char.carisma]
                        ];
                    else if (iBtn.customId === "edit_deslocamento")
                        componentes = [["inp_desl", "Deslocamento", char.deslocamento]];
                    else componentes = [["inp_obs", "Anotações", char.observacoes, TextInputStyle.Paragraph]];

                    const modal = new ModalBuilder().setCustomId(`mod_generic_${uniqueID}`).setTitle("Editar");
                    componentes.forEach(([id, label, value, style = TextInputStyle.Short]) => {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId(id)
                                    .setLabel(label)
                                    .setValue(String(value || ""))
                                    .setStyle(style)
                                    .setRequired(false)
                            )
                        );
                    });

                    await iBtn.showModal(modal);

                    try {
                        const sub = await iBtn.awaitModalSubmit({
                            filter: i => i.customId === `mod_generic_${uniqueID}`,
                            time: 60000
                        });
                        await sub.deferUpdate();

                        let payload = {};
                        if (iBtn.customId === "edit_fisico")
                            payload = {
                                forca: parseInt(sub.fields.getTextInputValue("inp_for")) || 0,
                                destreza: parseInt(sub.fields.getTextInputValue("inp_des")) || 0,
                                constituicao: parseInt(sub.fields.getTextInputValue("inp_con")) || 0
                            };
                        else if (iBtn.customId === "edit_mental")
                            payload = {
                                inteligencia: parseInt(sub.fields.getTextInputValue("inp_int")) || 0,
                                sabedoria: parseInt(sub.fields.getTextInputValue("inp_sab")) || 0,
                                carisma: parseInt(sub.fields.getTextInputValue("inp_car")) || 0
                            };
                        else if (iBtn.customId === "edit_deslocamento")
                            payload = { deslocamento: sub.fields.getTextInputValue("inp_desl").replace(",", ".") };
                        else payload = { observacoes: sub.fields.getTextInputValue("inp_obs") };

                        char = await PersonagemRepository.atualizar(char.id, payload);
                        await interaction.editReply({ embeds: [montarEmbedFicha(char)] });
                        // eslint-disable-next-line no-unused-vars
                    } catch (e) {
                        /* empty */
                    }
                }
            });
        } catch (err) {
            console.error("Erro no ficha:", err);
            const msg = { content: "❌ Ocorreu um erro ao carregar sua ficha.", flags: MessageFlags.Ephemeral };
            interaction.replied
                ? await interaction.followUp(msg).catch(() => {})
                : await interaction.reply(msg).catch(() => {});
        }
    }
};
