const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const ItensRepository = require("../../repositories/ItensRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventario")
        .setDescription("Abre a sua mochila para visualizar todos os seus itens.")
        .addStringOption(opt =>
            opt.setName("filtro")
                .setDescription("Filtrar por um tipo específico de item")
                .setRequired(false)
                .addChoices(
                    { name: "🍔 Alimentos", value: "Alimento" },
                    { name: "🎒 Consumíveis", value: "Consumíveis" },
                    { name: "🛡️ Itens Permanentes", value: "Itens Permanentes" },
                    { name: "⚒️ Melhorias", value: "Melhorias" },
                    { name: "✨ Item Mágico / Encantamento", value: "Item Mágico" },
                    { name: "🧪 Poções e Pergaminhos", value: "Poções/Pergaminhos" }
                )
        ),

    async execute({ interaction, getPersonagemAtivo }) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.editReply("🚫 Você não tem um personagem ativo no momento.");
            }

            let inventario = await ItensRepository.buscarInventario(char.id);
            const filtro = interaction.options.getString("filtro");

            if (!inventario || inventario.length === 0) {
                const embedVazio = new EmbedBuilder()
                    .setColor("#2B2D31")
                    .setTitle(`🎒 Mochila de ${char.nome}`)
                    .setDescription("Sua mochila está completamente vazia. O eco lá dentro é ensurdecedor.");
                return interaction.editReply({ embeds: [embedVazio] });
            }

            if (filtro) {
                if (filtro === "Poções/Pergaminhos") {
                    inventario = inventario.filter(i => i.tipo.includes("Poções/Pergaminhos"));
                } else if (filtro === "Item Mágico") {
                    inventario = inventario.filter(i => i.tipo === "Item Mágico" || i.tipo === "Encantamento");
                } else {
                    inventario = inventario.filter(i => i.tipo === filtro);
                }

                if (inventario.length === 0) {
                    return interaction.editReply(`🎒 Você não possui nenhum item do tipo **${filtro}** na mochila.`);
                }
            }

            const emojis = {
                "Alimento": "🍔",
                "Consumíveis": "🎒",
                "Itens Permanentes": "🛡️",
                "Melhorias": "⚒️",
                "Encantamento": "✨",
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
                .setColor("#D4AF37")
                .setTitle(`🎒 Mochila de ${char.nome}`)
                .setThumbnail(interaction.user.displayAvatarURL());
            
            let camposNoEmbed = 0;

            for (const [tipo, itensLista] of Object.entries(itensAgrupados)) {
                let textoCampo = "";
                
                itensLista.forEach(item => {
                    const icone = emojis[tipo] || "📦";
                    const desc = item.descricao ? `\n> *${item.descricao.substring(0, 60)}${item.descricao.length > 60 ? "..." : ""}*` : "";
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
                            .setColor("#D4AF37")
                            .setTitle(`🎒 Mochila de ${char.nome} (Cont.)`)
                            .setThumbnail(interaction.user.displayAvatarURL());
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
                        .setCustomId("inv_prev")
                        .setLabel("◀️ Anterior")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(paginaAtual === 0),
                    new ButtonBuilder()
                        .setCustomId("inv_cont")
                        .setLabel(`${paginaAtual + 1} / ${paginas.length}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId("inv_next")
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
                if (iBtn.customId === "inv_prev") paginaAtual--;
                if (iBtn.customId === "inv_next") paginaAtual++;

                await iBtn.update({
                    embeds: [paginas[paginaAtual]],
                    components: [atualizarBotoes()]
                });
            });

            collector.on("end", () => {
                msg.edit({ components: [] }).catch(() => {});
            });

        } catch (err) {
            console.error("Erro no comando inventario:", err);
            await interaction.editReply("❌ Ocorreu um erro ao vasculhar sua mochila.");
        }
    }
};