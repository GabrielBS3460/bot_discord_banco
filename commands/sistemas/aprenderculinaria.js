const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aprenderculinaria")
        .setDescription("Aprende novas receitas baseado na sua Inteligência."),

    async execute({
        interaction, 
        prisma,
        getPersonagemAtivo,
        DB_CULINARIA
    }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({ content: "🚫 Sem personagem ativo.", ephemeral: true });
            }

            const listaPericias = char.pericias || [];

            if (!listaPericias.includes("Ofício Cozinheiro")) {
                return interaction.reply({
                    content: "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para usar o fogão sem incendiar a cozinha!",
                    ephemeral: true
                });
            }

            const limiteReceitas = Math.max(1, char.inteligencia + 1);
            const conhecidas = char.receitas_conhecidas || [];

            if (conhecidas.length >= limiteReceitas) {
                return interaction.reply({
                    content: `🚫 **Limite atingido!** Você tem Inteligência ${char.inteligencia} e já conhece ${conhecidas.length} receitas.\nAumente sua Inteligência para aprender mais.`,
                    ephemeral: true
                });
            }

            const todasReceitas = Object.keys(DB_CULINARIA.RECEITAS);
            const disponiveis = todasReceitas.filter(r => !conhecidas.includes(r));

            if (disponiveis.length === 0) {
                return interaction.reply({ content: "👨‍🍳 Você já conhece todas as receitas disponíveis!", ephemeral: true });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_aprender_receita")
                .setPlaceholder(`Aprender Receita (${conhecidas.length}/${limiteReceitas})`);

            disponiveis.slice(0, 25).forEach(nome => {
                menu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(nome)
                        .setDescription(DB_CULINARIA.RECEITAS[nome].desc)
                        .setValue(nome)
                );
            });

            const msg = await interaction.reply({
                content: `📚 **Livro de Receitas**\nVocê pode aprender mais **${limiteReceitas - conhecidas.length}** receitas.`,
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true, 
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId === "menu_aprender_receita",
                time: 60000
            });

            collector.on("collect", async i => {
                if (!i.isStringSelectMenu()) return;

                const receitaEscolhida = i.values[0];

                const charUp = await getPersonagemAtivo(interaction.user.id);
                const receitasAtuais = charUp.receitas_conhecidas || [];
                const limiteAtual = Math.max(1, charUp.inteligencia + 1);

                if (receitasAtuais.length >= limiteAtual) {
                    return i.reply({
                        content: "🚫 Limite de receitas atingido.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (receitasAtuais.includes(receitaEscolhida)) {
                    return i.reply({
                        content: "🚫 Você já aprendeu esta receita!",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const novasConhecidas = [
                    ...receitasAtuais,
                    receitaEscolhida
                ];

                await prisma.personagens.update({
                    where: { id: charUp.id },
                    data: {
                        receitas_conhecidas: novasConhecidas
                    }
                });

                await i.update({
                    content: `✅ **Você aprendeu a fazer:** ${receitaEscolhida}!`,
                    components: [] 
                });
            });

        } catch (err) {
            console.error("Erro no comando aprenderculinaria:", err);
            
            const erroMsg = { content: "❌ Ocorreu um erro ao abrir o livro de receitas.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};