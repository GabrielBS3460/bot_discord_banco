const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");
const ItensRepository = require("../../repositories/ItensRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-premiar-comunidade-item")
        .setDescription("Entrega um item para todos os personagens ativos.")
        .addStringOption(opt => opt.setName("item_nome").setDescription("Nome do item").setRequired(true))
        .addStringOption(opt =>
            opt.setName("categoria")
                .setDescription("Categoria do item")
                .setRequired(true)
                .addChoices(
                    { name: "Alimento", value: "Alimento" },
                    { name: "Consumíveis", value: "Consumíveis" },
                    { name: "Itens Permanentes", value: "Itens Permanentes" },
                    { name: "Melhorias", value: "Melhorias" },
                    { name: "Item Mágico", value: "Item Mágico" },
                    { name: "Poções/Pergaminhos (1-2)", value: "Poções/Pergaminhos (1-2)" },
                    { name: "Poções/Pergaminhos (3-5)", value: "Poções/Pergaminhos (3-5)" }
                )
        )
        .addIntegerOption(opt => opt.setName("quantidade").setDescription("Quantidade por personagem (padrão 1)").setRequired(false).setMinValue(1))
        .addStringOption(opt => opt.setName("descricao").setDescription("Descrição do item ou da entrega").setRequired(false)),

    async execute({ interaction, ID_CARGO_ADMIN }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({ content: "🚫 Apenas Administradores podem executar ações em massa.", flags: MessageFlags.Ephemeral });
        }

        const itemNome = interaction.options.getString("item_nome").trim();
        const categoria = interaction.options.getString("categoria");
        const qtd = interaction.options.getInteger("quantidade") || 1;
        const desc = interaction.options.getString("descricao") || "Entrega global de item.";

        const usuariosComAtivo = await prisma.usuarios.findMany({
            where: { personagem_ativo_id: { not: null } },
            include: { personagemAtivo: true }
        });

        const numPersonagens = usuariosComAtivo.length;
        if (numPersonagens === 0) {
            return interaction.reply({ content: "🚫 Nenhum personagem ativo encontrado.", flags: MessageFlags.Ephemeral });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor("#F1C40F")
            .setTitle("Ação em Massa!")
            .setDescription(`**TEM CERTEZA QUE QUER ENTREGAR ${qtd}x "${itemNome}" PARA TODOS OS ${numPersonagens} PERSONAGENS ATIVOS DA COMUNIDADE?**\n\n*Categoria:* ${categoria}\n*Descrição:* ${desc}`);

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`conf_item_com_${interaction.id}`).setLabel("CONFIRMAR").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`canc_item_com_${interaction.id}`).setLabel("CANCELAR").setStyle(ButtonStyle.Danger)
        );

        const replyMsg = await interaction.reply({
            embeds: [confirmEmbed],
            components: [botoes],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        const collector = replyMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on("collect", async iBtn => {
            await iBtn.deferUpdate();

            if (iBtn.customId.startsWith("canc_item_com_")) {
                await iBtn.editReply({ content: "❌ Ação cancelada.", embeds: [], components: [] });
                return collector.stop();
            }

            for (const u of usuariosComAtivo) {
                const charId = u.personagemAtivo.id;
                await ItensRepository.adicionarItem(charId, itemNome, categoria, qtd, desc);
                await prisma.transacao.create({
                    data: {
                        personagem_id: charId,
                        descricao: `[PRESENTE COMUNIDADE] ${qtd}x ${itemNome}`,
                        valor: 0,
                        tipo: "RECOMPENSA",
                        categoria: "ITEM"
                    }
                });
            }

            const publicEmbed = new EmbedBuilder()
                .setColor("#9B59B6")
                .setTitle("🎁 PRESENTE ENTREGUE PARA A COMUNIDADE")
                .setDescription(
                    `Todos os personagens ativos recebem\n\n` +
                    `**Nome do Item:** ${qtd}x ${itemNome}\n` +
                    `**Categoria do Item:** ${categoria}\n\n` +
                    `> **Descrição Adicionada ao item:** ${desc}`
                )
                .setFooter({ text: `Item entregue por ${interaction.user.username} · ${new Date().toLocaleString("pt-BR")}` });

            await interaction.channel.send({ content: "@everyone", embeds: [publicEmbed] });

            await iBtn.editReply({
                content: `✅ Item **${qtd}x ${itemNome}** entregue com sucesso para **${numPersonagens}** personagens!`,
                embeds: [],
                components: []
            });

            collector.stop();
        });
    }
};
