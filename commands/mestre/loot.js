const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const TransacaoService = require("../../services/TransacaoService.js");
const ItensRepository = require("../../repositories/ItensRepository.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loot")
        .setDescription("Concede uma recompensa (Dinheiro, Item ou Ingrediente) para um jogador.")
        .addSubcommand(sub =>
            sub
                .setName("dinheiro")
                .setDescription("Concede uma quantia de dinheiro (K$) para um jogador.")
                .addUserOption(option =>
                    option.setName("jogador").setDescription("O jogador que vai receber o loot").setRequired(true)
                )
                .addNumberOption(option =>
                    option
                        .setName("valor")
                        .setDescription("Valor em Kwanzas a ser concedido")
                        .setRequired(true)
                        .setMinValue(0.1)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("item")
                .setDescription("Concede um item diretamente para o inventário de um jogador.")
                .addUserOption(option =>
                    option.setName("jogador").setDescription("O jogador que vai receber o item").setRequired(true)
                )
                .addStringOption(option => option.setName("nome").setDescription("Nome do item").setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("tipo")
                        .setDescription("Categoria do item")
                        .setRequired(true)
                        .addChoices(
                            { name: "🍔 Alimento", value: "Alimento" },
                            { name: "🎒 Consumível", value: "Consumíveis" },
                            { name: "🛡️ Item Permanente", value: "Itens Permanentes" },
                            { name: "🪄 Item Mágico", value: "Item Mágico" },
                            { name: "✨ Encantamento", value: "Encantamento" },
                            { name: "⚒️ Melhoria", value: "Melhorias" },
                            { name: "🏹 Munição", value: "Munição" },
                            { name: "🧪 Poção/Pergaminho (1-2)", value: "Poções/Pergaminhos (1-2)" },
                            { name: "🧪 Poção/Pergaminho (3-5)", value: "Poções/Pergaminhos (3-5)" }
                        )
                )
                .addIntegerOption(option =>
                    option.setName("quantidade").setDescription("Quantidade de itens").setRequired(true).setMinValue(1)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("ingrediente")
                .setDescription("Concede ingredientes culinários diretamente para a despensa do jogador.")
                .addUserOption(option =>
                    option.setName("jogador").setDescription("O jogador que vai receber").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("nome")
                        .setDescription("Selecione qual ingrediente deseja enviar")
                        .setRequired(true)
                        .addChoices(
                            { name: "Açúcar das fadas", value: "Açúcar das fadas" },
                            { name: "Ave", value: "Ave" },
                            { name: "Avelã de Norba", value: "Avelã de Norba" },
                            { name: "Carne", value: "Carne" },
                            { name: "Carne de caça", value: "Carne de caça" },
                            { name: "Cereal", value: "Cereal" },
                            { name: "Cogumelo", value: "Cogumelo" },
                            { name: "Especiarias", value: "Especiarias" },
                            { name: "Farinha", value: "Farinha" },
                            { name: "Fruta", value: "Fruta" },
                            { name: "Gorad", value: "Gorad" },
                            { name: "Legume", value: "Legume" },
                            { name: "Leite", value: "Leite" },
                            { name: "Molho tamuraniano", value: "Molho tamuraniano" },
                            { name: "Óleo", value: "Óleo" },
                            { name: "Ovo de monstro", value: "Ovo de monstro" },
                            { name: "Peixe", value: "Peixe" },
                            { name: "Porco", value: "Porco" },
                            { name: "Queijo", value: "Queijo" },
                            { name: "Verdura", value: "Verdura" }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName("quantidade")
                        .setDescription("Quantidade do ingrediente")
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();
        const destinatarioUser = interaction.options.getUser("jogador");

        if (destinatarioUser.bot) {
            return interaction.reply({
                content: "🚫 Você não pode enviar loot para um bot.",
                flags: MessageFlags.Ephemeral
            });
        }

        const charDestinatario = await getPersonagemAtivo(destinatarioUser.id);
        if (!charDestinatario) {
            return interaction.reply({
                content: `🚫 O usuário **${destinatarioUser.username}** não tem um personagem ativo.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcomando === "dinheiro") {
            const valor = interaction.options.getNumber("valor");

            const modalId = `mod_loot_din_${destinatarioUser.id}_${interaction.id}`;
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle(`Loot de K$ para ${charDestinatario.nome}`)
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_motivo")
                            .setLabel("Motivo do Loot (Ex: Missão X, Evento Y)")
                            .setPlaceholder("Descreva brevemente o que gerou esse tesouro...")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(100)
                    )
                );

            await interaction.showModal(modal);

            try {
                const submit = await interaction.awaitModalSubmit({
                    filter: i => i.customId === modalId,
                    time: 60000
                });

                await submit.deferReply();
                const motivo = submit.fields.getTextInputValue("inp_motivo");

                await TransacaoService.registrarLootMestre(
                    charDestinatario.id,
                    valor,
                    interaction.user.username,
                    motivo
                );

                const embed = new EmbedBuilder()
                    .setColor("#F1C40F")
                    .setTitle("🏆 Loot Financeiro Concedido")
                    .setDescription(`*${motivo}*`)
                    .addFields(
                        { name: "👤 Personagem", value: charDestinatario.nome, inline: true },
                        { name: "💰 Valor", value: `**${formatarMoeda(valor)}**`, inline: true }
                    )
                    .setFooter({ text: `Concedido por ${interaction.user.username}` })
                    .setTimestamp();

                return await submit.editReply({ content: `<@${destinatarioUser.id}>`, embeds: [embed] });
            } catch (err) {
                if (err.code === "InteractionCollectorError") return;
                console.error("Erro no processamento do loot de dinheiro:", err);
            }
        } else if (subcomando === "item") {
            const nomeItem = interaction.options.getString("nome");
            const tipoItem = interaction.options.getString("tipo");
            const quantidade = interaction.options.getInteger("quantidade");

            const modalId = `mod_loot_item_${destinatarioUser.id}_${interaction.id}`;
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle(`Descreva o Item`)
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_desc_item")
                            .setLabel("Descrição e Efeitos Mágicos")
                            .setPlaceholder("Deixe em branco se for um item comum, ou descreva os bônus...")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(1000)
                    )
                );

            await interaction.showModal(modal);

            try {
                const submit = await interaction.awaitModalSubmit({
                    filter: i => i.customId === modalId,
                    time: 60000
                });

                await submit.deferReply();
                const descricao = submit.fields.getTextInputValue("inp_desc_item") || null;

                await ItensRepository.adicionarItem(charDestinatario.id, nomeItem, tipoItem, quantidade, descricao);

                const embed = new EmbedBuilder()
                    .setColor("#3498DB")
                    .setTitle("📦 Loot de Item Concedido")
                    .setDescription(
                        `Um novo item foi enviado diretamente para a mochila de **${charDestinatario.nome}**!`
                    )
                    .addFields(
                        { name: "Nome do Item", value: `${quantidade}x **${nomeItem}**`, inline: true },
                        { name: "Categoria", value: tipoItem, inline: true }
                    )
                    .setFooter({ text: `Concedido por ${interaction.user.username}` })
                    .setTimestamp();

                if (descricao) {
                    embed.addFields({ name: "Descrição / Efeitos", value: `*${descricao}*`, inline: false });
                }

                return await submit.editReply({ content: `<@${destinatarioUser.id}>`, embeds: [embed] });
            } catch (err) {
                if (err.code === "InteractionCollectorError") return;
                console.error("Erro no processamento do loot de item:", err);
            }
        } else if (subcomando === "ingrediente") {
            await interaction.deferReply();

            const nomeIngrediente = interaction.options.getString("nome");
            const quantidade = interaction.options.getInteger("quantidade");

            try {
                let estoqueAtual = charDestinatario.estoque_ingredientes || {};
                if (typeof estoqueAtual === "string") estoqueAtual = JSON.parse(estoqueAtual);

                estoqueAtual[nomeIngrediente] = (estoqueAtual[nomeIngrediente] || 0) + quantidade;

                await prisma.personagens.update({
                    where: { id: charDestinatario.id },
                    data: { estoque_ingredientes: estoqueAtual }
                });

                const embed = new EmbedBuilder()
                    .setColor("#2ECC71")
                    .setTitle("🥬 Loot de Ingrediente")
                    .setDescription(
                        `Novos mantimentos foram entregues diretamente na despensa de **${charDestinatario.nome}**!`
                    )
                    .addFields(
                        { name: "Adicionado", value: `${quantidade}x **${nomeIngrediente}**`, inline: true },
                        {
                            name: "Estoque Total",
                            value: `Agora possui **${estoqueAtual[nomeIngrediente]}** no total.`,
                            inline: true
                        }
                    )
                    .setFooter({ text: `Concedido por ${interaction.user.username}` })
                    .setTimestamp();

                return await interaction.editReply({ content: `<@${destinatarioUser.id}>`, embeds: [embed] });
            } catch (err) {
                console.error("Erro ao enviar loot de ingrediente:", err);
                return interaction.editReply({ content: "❌ Ocorreu um erro ao atualizar o estoque do jogador." });
            }
        }
    }
};
