const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

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
            const [charRemetente, charDestinatario] = await Promise.all([
                getPersonagemAtivo(interaction.user.id),
                getPersonagemAtivo(destinatarioUser.id)
            ]);

            if (!charRemetente) {
                return interaction.reply({
                    content:
                        "🚫 Você não tem um personagem ativo para enviar dinheiro. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!charDestinatario) {
                return interaction.reply({
                    content: `🚫 O usuário **${destinatarioUser.username}** não tem um personagem ativo para receber.`,
                    flags: MessageFlags.Ephemeral
                });
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

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            if (err.message === "SALDO_INSUFICIENTE") {
                return interaction.reply({
                    content: `💸 Saldo insuficiente. O personagem possui apenas **${formatarMoeda(err.saldoAtual || 0)}**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            console.error("Erro no comando tix:", err);
            const erroMsg = {
                content: "❌ Ocorreu um erro ao processar a transferência.",
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
