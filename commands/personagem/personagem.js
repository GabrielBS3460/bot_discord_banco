const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags
} = require("discord.js");

const PersonagemService = require("../../services/PersonagemService.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("personagem")
        .setDescription("Gerencia seus personagens.")
        .addSubcommand(sub => sub.setName("listar").setDescription("Lista todos os seus personagens criados."))
        .addSubcommand(sub => sub.setName("trocar").setDescription("Troca o seu personagem ativo."))
        .addSubcommand(sub => sub.setName("apagar").setDescription("Apaga permanentemente um personagem seu.")),

    async execute({ interaction, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();

        const rotas = {
            listar: this.executarListar,
            trocar: this.executarTrocar,
            apagar: this.executarApagar
        };

        try {
            if (rotas[subcomando]) {
                await rotas[subcomando].call(this, interaction, formatarMoeda);
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
        const personagens = await PersonagemRepository.buscarTodosDoJogador(interaction.user.id);
        if (personagens.length === 0) throw new Error("NENHUM_PERSONAGEM");

        const menuTroca = new StringSelectMenuBuilder()
            .setCustomId(`menu_trocar_${interaction.id}`)
            .setPlaceholder("Selecione o personagem que deseja ativar...");

        personagens.forEach(p => {
            menuTroca.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(p.nome)
                    .setDescription(`Nível ${p.nivel_personagem || 1}`)
                    .setValue(p.nome)
            );
        });

        const msg = await interaction.reply({
            content: "🔄 Selecione na lista abaixo qual personagem você quer tornar ativo:",
            components: [new ActionRowBuilder().addComponents(menuTroca)],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on("collect", async iSelect => {
            try {
                const nomeAlvo = iSelect.values[0];
                const personagemAlvo = await PersonagemService.trocarPersonagemAtivo(interaction.user.id, nomeAlvo);

                await iSelect.update({
                    content: `✅ Você agora está jogando como **${personagemAlvo.nome}**!`,
                    components: []
                });
                collector.stop();
            } catch (err) {
                this.lidarComErro(iSelect, err);
                collector.stop();
            }
        });
    },

    async executarApagar(interaction) {
        const personagens = await PersonagemRepository.buscarTodosDoJogador(interaction.user.id);
        if (personagens.length === 0) throw new Error("NENHUM_PERSONAGEM");

        const menuApagar = new StringSelectMenuBuilder()
            .setCustomId(`menu_apagar_${interaction.id}`)
            .setPlaceholder("Selecione o personagem que deseja EXCLUIR...");

        personagens.forEach(p => {
            menuApagar.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(p.nome)
                    .setDescription(`Nível ${p.nivel_personagem || 1}`)
                    .setValue(p.nome)
            );
        });

        const msg = await interaction.reply({
            content: "🗑️ **CUIDADO!** Selecione abaixo qual personagem você quer **apagar permanentemente**:",
            components: [new ActionRowBuilder().addComponents(menuApagar)],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on("collect", async iAction => {
            try {
                if (iAction.isStringSelectMenu()) {
                    const nomeAlvo = iAction.values[0];
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
                        new ButtonBuilder()
                            .setCustomId(`conf_apagar_${personagemAlvo.id}`)
                            .setLabel("Sim, apagar")
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId("canc_apagar")
                            .setLabel("Cancelar")
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await iAction.update({
                        content: null,
                        embeds: [confirmacaoEmbed],
                        components: [botoes]
                    });
                } else if (iAction.isButton()) {
                    if (iAction.customId.startsWith("conf_apagar_")) {
                        const idApagar = parseInt(iAction.customId.replace("conf_apagar_", ""));
                        await PersonagemService.confirmarApagar(interaction.user.id, idApagar);

                        const sucessoEmbed = new EmbedBuilder()
                            .setColor("#808080")
                            .setTitle("🗑️ Personagem Apagado")
                            .setDescription(`O personagem foi removido permanentemente.`);

                        await iAction.update({ embeds: [sucessoEmbed], components: [] });
                        collector.stop();
                    } else if (iAction.customId === "canc_apagar") {
                        await iAction.update({ content: "✅ Ação de exclusão cancelada.", embeds: [], components: [] });
                        collector.stop();
                    }
                }
            } catch (err) {
                this.lidarComErro(iAction, err);
                collector.stop();
            }
        });

        collector.on("end", async collected => {
            if (collected.size === 0) {
                await interaction
                    .editReply({ content: "⏱️ Ação expirada por falta de resposta.", embeds: [], components: [] })
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
