const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const CulinariaService = require("../../services/CulinariaService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aprenderculinaria")
        .setDescription("Aprende novas receitas baseado na sua Inteligência.")
        .addBooleanOption(opt =>
            opt.setName("as_da_cozinha").setDescription("Você possui o poder 'Ás da Cozinha'?").setRequired(true)
        ),

    async execute({ interaction, getPersonagemAtivo, DB_CULINARIA }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char) {
                return interaction.reply({ content: "🚫 Sem personagem ativo.", flags: MessageFlags.Ephemeral });
            }

            try {
                CulinariaService.verificarPericia(char);
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                return interaction.reply({
                    content:
                        "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para usar o fogão sem incendiar a cozinha!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const temAsDaCozinha = interaction.options.getBoolean("as_da_cozinha");
            const limiteReceitas = CulinariaService.calcularLimiteReceitas(char, temAsDaCozinha);
            const conhecidas = char.receitas_conhecidas || [];

            if (conhecidas.length >= limiteReceitas) {
                let motivo = temAsDaCozinha
                    ? `Você já atingiu o limite de **${limiteReceitas}** receitas (INT + Ás da Cozinha).`
                    : `Você já atingiu o limite de **${limiteReceitas}** receitas (Baseado apenas na sua INT).\n*Dica: Se você pegou o poder Ás da Cozinha, marque "True" no comando!*`;

                return interaction.reply({
                    content: `🚫 **Limite atingido!** ${motivo}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const todasReceitas = Object.keys(DB_CULINARIA.RECEITAS);
            const disponiveis = todasReceitas.filter(r => !conhecidas.includes(r));

            if (disponiveis.length === 0) {
                return interaction.reply({
                    content: "👨‍🍳 Você já conhece todas as receitas disponíveis no jogo!",
                    flags: MessageFlags.Ephemeral
                });
            }

            let pagina = 0;
            const ITENS_POR_PAGINA = 25;
            const totalPaginas = Math.ceil(disponiveis.length / ITENS_POR_PAGINA);

            const buildMenuComponents = () => {
                const inicio = pagina * ITENS_POR_PAGINA;
                const receitasPagina = disponiveis.slice(inicio, inicio + ITENS_POR_PAGINA);

                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`menu_aprender_receita_${interaction.id}`)
                    .setPlaceholder(`Aprender Receita (${conhecidas.length}/${limiteReceitas}) - Pág ${pagina + 1}/${totalPaginas}`);

                receitasPagina.forEach(nome => {
                    menu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(nome)
                            .setDescription(DB_CULINARIA.RECEITAS[nome].desc.substring(0, 100))
                            .setValue(nome)
                    );
                });

                const rows = [new ActionRowBuilder().addComponents(menu)];

                if (totalPaginas > 1) {
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`rec_prev_${interaction.id}`).setLabel("◀️").setStyle(ButtonStyle.Secondary).setDisabled(pagina === 0),
                            new ButtonBuilder().setCustomId(`rec_next_${interaction.id}`).setLabel("▶️").setStyle(ButtonStyle.Secondary).setDisabled(pagina === totalPaginas - 1)
                        )
                    );
                }
                return rows;
            };

            let textoCabecalho = `📚 **Livro de Receitas**\nSua capacidade: **${limiteReceitas}** pratos`;
            if (temAsDaCozinha) textoCabecalho += ` *(Bônus do Ás da Cozinha aplicado!)*`;
            textoCabecalho += `\nVocê ainda pode aprender mais **${limiteReceitas - conhecidas.length}** receitas.`;

            const replyMsg = await interaction.reply({
                content: textoCabecalho,
                components: buildMenuComponents(),
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = replyMsg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async i => {
                try {
                    if (i.isButton()) {
                        if (i.customId.startsWith("rec_prev_")) pagina = Math.max(0, pagina - 1);
                        if (i.customId.startsWith("rec_next_")) pagina = Math.min(totalPaginas - 1, pagina + 1);
                        return await i.update({ components: buildMenuComponents() });
                    }

                    if (i.isStringSelectMenu()) {
                        await i.deferUpdate();
                        const receitaEscolhida = i.values[0];

                        const charUp = await getPersonagemAtivo(interaction.user.id);
                        const receitasAtuais = charUp.receitas_conhecidas || [];
                        const limiteAtual = CulinariaService.calcularLimiteReceitas(charUp, temAsDaCozinha);

                        await CulinariaService.aprenderReceita(charUp.id, receitaEscolhida, receitasAtuais, limiteAtual);

                        await interaction.editReply({
                            content: `✅ **Você aprendeu a fazer:** ${receitaEscolhida}!\n*Abra o fogão com /cozinhar para preparar.*`,
                            components: []
                        });
                        collector.stop();
                    }
                } catch (err) {
                    if (err.message === "LIMITE_ATINGIDO")
                        return i.followUp({
                            content: "🚫 Limite de receitas atingido.",
                            flags: MessageFlags.Ephemeral
                        });
                    if (err.message === "RECEITA_JA_CONHECIDA")
                        return i.followUp({
                            content: "🚫 Você já aprendeu esta receita!",
                            flags: MessageFlags.Ephemeral
                        });
                    console.error(err);
                }
            });
        } catch (err) {
            console.error("Erro no comando aprenderculinaria:", err);

            const erroMsg = {
                content: "❌ Ocorreu um erro ao abrir o livro de receitas.",
                flags: MessageFlags.Ephemeral
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
