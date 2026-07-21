const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-editar-item")
        .setDescription("🛠️ Altera o nome de um item no inventário de um jogador (Apenas Admin/Mod).")
        .addUserOption(opt => opt.setName("jogador").setDescription("O jogador dono do item").setRequired(true))
        .addStringOption(opt => opt.setName("nome_novo").setDescription("O novo nome do item").setRequired(true))
        .addStringOption(opt => opt.setName("item_antigo").setDescription("Filtro do nome atual do item").setRequired(false)),

    async execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao = interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando administrativo.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const alvoUser = interaction.options.getUser("jogador");
        const nomeNovo = interaction.options.getString("nome_novo").trim();
        const filtroAntigo = interaction.options.getString("item_antigo");

        if (alvoUser.bot) return interaction.editReply("🚫 Bots não possuem inventário.");

        try {
            const personagens = await PersonagemRepository.buscarTodosDoJogador(alvoUser.id);
            if (personagens.length === 0) {
                return interaction.editReply(`🚫 O jogador **${alvoUser.username}** não possui personagens.`);
            }

            const charIds = personagens.map(p => p.id);
            let inventarios = await prisma.item.findMany({
                where: { personagem_id: { in: charIds } },
                include: { personagem: true }
            });

            if (inventarios.length === 0) {
                return interaction.editReply(`🎒 Nenhum item encontrado nos inventários de **${alvoUser.username}**.`);
            }

            if (filtroAntigo) {
                const termo = filtroAntigo.toLowerCase();
                inventarios = inventarios.filter(i => i.nome.toLowerCase().includes(termo));

                if (inventarios.length === 0) {
                    return interaction.editReply(`🎒 Nenhum item encontrado contendo "**${filtroAntigo}**".`);
                }
            }

            const alterarNome = async (itemObj) => {
                await prisma.item.update({
                    where: { id: itemObj.id },
                    data: { nome: nomeNovo }
                });

                const embed = new EmbedBuilder()
                    .setColor("#2ECC71")
                    .setTitle("🛠️ Item Editado por Admin")
                    .setDescription(`O nome do item foi alterado com sucesso!`)
                    .addFields(
                        { name: "Dono", value: `${itemObj.personagem.nome} (${alvoUser.username})`, inline: true },
                        { name: "Nome Antigo", value: itemObj.nome, inline: true },
                        { name: "Novo Nome", value: nomeNovo, inline: true }
                    )
                    .setFooter({ text: `Alterado por ${interaction.user.username}` });

                return interaction.editReply({ embeds: [embed], components: [] });
            };

            if (inventarios.length === 1) {
                return await alterarNome(inventarios[0]);
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`menu_admin_edit_item_${interaction.id}`)
                .setPlaceholder("Selecione o item que deseja renomear...");

            inventarios.slice(0, 25).forEach(item => {
                menu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.nome} (${item.personagem.nome})`)
                        .setDescription(`Tipo: ${item.tipo} | Qtd: ${item.quantidade}`)
                        .setValue(item.id.toString())
                );
            });

            const replyMsg = await interaction.editReply({
                content: `🛠️ **Selecione o item a renomear para "**${nomeNovo}**":**`,
                components: [new ActionRowBuilder().addComponents(menu)],
                fetchReply: true
            });

            const collector = replyMsg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async iSelect => {
                await iSelect.deferUpdate();
                const itemId = parseInt(iSelect.values[0]);
                const itemSelecionado = inventarios.find(i => i.id === itemId);
                collector.stop();
                await alterarNome(itemSelecionado);
            });

        } catch (err) {
            console.error("Erro no admin-editar-item:", err);
            return interaction.editReply("❌ Ocorreu um erro ao renomear o item.");
        }
    }
};
