const CATEGORIAS = require("../data/helpData.js");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Abre a Central de Ajuda interativa com todos os comandos do sistema."),

    async execute({ interaction, client }) {
        const criarEmbedMenu = () => {
            return new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle("📘 Central de Ajuda")
                .setDescription(
                    "O sistema funciona através de **Slash Commands** (`/`).\nClique em uma categoria abaixo para consultar a documentação."
                )
                .setThumbnail(client.user.displayAvatarURL());
        };

        const criarEmbedCategoria = cat => {
            const lista = cat.comandos.map(c => `**${c.cmd}**\n${c.desc}\n\`${c.syntax}\``).join("\n\n");

            return new EmbedBuilder()
                .setColor("#0099FF")
                .setTitle(`${cat.emoji} ${cat.titulo}`)
                .setDescription(cat.descricao)
                .addFields({ name: "Comandos Disponíveis", value: lista });
        };

        const rowMenu1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("help_personagem")
                .setLabel("Personagem")
                .setEmoji("👤")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("help_contrato")
                .setLabel("Contratos")
                .setEmoji("🛡️")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("help_sistemas")
                .setLabel("Ofícios")
                .setEmoji("⚒️")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("help_atividades")
                .setLabel("Atividades")
                .setEmoji("🎲")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("help_mestre")
                .setLabel("Mestre")
                .setEmoji("👑")
                .setStyle(ButtonStyle.Primary)
        );

        const rowMenu2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("help_base").setLabel("Bases").setEmoji("🏰").setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("help_agenda")
                .setLabel("Agenda")
                .setEmoji("📅")
                .setStyle(ButtonStyle.Primary)
        );

        const rowVoltar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("help_menu").setLabel("⬅ Voltar ao Início").setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            embeds: [criarEmbedMenu()],
            components: [rowMenu1, rowMenu2],
            flags: MessageFlags.Ephemeral
        });

        const msg = await interaction.fetchReply();

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 120000
        });

        collector.on("collect", async i => {
            if (i.customId === "help_menu") {
                return i.update({
                    embeds: [criarEmbedMenu()],
                    components: [rowMenu1, rowMenu2]
                });
            }

            const categoria = i.customId.replace("help_", "");
            const cat = CATEGORIAS[categoria];

            if (!cat) return;

            return i.update({
                embeds: [criarEmbedCategoria(cat)],
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
