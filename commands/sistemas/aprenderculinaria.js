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
        .setDescription("Aprende novas receitas baseado na sua Inteligência.")
        .addBooleanOption(opt => 
            opt.setName("as_da_cozinha")
               .setDescription("Você possui o poder 'Ás da Cozinha'?")
               .setRequired(true)
        ),

    async execute({
        interaction, 
        prisma,
        getPersonagemAtivo,
        DB_CULINARIA
    }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({ content: "🚫 Sem personagem ativo.", flags: MessageFlags.Ephemeral });
            }

            const listaPericias = char.pericias || [];

            if (!listaPericias.includes("Ofício Cozinheiro")) {
                return interaction.reply({
                    content: "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para usar o fogão sem incendiar a cozinha!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const temAsDaCozinha = interaction.options.getBoolean("as_da_cozinha");

            const calcularLimite = (personagem, temPoder) => {
                let limite = Math.max(1, personagem.inteligencia + 1);

                if (temPoder) {
                    let bonusPoder = 3;
                    const nivel = personagem.nivel_personagem || 1;

                    if (nivel >= 11) bonusPoder += 3;
                    if (nivel >= 17) bonusPoder += 3;

                    limite += bonusPoder;
                }

                return limite;
            };

            const limiteReceitas = calcularLimite(char, temAsDaCozinha);
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
                return interaction.reply({ content: "👨‍🍳 Você já conhece todas as receitas disponíveis no jogo!", flags: MessageFlags.Ephemeral });
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

            let textoCabecalho = `📚 **Livro de Receitas**\nSua capacidade: **${limiteReceitas}** pratos`;
            if (temAsDaCozinha) textoCabecalho += ` *(Bônus do Ás da Cozinha aplicado!)*`;
            textoCabecalho += `\nVocê ainda pode aprender mais **${limiteReceitas - conhecidas.length}** receitas.`;

            await interaction.reply({
                content: textoCabecalho,
                components: [new ActionRowBuilder().addComponents(menu)],
                flags: MessageFlags.Ephemeral
            });

            const replyMsg = await interaction.fetchReply();

            const collector = replyMsg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId === "menu_aprender_receita",
                time: 60000
            });

            collector.on("collect", async i => {
                try {
                    await i.deferUpdate();
                    const receitaEscolhida = i.values[0];

                    const charUp = await getPersonagemAtivo(interaction.user.id);
                    const receitasAtuais = charUp.receitas_conhecidas || [];
                    const limiteAtual = calcularLimite(charUp, temAsDaCozinha);

                    if (receitasAtuais.length >= limiteAtual) {
                        return i.followUp({
                            content: "🚫 Limite de receitas atingido.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (receitasAtuais.includes(receitaEscolhida)) {
                        return i.followUp({
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

                    await interaction.editReply({
                        content: `✅ **Você aprendeu a fazer:** ${receitaEscolhida}!\n*Abra o fogão com /cozinhar para preparar.*`,
                        components: [] 
                    });

                    collector.stop();

                } catch(err) {
                    console.error(err);
                }
            });

        } catch (err) {
            console.error("Erro no comando aprenderculinaria:", err);
            
            const erroMsg = { content: "❌ Ocorreu um erro ao abrir o livro de receitas.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};