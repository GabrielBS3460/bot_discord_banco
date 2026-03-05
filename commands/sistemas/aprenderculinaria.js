const {
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {

    name: "aprenderculinaria",

    async execute({
        message,
        prisma,
        getPersonagemAtivo,
        DB_CULINARIA
    }) {

        const char = await getPersonagemAtivo(message.author.id);

        if (!char)
            return message.reply("Sem personagem.");

        const listaPericias = char.pericias || [];

        if (!listaPericias.includes("Ofício Cozinheiro")) {
            return message.reply(
                "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para usar o fogão sem incendiar a cozinha!"
            );
        }

        const limiteReceitas = Math.max(1, char.inteligencia + 1);

        const conhecidas = char.receitas_conhecidas || [];

        if (conhecidas.length >= limiteReceitas) {

            return message.reply(
                `🚫 **Limite atingido!** Você tem Inteligência ${char.inteligencia} e já conhece ${conhecidas.length} receitas.\n` +
                `Aumente sua Inteligência para aprender mais.`
            );

        }

        const todasReceitas = Object.keys(DB_CULINARIA.RECEITAS);

        const disponiveis =
            todasReceitas.filter(r => !conhecidas.includes(r));

        if (disponiveis.length === 0)
            return message.reply("Você já conhece todas as receitas!");

        const menu = new StringSelectMenuBuilder()
            .setCustomId("menu_aprender_receita")
            .setPlaceholder(
                `Aprender Receita (${conhecidas.length}/${limiteReceitas})`
            );

        disponiveis.slice(0, 25).forEach(nome => {

            menu.addOptions(

                new StringSelectMenuOptionBuilder()
                    .setLabel(nome)
                    .setDescription(
                        DB_CULINARIA.RECEITAS[nome].desc
                    )
                    .setValue(nome)

            );

        });

        const msg = await message.reply({

            content:
                `📚 **Livro de Receitas**\n` +
                `Você pode aprender mais **${limiteReceitas - conhecidas.length}** receitas.`,

            components: [
                new ActionRowBuilder().addComponents(menu)
            ]

        });

        const collector =
            msg.createMessageComponentCollector({

                filter: i =>
                    i.user.id === message.author.id &&
                    i.customId === "menu_aprender_receita",

                time: 60000

            });

        collector.on("collect", async i => {

            if (!i.isStringSelectMenu()) return;

            const receitaEscolhida = i.values[0];

            const charUp =
                await getPersonagemAtivo(message.author.id);

            const receitasAtuais =
                charUp.receitas_conhecidas || [];

            const limiteAtual =
                Math.max(1, charUp.inteligencia + 1);

            if (receitasAtuais.length >= limiteAtual) {

                return i.reply({

                    content: "Limite de receitas atingido.",
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

                content:
                    `✅ **Você aprendeu a fazer:** ${receitaEscolhida}!`,

                components: []

            });

        });

    }

};