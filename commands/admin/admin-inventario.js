const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const ItensRepository = require("../../repositories/ItensRepository.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin_inventario")
        .setDescription("🛠️ [Mestre] Gerencia o inventário de um jogador.")
        .addSubcommand(sub =>
            sub
                .setName("ver")
                .setDescription("Visualiza o inventário completo de um jogador.")
                .addUserOption(opt => opt.setName("jogador").setDescription("O dono do inventário").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("remover")
                .setDescription("Remove uma quantidade de um item específico do inventário do jogador.")
                .addUserOption(opt => opt.setName("jogador").setDescription("O jogador alvo").setRequired(true))
                .addStringOption(opt =>
                    opt.setName("item").setDescription("Nome exato do item a ser removido").setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt
                        .setName("quantidade")
                        .setDescription("Quantidade a remover. Deixe em branco para remover TUDO deste item.")
                        .setRequired(false)
                        .setMinValue(1)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("limpar_tudo")
                .setDescription("⚠️ Apaga TODOS os itens da mochila do jogador.")
                .addUserOption(opt =>
                    opt.setName("jogador").setDescription("O jogador que perderá tudo").setRequired(true)
                )
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

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcomando = interaction.options.getSubcommand();
        const alvoUser = interaction.options.getUser("jogador");

        if (alvoUser.bot) {
            return interaction.editReply("🚫 Bots não possuem inventário.");
        }

        try {
            const char = await getPersonagemAtivo(alvoUser.id);

            if (!char) {
                return interaction.editReply(
                    `🚫 O usuário **${alvoUser.username}** não tem um personagem ativo no momento.`
                );
            }
            if (subcomando === "ver") {
                let inventario = await ItensRepository.buscarInventario(char.id);

                if (!inventario || inventario.length === 0) {
                    const embedVazio = new EmbedBuilder()
                        .setColor("#2B2D31")
                        .setTitle(`🎒 Mochila de ${char.nome} (Admin)`)
                        .setDescription("A mochila deste jogador está completamente vazia.");
                    return interaction.editReply({ embeds: [embedVazio] });
                }

                const emojis = {
                    Alimento: "🍔",
                    Consumíveis: "🎒",
                    "Itens Permanentes": "🛡️",
                    Melhorias: "⚒️",
                    Encantamento: "✨",
                    "Item Mágico": "🪄",
                    "Poções/Pergaminhos (1-2)": "🧪",
                    "Poções/Pergaminhos (3-5)": "🧪"
                };

                const itensAgrupados = inventario.reduce((acc, item) => {
                    if (!acc[item.tipo]) acc[item.tipo] = [];
                    acc[item.tipo].push(item);
                    return acc;
                }, {});

                const paginas = [];
                let embedAtual = new EmbedBuilder()
                    .setColor("#E74C3C")
                    .setTitle(`🎒 Mochila de ${char.nome} (Visualização Admin)`)
                    .setThumbnail(alvoUser.displayAvatarURL());

                let camposNoEmbed = 0;

                for (const [tipo, itensLista] of Object.entries(itensAgrupados)) {
                    let textoCampo = "";

                    itensLista.forEach(item => {
                        const icone = emojis[tipo] || "📦";
                        const desc = item.descricao
                            ? `\n> *${item.descricao.substring(0, 60)}${item.descricao.length > 60 ? "..." : ""}*`
                            : "";
                        const linha = `**${item.nome}** \`x${item.quantidade}\`${desc}\n\n`;

                        if ((textoCampo + linha).length > 1024) {
                            embedAtual.addFields({ name: `${icone} ${tipo}`, value: textoCampo });
                            textoCampo = linha;
                            camposNoEmbed++;
                        } else {
                            textoCampo += linha;
                        }

                        if (camposNoEmbed >= 6) {
                            paginas.push(embedAtual);
                            embedAtual = new EmbedBuilder()
                                .setColor("#E74C3C")
                                .setTitle(`🎒 Mochila de ${char.nome} (Cont.)`)
                                .setThumbnail(alvoUser.displayAvatarURL());
                            camposNoEmbed = 0;
                        }
                    });

                    if (textoCampo) {
                        embedAtual.addFields({ name: `${emojis[tipo] || "📦"} ${tipo}`, value: textoCampo });
                        camposNoEmbed++;
                    }
                }

                if (camposNoEmbed > 0) paginas.push(embedAtual);

                if (paginas.length === 1) {
                    return interaction.editReply({ embeds: [paginas[0]] });
                }

                let paginaAtual = 0;

                const atualizarBotoes = () => {
                    return new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("admin_inv_prev")
                            .setLabel("◀️ Anterior")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(paginaAtual === 0),
                        new ButtonBuilder()
                            .setCustomId("admin_inv_cont")
                            .setLabel(`${paginaAtual + 1} / ${paginas.length}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId("admin_inv_next")
                            .setLabel("Próximo ▶️")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(paginaAtual === paginas.length - 1)
                    );
                };

                const msg = await interaction.editReply({
                    embeds: [paginas[paginaAtual]],
                    components: [atualizarBotoes()],
                    fetchReply: true
                });

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 120000
                });

                collector.on("collect", async iBtn => {
                    if (iBtn.customId === "admin_inv_prev") paginaAtual--;
                    if (iBtn.customId === "admin_inv_next") paginaAtual++;

                    await iBtn.update({
                        embeds: [paginas[paginaAtual]],
                        components: [atualizarBotoes()]
                    });
                });

                collector.on("end", () => {
                    msg.edit({ components: [] }).catch(() => {});
                });
            } else if (subcomando === "remover") {
                const nomeItem = interaction.options.getString("item");
                const qtdRemover = interaction.options.getInteger("quantidade");

                const inventario = await ItensRepository.buscarInventario(char.id);

                const itemTarget = inventario.find(i => i.nome.toLowerCase() === nomeItem.toLowerCase());

                if (!itemTarget) {
                    return interaction.editReply(
                        `❌ O item **"${nomeItem}"** não foi encontrado na mochila de ${char.nome}.`
                    );
                }

                if (!qtdRemover || qtdRemover >= itemTarget.quantidade) {
                    await prisma.item.delete({
                        where: { id: itemTarget.id }
                    });

                    return interaction.editReply(
                        `🗑️ Todos os **${itemTarget.quantidade}x ${itemTarget.nome}** foram removidos do inventário de ${char.nome}.`
                    );
                } else {
                    await prisma.item.update({
                        where: { id: itemTarget.id },
                        data: { quantidade: itemTarget.quantidade - qtdRemover }
                    });

                    return interaction.editReply(
                        `➖ Foram removidos **${qtdRemover}x ${itemTarget.nome}** do inventário de ${char.nome}. (Restam: ${itemTarget.quantidade - qtdRemover})`
                    );
                }
            } else if (subcomando === "limpar_tudo") {
                const deletados = await prisma.item.deleteMany({
                    where: { personagem_id: char.id }
                });

                if (deletados.count === 0) {
                    return interaction.editReply(`🎒 O inventário de **${char.nome}** já estava vazio.`);
                }

                return interaction.editReply(
                    `🔥 **Limpeza Total:** Foram incinerados ${deletados.count} tipos de itens da mochila de ${char.nome}.`
                );
            }
        } catch (err) {
            console.error("Erro no comando admin_inventario:", err);
            await interaction.editReply("❌ Ocorreu um erro ao manipular o inventário do jogador.");
        }
    }
};
