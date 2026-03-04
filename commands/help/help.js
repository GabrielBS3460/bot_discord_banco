const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {

    name: "help",

    async execute({ message, client }) {

        const CATEGORIAS = {

            personagem: {
                emoji: "👤",
                titulo: "Personagem & Economia",
                descricao: "Gerencie sua ficha e economia.",
                comandos: [
                    {cmd:"!cadastrar", desc:"Cria um personagem.", syntax:"!cadastrar <nome>"},
                    {cmd:"!personagem", desc:"Gerencia personagens.", syntax:"!personagem <listar|trocar|apagar>"},
                    {cmd:"!ficha", desc:"Mostra sua ficha.", syntax:"!ficha"},
                    {cmd:"!saldo", desc:"Mostra seu saldo.", syntax:"!saldo"},
                    {cmd:"!extrato", desc:"Histórico financeiro.", syntax:"!extrato"},
                    {cmd:"!tix", desc:"Transferência entre jogadores.", syntax:"!tix <@usuario> <valor>"},
                    {cmd:"!gasto", desc:"Registra gasto.", syntax:"!gasto <valor> <motivo>"}
                ]
            },

            contrato: {
                emoji: "🛡️",
                titulo: "Sistema de Contratos",
                descricao: "Participe de aventuras.",
                comandos: [
                    {cmd:"!inscrever", desc:"Se candidata a um contrato.", syntax:"!inscrever"},
                    {cmd:"!resgatar", desc:"Resgata recompensa.", syntax:'!resgatar "Nome do Contrato"'},
                    {cmd:"!drop", desc:"Gera loot por ND.", syntax:"!drop <ND>"},
                    {cmd:"!avaliar", desc:"Avalia mestre.", syntax:"!avaliar @Mestre <link>"}
                ]
            },

            sistemas: {
                emoji: "⚒️",
                titulo: "Ofícios & Comércio",
                descricao: "Crafting e mercado.",
                comandos: [
                    {cmd:"!forjar", desc:"Cria itens.", syntax:"!forjar"},
                    {cmd:"!setforja", desc:"Configura forja.", syntax:"!setforja <poderes>"},
                    {cmd:"!resgatarforja", desc:"Resgata forja diária.", syntax:"!resgatarforja"},
                    {cmd:"!feirinha", desc:"Mercado semanal.", syntax:"!feirinha"},
                    {cmd:"!cozinhar", desc:"Prepara pratos.", syntax:"!cozinhar"},
                    {cmd:"!aprenderculinaria", desc:"Aprende receitas.", syntax:"!aprenderculinaria"},
                    {cmd:"!venda-ingredientes", desc:"Venda entre jogadores.", syntax:"!venda-ingredientes @player"}
                ]
            },

            atividades: {
                emoji: "🎲",
                titulo: "Jogos & Interação",
                descricao: "Atividades paralelas.",
                comandos: [
                    {cmd:"!apostar", desc:"Jogo do bicho.", syntax:"!apostar <valor> <tipo> <numero> <posicao>"},
                    {cmd:"!punga", desc:"Roubo aleatório.", syntax:"!punga"}
                ]
            },

            mestre: {
                emoji: "👑",
                titulo: "Comandos de Mestre",
                descricao: "Gerenciamento de contratos.",
                comandos: [
                    {cmd:"!criarcontrato", desc:"Cria contrato.", syntax:'!criarcontrato "Nome" <ND> <vagas>'},
                    {cmd:"!painelcontrato", desc:"Gerencia contrato.", syntax:'!painelcontrato "Nome"'},
                    {cmd:"!loot", desc:"Entrega recompensa.", syntax:"!loot @player <valor>"}
                ]
            }

        };

        const criarEmbedMenu = () => {
            return new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle("📘 Central de Ajuda")
                .setDescription("Clique em uma categoria abaixo.")
                .setThumbnail(client.user.displayAvatarURL());
        };

        const criarEmbedCategoria = (cat) => {

            const lista = cat.comandos.map(c =>
                `**${c.cmd}**\n${c.desc}\n\`${c.syntax}\``
            ).join("\n\n");

            return new EmbedBuilder()
                .setColor("#0099FF")
                .setTitle(`${cat.emoji} ${cat.titulo}`)
                .setDescription(cat.descricao)
                .addFields({
                    name: "Comandos",
                    value: lista
                });
        };

        const rowMenu = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId("help_personagem").setLabel("Personagem").setEmoji("👤").setStyle(ButtonStyle.Primary),

            new ButtonBuilder().setCustomId("help_contrato").setLabel("Contrato").setEmoji("🛡️").setStyle(ButtonStyle.Primary),

            new ButtonBuilder().setCustomId("help_sistemas").setLabel("Sistemas").setEmoji("⚒️").setStyle(ButtonStyle.Primary),

            new ButtonBuilder().setCustomId("help_atividades").setLabel("Atividades").setEmoji("🎲").setStyle(ButtonStyle.Primary),

            new ButtonBuilder().setCustomId("help_mestre").setLabel("Mestre").setEmoji("👑").setStyle(ButtonStyle.Primary)

        );

        const rowVoltar = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("help_menu")
                .setLabel("⬅ Voltar")
                .setStyle(ButtonStyle.Secondary)

        );

        const msg = await message.reply({
            embeds: [criarEmbedMenu()],
            components: [rowMenu]
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });

        collector.on("collect", async i => {

            if (i.customId === "help_menu") {
                return i.update({
                    embeds: [criarEmbedMenu()],
                    components: [rowMenu]
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

    }

};