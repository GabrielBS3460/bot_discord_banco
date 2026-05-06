const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const CATALOGO_CONSTRUCOES = require("../../data/construcoesData.js");
const CATALOGO_TROPAS = require("../../data/unidadesMilitaresData.js");
const DominioService = require("../../services/DominioService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dominio")
        .setDescription("Gerencia o seu domínio e terras.")
        .addSubcommand(sub =>
            sub
                .setName("fundar")
                .setDescription(`Funda um novo domínio de nível 1. Custo: T$ 5.000`)
                .addStringOption(opt => opt.setName("nome").setDescription("O nome das suas terras").setRequired(true))
                .addStringOption(opt =>
                    opt
                        .setName("terreno")
                        .setDescription("O tipo de terreno principal")
                        .setRequired(true)
                        .addChoices(
                            { name: "Planície", value: "Planície" },
                            { name: "Floresta", value: "Floresta" },
                            { name: "Montanha", value: "Montanha" },
                            { name: "Colinas", value: "Colinas" },
                            { name: "Pântano", value: "Pântano" },
                            { name: "Deserto", value: "Deserto" },
                            { name: "Subterrâneo", value: "Subterrâneo" },
                            { name: "Rio ou Mar", value: "Rio ou Mar" },
                            { name: "Elemento Místico", value: "Elemento Místico" }
                        )
                )
                .addBooleanOption(opt =>
                    opt
                        .setName("mistico")
                        .setDescription("É um domínio místico? (Apenas para conjuradores)")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("painel").setDescription("Abre o painel de controle interativo do seu domínio.")
        ),

    async execute({ interaction, getPersonagemAtivo }) {
        const subcomando = interaction.options.getSubcommand();
        const char = await getPersonagemAtivo(interaction.user.id);

        if (!char) {
            return interaction.reply({
                content: "🚫 Você não tem um personagem ativo.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcomando === "fundar") {
            const nome = interaction.options.getString("nome");
            const terreno = interaction.options.getString("terreno");
            const mistico = interaction.options.getBoolean("mistico");

            const modalId = `mod_fundar_${interaction.id}`;
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle("Fundar Domínio - Teste de Nobreza")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_bonus")
                            .setLabel("Seu bônus de Nobreza (Ficha + Itens)")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder("Ex: 15")
                            .setRequired(true)
                    )
                );

            await interaction.showModal(modal);

            try {
                const mSubmit = await interaction.awaitModalSubmit({
                    filter: m => m.customId === modalId,
                    time: 60000
                });
                await mSubmit.deferReply();

                const bonus = parseInt(mSubmit.fields.getTextInputValue("inp_bonus")) || 0;
                const novoDominio = await DominioService.fundarDominio(char, nome, terreno, mistico, bonus);

                const embed = new EmbedBuilder()
                    .setColor(mistico ? "#9B59B6" : "#2ECC71")
                    .setTitle("🏰 Novo Domínio Fundado!")
                    .setDescription(`**${char.nome}** reivindicou terras virgens com sucesso!`)
                    .addFields(
                        { name: "Nome", value: nome, inline: true },
                        { name: "Terreno", value: terreno, inline: true },
                        { name: "Tipo", value: mistico ? "Místico ✨" : "Padrão 🛡️", inline: true }
                    );

                return mSubmit.editReply({ embeds: [embed] });
            } catch (err) {
                if (err.message && err.message.startsWith("FALHA_TESTE_FUNDACAO")) {
                    return interaction.followUp({ content: `❌ **Falha no Teste:** Você não conseguiu estabelecer autoridade sobre as terras. (Perdeu T$ 5.000)` });
                }
                return interaction.followUp({ content: `❌ Erro: ${err.message || err}`, flags: MessageFlags.Ephemeral });
            }
        } else if (subcomando === "painel") {
            await interaction.deferReply();

            let { dominio, relatorioTurno } = await DominioService.buscarPainel(char.id);

            if (relatorioTurno) {
                const alertaEmbed = new EmbedBuilder()
                    .setColor("#E67E22")
                    .setTitle("🗞️ Relatório do Reino")
                    .setDescription(relatorioTurno);

                await interaction.channel.send({
                    content: `<@${interaction.user.id}>, mensageiros chegaram das suas terras!`,
                    embeds: [alertaEmbed]
                });
            }

            if (!dominio) {
                return interaction.editReply({
                    content: "🚫 Você ainda não é um regente. Use `/dominio fundar` para reivindicar suas terras."
                });
            }

            const renderizarPainel = () => {
                const maxConstrucoes = (dominio.nivel || 1) * 3;
                const qtdConstrucoes = (dominio.construcoes || []).length;
                const qtdTropas = (dominio.tropas || []).reduce((acc, tropa) => acc + tropa.quantidade, 0);

                const embed = new EmbedBuilder()
                    .setColor(dominio.mistico ? "#9B59B6" : "#F1C40F")
                    .setTitle(`🏰 Domínio: ${dominio.nome}`)
                    .setDescription(`*Regido por ${char.nome}*`)
                    .addFields(
                        { name: "📊 Geral", value: `**Nível:** ${dominio.nivel}\n**Terreno:** ${dominio.terreno}\n**Tipo:** ${dominio.mistico ? "Místico ✨" : "Padrão 🛡️"}`, inline: true },
                        { name: "👑 Status Público", value: `**Corte:** ${dominio.corte}\n**Popularidade:** ${dominio.popularidade}`, inline: true },
                        { name: "💰 Economia", value: `**Tesouro:** ${dominio.tesouro_lo} LO\n**Imposto:** ${dominio.imposto_atual}`, inline: false },
                        { name: "⚙️ Administração", value: `**Ações:** ${dominio.acoes_disponiveis} / ${dominio.corte === "Rica" ? 3 : 2}`, inline: true },
                        { name: "🏗️ Infra & Guerra", value: `**Prédios:** ${qtdConstrucoes}/${maxConstrucoes}\n**Tropas:** ${qtdTropas}`, inline: true }
                    )
                    .setFooter({ text: "Utilize os botões abaixo para gerenciar seu território." });

                const botoesRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`dom_btn_acoes_${interaction.id}`).setLabel("Ações").setStyle(ButtonStyle.Primary).setEmoji("📜"),
                    new ButtonBuilder().setCustomId(`dom_btn_construir_${interaction.id}`).setLabel("Construir").setStyle(ButtonStyle.Success).setEmoji("🏗️"),
                    new ButtonBuilder().setCustomId(`dom_btn_exercito_${interaction.id}`).setLabel("Exército").setStyle(ButtonStyle.Danger).setEmoji("⚔️"),
                    new ButtonBuilder().setCustomId(`dom_btn_bonus_${interaction.id}`).setLabel("Bônus").setStyle(ButtonStyle.Secondary).setEmoji("✨")
                );

                return { embeds: [embed], components: [botoesRow] };
            };

            const msgPainel = await interaction.editReply({ ...renderizarPainel(), fetchReply: true });

            const collector = msgPainel.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000
            });

            collector.on("collect", async iBtn => {
                if (iBtn.customId.startsWith("dom_btn_bonus_")) {
                    const bonusEmbed = new EmbedBuilder()
                        .setColor("#3498DB")
                        .setTitle(`✨ Benefícios: ${dominio.nome}`)
                        .setDescription("Bônus passivos concedidos pela sua estrutura atual.");

                    if (dominio.mistico) {
                        bonusEmbed.addFields({ name: "🔮 Fluxo Místico", value: `Recebe **+${dominio.nivel * dominio.nivel} PM** máximos.`, inline: false });
                    }

                    let listaConstrucoes = (dominio.construcoes || []).length > 0 
                        ? dominio.construcoes.map(c => `**${c.nome}:** ${c.beneficio}`).join("\n")
                        : "*Nenhuma construção.*";
                    bonusEmbed.addFields({ name: "🏗️ Construções", value: listaConstrucoes, inline: false });

                    const voltarRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_voltar_${interaction.id}`).setLabel("Voltar").setStyle(ButtonStyle.Secondary)
                    );

                    await iBtn.update({ embeds: [bonusEmbed], components: [voltarRow] });
                } else if (iBtn.customId.startsWith("dom_btn_acoes_")) {
                    const menuAcoes = new StringSelectMenuBuilder()
                        .setCustomId(`dom_menu_acoes_${interaction.id}`)
                        .setPlaceholder("Selecione uma Ação de Domínio")
                        .addOptions(
                            { label: "👑 Governar", description: "Subir Nível | Req: Nobreza", value: "Governar", emoji: "👑" },
                            { label: "🎭 Festival", description: "Pop +1 | Custa 1 LO | Req: Atuação", value: "Festival", emoji: "🎭" },
                            { label: "🗡️ Extorquir", description: "Ganha LO | Pop -1 | Req: Intimidação", value: "Extorquir", emoji: "🗡️" },
                            { label: "🏰 Aumentar Corte", description: "Sobe Corte | Custa 1 LO | Req: Nobreza", value: "Aumentar_Corte", emoji: "🏰" },
                            { label: "🌾 Convocar Camponeses", description: "1d6 Tropas | Pop -1 | Req: Nenhuma", value: "Convocar_Camponeses", emoji: "🌾" },
                            { label: "📢 Alterar Impostos", description: "Muda arrecadação e popularidade", value: "Alterar_Imposto", emoji: "📢" },
                            { label: "💰 Finanças (Comprar LO)", value: "Financas_Compra", emoji: "💰" },
                            { label: "🪙 Finanças (Sacar LO)", value: "Financas_Venda", emoji: "🪙" }
                        );

                    await iBtn.update({ content: "**Menu de Ações**", components: [new ActionRowBuilder().addComponents(menuAcoes)] });
                } else if (iBtn.isStringSelectMenu() && iBtn.customId.startsWith("dom_menu_acoes_")) {
                    const acao = iBtn.values[0];

                    if (acao === "Alterar_Imposto") {
                        const menuImposto = new StringSelectMenuBuilder()
                            .setCustomId(`dom_menu_tax_${interaction.id}`)
                            .setPlaceholder("Escolha o novo nível de impostos")
                            .addOptions(
                                { label: "Baixo", description: "Menos LO, mas aumenta Popularidade", value: "Baixo", emoji: "📉" },
                                { label: "Médio", description: "Equilíbrio padrão", value: "Médio", emoji: "📊" },
                                { label: "Alto", description: "Mais LO, mas diminui Popularidade", value: "Alto", emoji: "📈" }
                            );
                        return iBtn.update({ content: "**📢 Novo Decreto Tributário**", components: [new ActionRowBuilder().addComponents(menuImposto)] });
                    }

                    const pericia = acao === "Festival" ? "Atuação" : acao === "Extorquir" ? "Intimidação" : "Nobreza";
                    
                    if (acao === "Convocar_Camponeses") {
                        await iBtn.deferUpdate();
                        try {
                            const { log, dominio: domNovo } = await DominioService.executarAcaoRegente(dominio.id, acao);
                            dominio = domNovo;
                            await iBtn.followUp({ content: `✅ ${log}` });
                            return msgPainel.edit(renderizarPainel());
                        } catch (err) {
                            if (err.dominio) dominio = err.dominio;
                            await iBtn.followUp({ content: `❌ Falha: ${err.message || err}`, flags: MessageFlags.Ephemeral });
                            return msgPainel.edit(renderizarPainel());
                        }
                    }

                    const modalId = `mod_acao_${iBtn.id}`;
                    const modal = new ModalBuilder().setCustomId(modalId).setTitle(`Ação: ${acao}`);
                    
                    const rowBonus = new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_bonus")
                            .setLabel(`Seu bônus de ${pericia}`)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    );
                    modal.addComponents(rowBonus);

                    if (acao.startsWith("Financas")) {
                        modal.addComponents(new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("inp_qtd").setLabel("Quantidade de LO").setStyle(TextInputStyle.Short).setRequired(true)
                        ));
                    }

                    await iBtn.showModal(modal);

                    try {
                        const mSubmit = await iBtn.awaitModalSubmit({ filter: m => m.customId === modalId, time: 60000 });
                        await mSubmit.deferUpdate();

                        const bonus = parseInt(mSubmit.fields.getTextInputValue("inp_bonus")) || 0;
                        const qtd = acao.startsWith("Financas") ? parseInt(mSubmit.fields.getTextInputValue("inp_qtd")) : 0;

                        const { log, dominio: domNovo } = await DominioService.executarAcaoRegente(dominio.id, acao, { bonusManual: bonus, qtd: qtd });
                        dominio = domNovo;
                        await mSubmit.followUp({ content: `✅ ${log}` });
                        await msgPainel.edit(renderizarPainel());
                    } catch (err) {
                        if (err.dominio) dominio = err.dominio;
                        await iBtn.followUp({ content: `❌ Falha: ${err.message || err}`, flags: MessageFlags.Ephemeral });
                        await msgPainel.edit(renderizarPainel());
                    }
                } else if (iBtn.customId.startsWith("dom_btn_construir_")) {
                    const menuCat = new StringSelectMenuBuilder()
                        .setCustomId(`dom_menu_cat_${interaction.id}`)
                        .setPlaceholder("Setor da Obra...")
                        .addOptions(
                            { label: "Nobreza (Básicas)", value: "Nobreza_1" },
                            { label: "Nobreza (Avançadas)", value: "Nobreza_2" },
                            { label: "Guerra", value: "Guerra" },
                            { label: "Enganação", value: "Enganação" },
                            { label: "Religião", value: "Religião" },
                            { label: "Misticismo", value: "Misticismo" }
                        );
                    await iBtn.update({ content: "**Escolha a Categoria**", components: [new ActionRowBuilder().addComponents(menuCat)] });
                } else if (iBtn.isStringSelectMenu() && iBtn.customId.startsWith("dom_menu_cat_")) {
                    const catRaw = iBtn.values[0];
                    let cat = catRaw;
                    let obras = [];

                    if (catRaw === "Nobreza_1") {
                        cat = "Nobreza";
                        obras = Object.keys(CATALOGO_CONSTRUCOES)
                            .filter(n => CATALOGO_CONSTRUCOES[n].tipo === "Nobreza")
                            .slice(0, 20);
                    } else if (catRaw === "Nobreza_2") {
                        cat = "Nobreza";
                        obras = Object.keys(CATALOGO_CONSTRUCOES)
                            .filter(n => CATALOGO_CONSTRUCOES[n].tipo === "Nobreza")
                            .slice(20);
                    } else {
                        obras = Object.keys(CATALOGO_CONSTRUCOES).filter(n => CATALOGO_CONSTRUCOES[n].tipo === cat);
                    }
                    
                    const menuObras = new StringSelectMenuBuilder()
                        .setCustomId(`dom_menu_obra_${interaction.id}`)
                        .setPlaceholder(`Obras de ${catRaw.replace("_", " ")}...`)
                        .addOptions(obras.map(n => ({ label: `${n} (${CATALOGO_CONSTRUCOES[n].custo} LO)`, value: n })));

                    await iBtn.update({ content: `**Projetos de ${catRaw.replace("_", " ")}**`, components: [new ActionRowBuilder().addComponents(menuObras)] });
                } else if (iBtn.isStringSelectMenu() && iBtn.customId.startsWith("dom_menu_tax_")) {
                    const tipo = iBtn.values[0];
                    await iBtn.deferUpdate();
                    try {
                        const { log, dominio: domNovo } = await DominioService.executarAcaoRegente(dominio.id, "Alterar_Imposto", { tipo: tipo });
                        dominio = domNovo;
                        await iBtn.followUp({ content: `✅ ${log}` });
                        await msgPainel.edit(renderizarPainel());
                    } catch (err) {
                        await iBtn.followUp({ content: `❌ Falha: ${err.message || err}`, flags: MessageFlags.Ephemeral });
                    }
                } else if (iBtn.isStringSelectMenu() && iBtn.customId.startsWith("dom_menu_obra_")) {
                    const nomeObra = iBtn.values[0];
                    const obra = CATALOGO_CONSTRUCOES[nomeObra];

                    const modalId = `mod_obra_${iBtn.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle(`Construir: ${nomeObra}`)
                        .addComponents(new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("inp_bonus").setLabel(`Bônus de ${obra.tipo}`).setStyle(TextInputStyle.Short).setRequired(true)
                        ));

                    await iBtn.showModal(modal);

                    try {
                        const mSubmit = await iBtn.awaitModalSubmit({ filter: m => m.customId === modalId, time: 60000 });
                        await mSubmit.deferUpdate();
                        const bonus = parseInt(mSubmit.fields.getTextInputValue("inp_bonus")) || 0;

                        const { log, dominio: domNovo } = await DominioService.construir(dominio.id, char.id, nomeObra, bonus);
                        dominio = domNovo;
                        await mSubmit.followUp({ content: `✅ ${log}` });
                        await msgPainel.edit(renderizarPainel());
                    } catch (err) {
                        if (err.dominio) dominio = err.dominio;
                        await iBtn.followUp({ content: `❌ Falha: ${err.message || err}`, flags: MessageFlags.Ephemeral });
                        await msgPainel.edit(renderizarPainel());
                    }
                } else if (iBtn.customId.startsWith("dom_btn_voltar_")) {
                    await iBtn.update(renderizarPainel());
                } else if (iBtn.customId.startsWith("dom_btn_exercito_")) {
                    const exercitoEmbed = new EmbedBuilder()
                        .setColor("#E74C3C")
                        .setTitle(`⚔️ Forças Armadas: ${dominio.nome}`)
                        .setDescription("Visão geral das suas unidades militares.");
                    
                    let listaTropas = (dominio.tropas || []).length > 0 
                        ? dominio.tropas.map(t => `**${t.quantidade}x ${t.nome}**`).join("\n")
                        : "*Nenhuma tropa recrutada.*";
                    exercitoEmbed.addFields({ name: "Unidades", value: listaTropas, inline: false });

                    const voltarRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_voltar_${interaction.id}`).setLabel("Voltar").setStyle(ButtonStyle.Secondary)
                    );
                    await iBtn.update({ embeds: [exercitoEmbed], components: [voltarRow] });
                }
            });
        }
    }
};
