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
            sub
                .setName("painel")
                .setDescription("Abre o painel de controle interativo do seu domínio.")
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();
        const char = await getPersonagemAtivo(interaction.user.id);

        if (!char) {
            return interaction.reply({ content: "🚫 Você não tem um personagem ativo.", flags: MessageFlags.Ephemeral });
        }

        if (subcomando === "fundar") {
            await interaction.deferReply();

            const nome = interaction.options.getString("nome");
            const terreno = interaction.options.getString("terreno");
            const mistico = interaction.options.getBoolean("mistico");

            try {
                await DominioService.fundarDominio(char, nome, terreno, mistico);

                const embed = new EmbedBuilder()
                    .setColor(mistico ? "#9B59B6" : "#2ECC71")
                    .setTitle("🏰 Novo Domínio Fundado!")
                    .setDescription(`**${char.nome}** reivindicou terras virgens e estabeleceu um novo centro de poder.`)
                    .addFields(
                        { name: "Nome do Domínio", value: nome, inline: true },
                        { name: "Terreno", value: terreno, inline: true },
                        { name: "Tipo", value: mistico ? "Místico ✨" : "Padrão 🛡️", inline: true },
                        { name: "Nível Inicial", value: "1", inline: true },
                        { name: "Custo Pago", value: "T$ 5.000", inline: true }
                    )
                    .setFooter({ text: "Use /dominio painel para gerenciar suas terras." });

                return interaction.editReply({ embeds: [embed] });

            } catch (err) {
                console.error("Erro ao fundar domínio:", err);

                let msgErro = "❌ Ocorreu um erro ao fundar o domínio.";
                
                if (err.message === "SALDO_INSUFICIENTE") msgErro = "💸 Você precisa de **T$ 5.000** para fundar um domínio.";
                if (err.message === "JA_POSSUI_DOMINIO") msgErro = "🚫 Você já é regente de um domínio! Cada personagem só pode ter um.";
                if (err.message === "CLASSE_INVALIDA_MISTICO") msgErro = "🔮 Apenas Conjuradores (Arcanos ou Divinos) podem criar um Domínio Místico.";

                return interaction.editReply({ content: msgErro });
            }
        }

        else if (subcomando === "painel") {
            await interaction.deferReply();

            let dominio = await DominioService.buscarPainel(char.id);

            if (!dominio) {
                return interaction.editReply({ 
                    content: "🚫 Você ainda não é um regente. Use `/dominio fundar` para reivindicar suas terras." 
                });
            }

            const renderizarPainel = () => {
                const maxConstrucoes = dominio.nivel * 3;
                const qtdConstrucoes = dominio.construcoes.length;
                const qtdTropas = dominio.tropas.reduce((acc, tropa) => acc + tropa.quantidade, 0);

                const embed = new EmbedBuilder()
                    .setColor(dominio.mistico ? "#9B59B6" : "#F1C40F")
                    .setTitle(`🏰 Domínio: ${dominio.nome}`)
                    .setDescription(`*Regido por ${char.nome}*`)
                    .addFields(
                        { name: "📊 Geral", value: `**Nível:** ${dominio.nivel}\n**Terreno:** ${dominio.terreno}\n**Tipo:** ${dominio.mistico ? "Místico ✨" : "Padrão 🛡️"}`, inline: true },
                        { name: "👑 Status Público", value: `**Corte:** ${dominio.corte}\n**Popularidade:** ${dominio.popularidade}`, inline: true },
                        { name: "💰 Economia", value: `**Tesouro:** ${dominio.tesouro_lo} LO\n*(1 LO = T$ 1.000)*`, inline: false },
                        { name: "⚙️ Administração", value: `**Ações:** ${dominio.acoes_disponiveis} / ${dominio.corte === "Rica" ? 3 : 2}\n*(Reseta mês que vem)*`, inline: true },
                        { name: "🏗️ Infra & Guerra", value: `**Construções:** ${qtdConstrucoes}/${maxConstrucoes}\n**Unidades Militares:** ${qtdTropas}`, inline: true }
                    )
                    .setFooter({ text: "Utilize os botões abaixo para gerenciar seu território." })
                    .setTimestamp();

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
                        .setTitle(`✨ Bônus Ativos: ${dominio.nome}`)
                        .setDescription("Estes são os bônus passivos concedidos pela sua estrutura atual. Lembre-se de aplicá-los na sua ficha ou durante as sessões.");

                    if (dominio.mistico) {
                        const pmExtra = dominio.nivel * dominio.nivel;
                        bonusEmbed.addFields({ name: "🔮 Fluxo Místico", value: `Concede **+${pmExtra} PM** máximos adicionais ao regente (Nível²).`, inline: false });
                    }

                    if (dominio.construcoes.length === 0) {
                        bonusEmbed.addFields({ name: "🏗️ Construções", value: "*Nenhuma construção erguida ainda.*", inline: false });
                    } else {
                        let listaConstrucoes = "";
                        dominio.construcoes.forEach(c => {
                            listaConstrucoes += `**${c.nome}:** ${c.beneficio}\n`;
                        });
                        bonusEmbed.addFields({ name: "🏗️ Construções", value: listaConstrucoes, inline: false });
                    }

                    const voltarRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_voltar_${interaction.id}`).setLabel("Voltar ao Painel").setStyle(ButtonStyle.Secondary).setEmoji("🔙")
                    );

                    await iBtn.update({ embeds: [bonusEmbed], components: [voltarRow] });
                }

                else if (iBtn.customId.startsWith("dom_btn_acoes_")) {
                    if (dominio.acoes_disponiveis <= 0) {
                        return iBtn.reply({ content: "🚫 Você já usou todas as suas ações de domínio neste mês!", flags: MessageFlags.Ephemeral });
                    }

                    const menuAcoes = new StringSelectMenuBuilder()
                        .setCustomId(`dom_menu_acoes_${interaction.id}`)
                        .setPlaceholder("Selecione uma Ação de Domínio (Custa 1 Ação)")
                        .addOptions(
                            new StringSelectMenuOptionBuilder().setLabel("👑 Governar").setDescription(`Nível +1 | Custa: 5 LO x Prox. Nível | Req: Nobreza`).setValue("Governar").setEmoji("👑"),
                            new StringSelectMenuOptionBuilder().setLabel("💰 Finanças (Comprar LO)").setDescription("1.000 T$ = 1 LO | Req: Nobreza").setValue("Financas_Compra").setEmoji("💰"),
                            new StringSelectMenuOptionBuilder().setLabel("💰 Finanças (Vender LO)").setDescription("1 LO = 1.000 T$ | Req: Nobreza").setValue("Financas_Venda").setEmoji("🪙"),
                            new StringSelectMenuOptionBuilder().setLabel("🎭 Festival").setDescription("Popularidade +1 | Custa: 1 LO | Req: Atuação").setValue("Festival").setEmoji("🎭"),
                            new StringSelectMenuOptionBuilder().setLabel("🗡️ Extorquir").setDescription("Ganha 1d6+Nv LO | Pop -1 | Req: Intimidação").setValue("Extorquir").setEmoji("🗡️"),
                            new StringSelectMenuOptionBuilder().setLabel("🏰 Aumentar Corte").setDescription("Sobe Corte | Custa: 1 LO | Req: Nobreza").setValue("Aumentar_Corte").setEmoji("🏰"),
                            new StringSelectMenuOptionBuilder().setLabel("🌾 Convocar Camponeses").setDescription("Ganha 1d6 Tropas | Pop -1 | Custa: 1 LO | Req: Nenhuma").setValue("Convocar_Camponeses").setEmoji("🌾")
                        );

                    const voltarRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_voltar_${interaction.id}`).setLabel("Cancelar / Voltar").setStyle(ButtonStyle.Secondary)
                    );

                    await iBtn.update({ 
                        content: `**Ações Restantes:** ${dominio.acoes_disponiveis}\n*Nota: Se falhar nos requisitos ou não tiver LO suficiente, a ação será cancelada sem gastar seu turno.*`,
                        embeds: [], 
                        components: [new ActionRowBuilder().addComponents(menuAcoes), voltarRow] 
                    });
                }

                else if (iBtn.isStringSelectMenu() && iBtn.customId.startsWith("dom_menu_acoes_")) {
                    const acao = iBtn.values[0];
                    const pChar = char.pericias || []; 

                    if (["Governar", "Financas_Compra", "Financas_Venda", "Aumentar_Corte"].includes(acao) && !pChar.includes("Nobreza")) {
                        return iBtn.reply({ content: "🚫 **Falha:** Você precisa ser treinado em **Nobreza**.", flags: MessageFlags.Ephemeral });
                    }
                    if (acao === "Festival" && !pChar.includes("Atuação")) {
                        return iBtn.reply({ content: "🚫 **Falha:** Você precisa ser treinado em **Atuação**.", flags: MessageFlags.Ephemeral });
                    }
                    if (acao === "Extorquir" && !pChar.includes("Intimidação")) {
                        return iBtn.reply({ content: "🚫 **Falha:** Você precisa ser treinado em **Intimidação**.", flags: MessageFlags.Ephemeral });
                    }

                    if (acao === "Financas_Compra" || acao === "Financas_Venda") {
                        const ehCompra = acao === "Financas_Compra";
                        const modalId = `mod_financas_${iBtn.id}`;
                        const modal = new ModalBuilder()
                            .setCustomId(modalId)
                            .setTitle(ehCompra ? "Comprar LO" : "Sacar LO")
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("inp_qtd_lo")
                                        .setLabel(`Quantos LO deseja ${ehCompra ? "comprar" : "sacar"}?`)
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder(ehCompra ? "1 LO = 1000 T$" : "1 LO = 1000 T$")
                                        .setRequired(true)
                                )
                            );

                        await iBtn.showModal(modal);

                        try {
                            const mSubmit = await iBtn.awaitModalSubmit({ filter: m => m.customId === modalId && m.user.id === interaction.user.id, time: 60000 });
                            await mSubmit.deferUpdate();
                            const qtd = parseInt(mSubmit.fields.getTextInputValue("inp_qtd_lo"));

                            if (isNaN(qtd) || qtd <= 0) return mSubmit.followUp({ content: "🚫 Quantidade inválida.", flags: MessageFlags.Ephemeral });

                            try {
                                const log = await DominioService.executarAcaoRegente(dominio.id, acao, { qtd: qtd });
                                dominio = await DominioService.buscarPainel(char.id); 
                                await mSubmit.followUp({ content: `✅ ${log}` });
                                await msgPainel.edit(renderizarPainel());
                            } catch (err) {
                                mSubmit.followUp({ content: `❌ Erro: ${err.message}`, flags: MessageFlags.Ephemeral });
                            }
                        } catch (e) { /* ignora timeout do modal */ }
                        return;
                    }

                    await iBtn.deferUpdate();
                    try {
                        const log = await DominioService.executarAcaoRegente(dominio.id, acao);
                        dominio = await DominioService.buscarPainel(char.id); 
                        
                        await iBtn.followUp({ content: `✅ ${log}` });
                        await msgPainel.edit(renderizarPainel()); 
                    } catch (err) {
                        let msgErro = err.message;
                        if (msgErro.startsWith("LO_INSUFICIENTE")) msgErro = `Você não tem LO suficiente no Tesouro.`;
                        if (msgErro === "CORTE_MAXIMA") msgErro = `Sua Corte já atingiu o nível máximo (Rica).`;
                        
                        await iBtn.followUp({ content: `❌ **Ação Falhou:** ${msgErro}`, flags: MessageFlags.Ephemeral });
                    }
                }

                else if (iBtn.customId.startsWith("dom_btn_construir_")) {
                    const maxConstrucoes = dominio.nivel * 3;
                    if (dominio.construcoes.length >= maxConstrucoes) {
                        return iBtn.reply({ content: `🚫 Limite de prédios atingido! Eleve o Nível do Domínio para construir mais.`, flags: MessageFlags.Ephemeral });
                    }
                    if (dominio.acoes_disponiveis <= 0) {
                        return iBtn.reply({ content: "🚫 Você precisa de 1 Ação de Regente disponível para construir.", flags: MessageFlags.Ephemeral });
                    }

                    const menuCategorias = new StringSelectMenuBuilder()
                        .setCustomId(`dom_menu_cat_${interaction.id}`)
                        .setPlaceholder("Selecione o Setor da Obra...")
                        .addOptions(
                            new StringSelectMenuOptionBuilder().setLabel("Nobreza (A - M)").setDescription("Fazendas, Castelos... (Parte 1) [Req: Nobreza]").setValue("Nobreza_1").setEmoji("👑"),
                            new StringSelectMenuOptionBuilder().setLabel("Nobreza (N - Z)").setDescription("Oficinas, Torres... (Parte 2) [Req: Nobreza]").setValue("Nobreza_2").setEmoji("👑"),
                            new StringSelectMenuOptionBuilder().setLabel("Guerra").setDescription("Quartéis, Estrebarias... (Req: Guerra)").setValue("Guerra").setEmoji("⚔️"),
                            new StringSelectMenuOptionBuilder().setLabel("Enganação").setDescription("Tavernas, Esconderijos... (Req: Enganação)").setValue("Enganação").setEmoji("🎭"),
                            new StringSelectMenuOptionBuilder().setLabel("Religião").setDescription("Templos, Capelas... (Req: Religião)").setValue("Religião").setEmoji("📿"),
                            new StringSelectMenuOptionBuilder().setLabel("Misticismo").setDescription("Torres, Círculos Arcanos... (Req: Misticismo)").setValue("Misticismo").setEmoji("🔮")
                        );

                    const voltarRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_voltar_${interaction.id}`).setLabel("Voltar").setStyle(ButtonStyle.Secondary)
                    );

                    await iBtn.update({ 
                        content: `**Obras de Engenharia**\nEscolha o setor do seu novo empreendimento. Lembre-se que você precisará da perícia equivalente ao setor.`, 
                        embeds: [], 
                        components: [new ActionRowBuilder().addComponents(menuCategorias), voltarRow] 
                    });
                }

                else if (iBtn.isStringSelectMenu() && iBtn.customId.startsWith("dom_menu_cat_")) {
                    const valorSelecionado = iBtn.values[0];
                    let categoriaReal = valorSelecionado;
                    
                    if (valorSelecionado.startsWith("Nobreza")) {
                        categoriaReal = "Nobreza";
                    }
                    
                    let obrasDestaCategoria = [];
                    Object.keys(CATALOGO_CONSTRUCOES).forEach(nome => {
                        const obra = CATALOGO_CONSTRUCOES[nome];
                        if (obra.tipo === categoriaReal) {
                            obrasDestaCategoria.push({ nome: nome, ...obra });
                        }
                    });

                    obrasDestaCategoria.sort((a, b) => a.nome.localeCompare(b.nome));

                    if (valorSelecionado === "Nobreza_1") {
                        obrasDestaCategoria = obrasDestaCategoria.slice(0, 23);
                    } else if (valorSelecionado === "Nobreza_2") {
                        obrasDestaCategoria = obrasDestaCategoria.slice(23, 50); 
                    } else {
                        obrasDestaCategoria = obrasDestaCategoria.slice(0, 25); 
                    }

                    const menuPredios = new StringSelectMenuBuilder()
                        .setCustomId(`dom_menu_bld_${interaction.id}`)
                        .setPlaceholder(`Obras de ${categoriaReal}...`);

                    obrasDestaCategoria.forEach(obra => {
                        menuPredios.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${obra.nome} (Custo: ${obra.custo} LO)`)
                                .setDescription(obra.req ? `Requer: ${Array.isArray(obra.req) ? obra.req.join(" E ") : obra.req}` : "Sem pré-requisitos estruturais")
                                .setValue(obra.nome)
                        );
                    });

                    const voltarRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_construir_${interaction.id}`).setLabel("Trocar Setor").setStyle(ButtonStyle.Secondary)
                    );

                    await iBtn.update({
                        content: `**Setor de ${categoriaReal}**\n*Selecione o projeto para iniciar as obras (Custa 1 Ação de Regente).*`,
                        components: [new ActionRowBuilder().addComponents(menuPredios), voltarRow]
                    });
                }

                else if (iBtn.isStringSelectMenu() && iBtn.customId.startsWith("dom_menu_bld_")) {
                    const nomeObra = iBtn.values[0];
                    await iBtn.deferUpdate();

                    try {
                        const log = await DominioService.construir(dominio.id, char.id, nomeObra);
                        dominio = await DominioService.buscarPainel(char.id); 

                        await iBtn.followUp({ content: `✅ ${log}` });
                        await msgPainel.edit(renderizarPainel());
                    } catch (err) {
                        await iBtn.followUp({ content: `❌ **Obras Embargadas:** ${err.message}`, flags: MessageFlags.Ephemeral });
                    }
                }

                else if (iBtn.customId.startsWith("dom_btn_exercito_")) {
                    const exercitoEmbed = new EmbedBuilder()
                        .setColor("#E74C3C")
                        .setTitle(`⚔️ Forças Armadas: ${dominio.nome}`)
                        .setDescription("Visão geral das suas unidades militares atuais e custos de manutenção.");

                    let poderTotal = 0;
                    let manutencaoTotal = 0;
                    let listaTropas = "";

                    if (dominio.tropas.length === 0) {
                        listaTropas = "*Nenhuma unidade militar recrutada no momento.*";
                    } else {
                        dominio.tropas.forEach(t => {
                            const stats = CATALOGO_TROPAS[t.nome];
                            if (stats) {
                                const poderTropa = stats.poder * t.quantidade;
                                const manutencaoTropa = stats.manutencao * t.quantidade;
                                
                                poderTotal += poderTropa;
                                manutencaoTotal += manutencaoTropa;
                                
                                listaTropas += `**${t.quantidade}x ${t.nome}** (Poder: ${poderTropa} | Manut: ${manutencaoTropa} LO)\n`;
                            }
                        });
                    }

                    exercitoEmbed.addFields(
                        { name: "Unidades", value: listaTropas, inline: false },
                        { name: "Estatísticas Totais", value: `**Poder Militar:** ${poderTotal}\n**Manutenção Mensal:** ${manutencaoTotal} LO`, inline: false }
                    );

                    const botoesRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_recrutar_${interaction.id}`).setLabel("Recrutar Tropas").setStyle(ButtonStyle.Primary).setEmoji("➕"),
                        new ButtonBuilder().setCustomId(`dom_btn_voltar_${interaction.id}`).setLabel("Voltar ao Painel").setStyle(ButtonStyle.Secondary).setEmoji("🔙")
                    );

                    await iBtn.update({ content: null, embeds: [exercitoEmbed], components: [botoesRow] });
                }
                
                else if (iBtn.customId.startsWith("dom_btn_recrutar_")) {
                    if (dominio.acoes_disponiveis <= 0) {
                        return iBtn.reply({ content: "🚫 Você precisa de 1 Ação de Regente para treinar tropas.", flags: MessageFlags.Ephemeral });
                    }

                    const menuTropas = new StringSelectMenuBuilder()
                        .setCustomId(`dom_menu_tropa_${interaction.id}`)
                        .setPlaceholder("Selecione a Tropa para recrutar...");

                    Object.keys(CATALOGO_TROPAS).forEach(nome => {
                        const tropa = CATALOGO_TROPAS[nome];
                        const reqText = tropa.req ? `Req: ${tropa.req}` : "Sem requisito";
                        menuTropas.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${nome} (Custo: ${tropa.custo} LO)`)
                                .setDescription(`Poder: ${tropa.poder} | Manut: ${tropa.manutencao} LO/mês | ${reqText}`)
                                .setValue(nome)
                        );
                    });

                    const voltarRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`dom_btn_exercito_${interaction.id}`).setLabel("Cancelar / Voltar").setStyle(ButtonStyle.Secondary)
                    );

                    await iBtn.update({
                        content: `**Centro de Recrutamento** ⚔️\nVocê pode recrutar até **${dominio.nivel} unidades** por Ação de Regente.\n*Selecione o pelotão que deseja convocar:*`,
                        components: [new ActionRowBuilder().addComponents(menuTropas), voltarRow],
                        embeds: []
                    });
                }

                else if (iBtn.customId.startsWith("dom_btn_voltar_")) {
                    await iBtn.update({ content: null, ...renderizarPainel() });
                }
            });

            collector.on("end", () => {
                msgPainel.edit({ components: [] }).catch(() => {});
            });
        }
    }
};