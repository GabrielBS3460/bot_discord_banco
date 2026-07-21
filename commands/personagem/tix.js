const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tix")
        .setDescription("Transfere dinheiro (Kwanzas) do seu personagem para outro jogador.")
        .addUserOption(option =>
            option.setName("destinatario").setDescription("O jogador que vai receber o dinheiro").setRequired(true)
        )
        .addNumberOption(option =>
            option.setName("valor").setDescription("O valor que deseja transferir").setRequired(true).setMinValue(0.1)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const destinatarioUser = interaction.options.getUser("destinatario");
        const valor = interaction.options.getNumber("valor");

        if (destinatarioUser.bot) {
            return interaction.reply({
                content: "🚫 Você não pode enviar dinheiro para um bot.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (destinatarioUser.id === interaction.user.id) {
            return interaction.reply({
                content: "🚫 Você não pode transferir dinheiro para si mesmo. Use `/alt dinheiro`.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const charRemetente = await getPersonagemAtivo(interaction.user.id);
            if (!charRemetente) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo para enviar dinheiro.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const pjsDestinatario = await PersonagemRepository.buscarTodosDoJogador(destinatarioUser.id);
            if (!pjsDestinatario || pjsDestinatario.length === 0) {
                return interaction.reply({
                    content: `🚫 O usuário **${destinatarioUser.username}** não tem nenhum personagem.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            let charDestinatario = null;

            if (pjsDestinatario.length > 1) {
                const menuPj = new StringSelectMenuBuilder()
                    .setCustomId(`menu_tix_pj_${interaction.id}`)
                    .setPlaceholder(`Selecione para qual personagem de ${destinatarioUser.username} enviar...`);

                pjsDestinatario.forEach(p => {
                    menuPj.addOptions(new StringSelectMenuOptionBuilder().setLabel(p.nome).setValue(p.id.toString()));
                });

                const replySel = await interaction.reply({
                    content: `💸 **Selecione o destinatário:** Para qual personagem de **${destinatarioUser.username}** você deseja enviar ${formatarMoeda(valor)}?`,
                    components: [new ActionRowBuilder().addComponents(menuPj)],
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });

                const collector = replySel.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                const iSelect = await new Promise(resolve => {
                    collector.on("collect", i => resolve(i));
                    collector.on("end", () => resolve(null));
                });

                if (!iSelect) {
                    return interaction.editReply({ content: "⌛ Seleção expirada.", components: [] });
                }

                await iSelect.deferUpdate();
                const selectedId = parseInt(iSelect.values[0]);
                charDestinatario = pjsDestinatario.find(p => p.id === selectedId);
            } else {
                charDestinatario = pjsDestinatario[0];
            }

            await TransacaoService.transferirEntreJogadores(charRemetente, charDestinatario, valor);

            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("💸 Tix Realizado")
                .addFields(
                    { name: "Remetente", value: charRemetente.nome, inline: true },
                    { name: "Destinatário", value: charDestinatario.nome, inline: true },
                    { name: "Valor", value: `**${formatarMoeda(valor)}**`, inline: false }
                )
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: `✅ Transferência realizada com sucesso!`, components: [] });
                return interaction.channel.send({ content: `<@${destinatarioUser.id}>`, embeds: [embed] });
            }

            return interaction.reply({ content: `<@${destinatarioUser.id}>`, embeds: [embed] });
        } catch (err) {
            if (err.message === "SALDO_INSUFICIENTE") {
                const msgIns = `💸 Saldo insuficiente. O personagem possui apenas **${formatarMoeda(err.saldoAtual || 0)}**.`;
                return interaction.replied || interaction.deferred
                    ? interaction.editReply({ content: msgIns, components: [] })
                    : interaction.reply({ content: msgIns, flags: MessageFlags.Ephemeral });
            }

            console.error("Erro no comando tix:", err);
            const erroMsg = {
                content: "❌ Ocorreu um erro ao processar a transferência.",
                flags: MessageFlags.Ephemeral,
                components: []
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
