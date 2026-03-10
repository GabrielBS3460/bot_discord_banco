const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const PersonagemService = require("../../services/PersonagemService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("personagem")
        .setDescription("Gerencia seus personagens.")
        .addSubcommand(sub => sub.setName("listar").setDescription("Lista todos os seus personagens criados."))
        .addSubcommand(sub =>
            sub
                .setName("trocar")
                .setDescription("Troca o seu personagem ativo.")
                .addStringOption(opt =>
                    opt.setName("nome").setDescription("Nome exato do personagem que deseja ativar").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("apagar")
                .setDescription("Apaga permanentemente um personagem seu.")
                .addStringOption(opt =>
                    opt.setName("nome").setDescription("Nome exato do personagem a ser apagado").setRequired(true)
                )
        ),

    async execute({ interaction, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();

        const rotas = {
            listar: this.executarListar,
            trocar: this.executarTrocar,
            apagar: this.executarApagar
        };

        try {
            if (rotas[subcomando]) {
                await rotas[subcomando](interaction, formatarMoeda);
            }
        } catch (err) {
            this.lidarComErro(interaction, err);
        }
    },

    async executarListar(interaction, formatarMoeda) {
        const listaFormatada = await PersonagemService.listarPersonagens(interaction.user.id, formatarMoeda);

        const embed = new EmbedBuilder()
            .setColor("#9B59B6")
            .setTitle("📜 Seus Personagens")
            .setDescription(listaFormatada);

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },

    async executarTrocar(interaction) {
        const nomeAlvo = interaction.options.getString("nome").trim();
        const personagemAlvo = await PersonagemService.trocarPersonagemAtivo(interaction.user.id, nomeAlvo);

        return interaction.reply({ content: `🔄 Você agora está jogando como **${personagemAlvo.nome}**!` });
    },

    async executarApagar(interaction) {
        const nomeAlvo = interaction.options.getString("nome").trim();

        const personagemAlvo = await PersonagemService.prepararApagar(interaction.user.id, nomeAlvo);

        const confirmacaoEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle(`⚠️ Confirmação de Exclusão`)
            .setDescription(`Você tem certeza que deseja apagar o personagem **${personagemAlvo.nome}**?`)
            .addFields({
                name: "Consequências",
                value: "Todo o histórico, saldo e itens deste personagem serão apagados permanentemente."
            })
            .setFooter({ text: "Esta confirmação expira em 30 segundos." });

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("confirmar_apagar").setLabel("Sim, apagar").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("cancelar_apagar").setLabel("Cancelar").setStyle(ButtonStyle.Secondary)
        );

        const mensagemConfirmacao = await interaction.reply({
            embeds: [confirmacaoEmbed],
            components: [botoes],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        const collector = mensagemConfirmacao.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000,
            max: 1
        });

        collector.on("collect", async iBtn => {
            if (iBtn.customId === "confirmar_apagar") {
                await PersonagemService.confirmarApagar(interaction.user.id, personagemAlvo.id);

                const sucessoEmbed = new EmbedBuilder()
                    .setColor("#808080")
                    .setTitle("🗑️ Personagem Apagado")
                    .setDescription(`O personagem **${personagemAlvo.nome}** foi removido.`);

                await iBtn.update({ embeds: [sucessoEmbed], components: [] });
            } else {
                await iBtn.update({ content: "Ação cancelada.", embeds: [], components: [] });
            }
        });

        collector.on("end", async collected => {
            if (collected.size === 0) {
                await interaction
                    .editReply({ content: "⏱️ Confirmação expirada.", embeds: [], components: [] })
                    .catch(() => {});
            }
        });
    },

    async lidarComErro(interaction, err) {
        let msg = "❌ Ocorreu um erro ao executar este comando.";

        if (err.message === "NENHUM_PERSONAGEM") msg = "🚫 Você não tem personagens. Use `/cadastrar`.";
        if (err.message === "PERSONAGEM_NAO_ENCONTRADO") msg = "🚫 Você não possui um personagem com esse nome.";

        const erroPayload = { content: msg, flags: MessageFlags.Ephemeral, embeds: [], components: [] };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(erroPayload).catch(() => {});
        } else {
            await interaction.reply(erroPayload).catch(() => {});
        }
    }
};
