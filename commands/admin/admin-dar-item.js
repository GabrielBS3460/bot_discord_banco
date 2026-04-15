const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const ItensRepository = require("../../repositories/ItensRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-dar-item")
        .setDescription("[ADMIN] Adiciona um item diretamente no inventário de um jogador.")
        .addUserOption(opt =>
            opt.setName("jogador").setDescription("O jogador que vai receber o item").setRequired(true)
        )
        .addStringOption(opt => opt.setName("nome").setDescription("Nome do item").setRequired(true))
        .addStringOption(opt =>
            opt
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
        .addIntegerOption(opt =>
            opt.setName("quantidade").setDescription("Quantidade a ser entregue").setRequired(true).setMinValue(1)
        )
        .addStringOption(opt =>
            opt.setName("descricao").setDescription("Link de imagem ou efeitos mecânicos (Opcional)").setRequired(false)
        ),

    async execute({ interaction, getPersonagemAtivo, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply();

        try {
            const alvoUser = interaction.options.getUser("jogador");
            const nomeItem = interaction.options.getString("nome");
            const tipoItem = interaction.options.getString("tipo");
            const quantidade = interaction.options.getInteger("quantidade");
            const descricao = interaction.options.getString("descricao");

            if (alvoUser.bot) {
                return interaction.editReply({ content: "🚫 Bots não possuem inventário." });
            }

            const char = await getPersonagemAtivo(alvoUser.id);

            if (!char) {
                return interaction.editReply({
                    content: `🚫 O jogador **${alvoUser.username}** não possui um personagem ativo no momento.`
                });
            }

            await ItensRepository.adicionarItem(char.id, nomeItem, tipoItem, quantidade, descricao || null);

            const embed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("🎁 Item Concedido Pelos Deuses!")
                .setDescription(`**${char.nome}** recebeu um novo item no inventário.`)
                .addFields(
                    { name: "📦 Item", value: `${quantidade}x **${nomeItem}**`, inline: true },
                    { name: "📑 Categoria", value: tipoItem, inline: true }
                );

            if (descricao) {
                embed.addFields({ name: "📝 Descrição / Efeitos", value: descricao });

                if (/\.(jpeg|jpg|gif|png|webp)$/i.test(descricao)) {
                    const linkEncontrado = descricao.match(/https?:\/\/[^\s]+/);
                    if (linkEncontrado) embed.setThumbnail(linkEncontrado[0]);
                }
            }

            await interaction.editReply({ content: `<@${alvoUser.id}>`, embeds: [embed] });
        } catch (error) {
            console.error("Erro no comando admin-dar-item:", error);
            await interaction.editReply({ content: "❌ Ocorreu um erro interno ao entregar o item." });
        }
    }
};
