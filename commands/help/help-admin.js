const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const CATEGORIAS = require("../../data/helpAdminData.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help-admin")
        .setDescription("Exibe o painel de ajuda interativo com os comandos de administração."),

    async execute({ interaction, client, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN) && !interaction.member.roles.cache.has(ID_CARGO_MOD)) {
            return interaction.reply({
                content: "🚫 Apenas administradores e moderadores podem usar este comando.",
                ephemeral: true
            });
        }

        const criarMenu = () => {
            return new EmbedBuilder()
                .setColor("#FF5555")
                .setTitle("🛠️ Painel Administrativo")
                .setDescription("Clique em uma categoria abaixo para ver os comandos atualizados.")
                .setThumbnail(client.user.displayAvatarURL());
        };

        const criarCategoria = cat => {
            const lista = cat.comandos.map(c => `**${c.cmd}**\n${c.desc}\n\`${c.syntax}\``).join("\n\n");

            return new EmbedBuilder().setColor("#FF5555").setTitle(`${cat.emoji} ${cat.titulo}`).addFields({
                name: "Comandos",
                value: lista
            });
        };

        const rowMenu = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("admin_economia")
                .setLabel("Economia")
                .setEmoji("💰")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("admin_personagem")
                .setLabel("Personagem")
                .setEmoji("👤")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("admin_inventario")
                .setLabel("Inventário")
                .setEmoji("🎒")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("admin_contratos")
                .setLabel("Contratos")
                .setEmoji("📜")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("admin_sistema")
                .setLabel("Sistema")
                .setEmoji("⚙️")
                .setStyle(ButtonStyle.Danger)
        );

        const rowVoltar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("admin_menu").setLabel("⬅ Voltar").setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.reply({
            embeds: [criarMenu()],
            components: [rowMenu],
            ephemeral: true,
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 120000
        });

        collector.on("collect", async i => {
            if (i.customId === "admin_menu") {
                return i.update({
                    embeds: [criarMenu()],
                    components: [rowMenu]
                });
            }

            const categoria = i.customId.replace("admin_", "");
            const cat = CATEGORIAS[categoria];

            if (!cat) return;

            return i.update({
                embeds: [criarCategoria(cat)],
                components: [rowVoltar]
            });
        });

        collector.on("end", async () => {
            try {
                await interaction.editReply({ components: [] });
                // eslint-disable-next-line no-unused-vars
            } catch (err) {
                /* empty */
            }
        });
    }
};
