const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {

    name: "help-admin",

    async execute({ message, client, ID_CARGO_ADMIN, ID_CARGO_MOD }) {

        if (
            !message.member.roles.cache.has(ID_CARGO_ADMIN) &&
            !message.member.roles.cache.has(ID_CARGO_MOD)
        ) {
            return message.reply("🚫 Apenas administradores podem usar este comando.");
        }

        const CATEGORIAS = {

            economia: {
                emoji: "💰",
                titulo: "Administração de Economia",
                comandos: [
                    {
                        cmd: "!modificar-saldo",
                        desc: "Altera saldo de um jogador.",
                        syntax: "!modificar-saldo @usuario <valor> [motivo]"
                    },
                    {
                        cmd: "!admin-extrato",
                        desc: "Consulta histórico financeiro.",
                        syntax: "!admin-extrato @usuario"
                    }
                ]
            },

            personagem: {
                emoji: "👤",
                titulo: "Administração de Personagens",
                comandos: [
                    {
                        cmd: "!admin-criar",
                        desc: "Cria personagem para jogador.",
                        syntax: "!admin-criar @usuario <nome>"
                    }
                ]
            },

            contratos: {
                emoji: "📜",
                titulo: "Administração de Contratos",
                comandos: [
                    {
                        cmd: "!conferirnota",
                        desc: "Mostra avaliação média de um mestre.",
                        syntax: "!conferirnota @mestre"
                    }
                ]
            },

            sistema: {
                emoji: "⚙️",
                titulo: "Ferramentas do Sistema",
                comandos: [
                    {
                        cmd: "!sortearbicho",
                        desc: "Realiza sorteio semanal do bicho.",
                        syntax: "!sortearbicho"
                    }
                ]
            }

        };

        const criarMenu = () => {

            return new EmbedBuilder()
                .setColor("#FF5555")
                .setTitle("🛠️ Painel Administrativo")
                .setDescription("Clique em uma categoria para ver os comandos.")
                .setThumbnail(client.user.displayAvatarURL());

        };

        const criarCategoria = (cat) => {

            const lista = cat.comandos
                .map(c => `**${c.cmd}**\n${c.desc}\n\`${c.syntax}\``)
                .join("\n\n");

            return new EmbedBuilder()
                .setColor("#FF5555")
                .setTitle(`${cat.emoji} ${cat.titulo}`)
                .addFields({
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

            new ButtonBuilder()
                .setCustomId("admin_menu")
                .setLabel("⬅ Voltar")
                .setStyle(ButtonStyle.Secondary)

        );

        const msg = await message.reply({
            embeds: [criarMenu()],
            components: [rowMenu]
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
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

    }

};