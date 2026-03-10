const {
    SlashCommandBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder
} = require("discord.js");

const CulinariaService = require("../../services/CulinariaService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("feirinha")
        .setDescription("Visite a feirinha da semana para comprar ingredientes frescos (Requer Ofício Cozinheiro)."),

    async execute({ interaction, getPersonagemAtivo, DB_CULINARIA }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                CulinariaService.verificarPericia(char);
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                return interaction.reply({
                    content:
                        "🚫 **Acesso Negado:** Você precisa da perícia **Ofício Cozinheiro** para escolher os ingredientes mais frescos!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const { itensLoja, diffDias } = await CulinariaService.atualizarFeirinhaSeNecessario(char, DB_CULINARIA);

            const montarMenu = lista => {
                if (lista.length === 0) return null;

                const menu = new StringSelectMenuBuilder()
                    .setCustomId("menu_comprar_ingrediente")
                    .setPlaceholder(`🛒 Selecione um ingrediente (${lista.length} disponíveis)`);

                lista.forEach((item, index) => {
                    menu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${item.nome} - K$ ${item.preco}`)
                            .setValue(`${index}_${item.nome}_${item.preco}`)
                            .setEmoji("🥬")
                    );
                });

                return new ActionRowBuilder().addComponents(menu);
            };

            const estoque = char.estoque_ingredientes || {};
            const listaEstoque =
                Object.entries(estoque)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ") || "Vazio";

            const rowInicial = montarMenu(itensLoja);
            const componentsInicial = rowInicial ? [rowInicial] : [];

            const contentInicial = rowInicial
                ? `🥦 **Feirinha da Semana** (Reseta em: ${7 - Math.floor(diffDias)} dias)\n💰 **Seu Saldo:** K$ ${char.saldo}\n🎒 **Seu Estoque:** ${listaEstoque}\n\n*Selecione abaixo para comprar:*`
                : `🥦 **Feirinha da Semana**\n🚫 **Estoque Esgotado!** Volte na próxima semana.`;

            const msg = await interaction.reply({
                content: contentInicial,
                components: componentsInicial,
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId === "menu_comprar_ingrediente",
                time: 60000
            });

            collector.on("collect", async i => {
                if (!i.isStringSelectMenu()) return;

                const charAtual = await getPersonagemAtivo(interaction.user.id);
                const [indexStr, nome, precoStr] = i.values[0].split("_");
                const index = parseInt(indexStr);
                const preco = parseFloat(precoStr);

                try {
                    const { novoEstoque, listaAtual, saldoAtualizado } =
                        await CulinariaService.comprarIngredienteNaFeira(charAtual, index, nome, preco);

                    const novoRow = montarMenu(listaAtual);
                    const novosComponents = novoRow ? [novoRow] : [];
                    const estoqueFormatado = Object.entries(novoEstoque)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ");

                    const novoConteudo = novoRow
                        ? `✅ Comprou **${nome}**!\n💰 **Saldo:** K$ ${saldoAtualizado.toFixed(2)}\n🎒 **Estoque:** ${estoqueFormatado}\n\n*Continue comprando:*`
                        : `✅ Comprou **${nome}**!\n🚫 **Estoque da Feirinha acabou!**`;

                    await i.update({
                        content: novoConteudo,
                        components: novosComponents
                    });
                } catch (err) {
                    if (err.message === "ITEM_INVALIDO") {
                        return i.reply({
                            content: "🚫 Este item já foi vendido ou a lista mudou.",
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    if (err.message === "SALDO_INSUFICIENTE") {
                        return i.reply({ content: "💸 Dinheiro insuficiente!", flags: MessageFlags.Ephemeral });
                    }
                    console.error("Erro na compra:", err);
                }
            });
        } catch (err) {
            console.error("Erro no comando feirinha:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao visitar a feirinha.", flags: MessageFlags.Ephemeral };
            interaction.replied
                ? await interaction.followUp(erroMsg).catch(() => {})
                : await interaction.reply(erroMsg).catch(() => {});
        }
    }
};
