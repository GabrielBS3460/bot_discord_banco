const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const TransacaoService = require("../../services/TransacaoService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("modificar-saldo")
        .setDescription("Adiciona ou remove saldo de um jogador (Apenas Admins/Mods).")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que terá o saldo modificado").setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName("valor")
                .setDescription("Valor a adicionar (positivo) ou remover (negativo)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("motivo").setDescription("Motivo da modificação no extrato").setRequired(false)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        /*const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }*/

        const alvo = interaction.options.getUser("jogador");
        const valor = interaction.options.getNumber("valor");
        const motivo = interaction.options.getString("motivo") || "Modificação administrativa";

        if (alvo.bot) {
            return interaction.reply({ content: "🚫 Bots não possuem saldo.", flags: MessageFlags.Ephemeral });
        }

        try {
            const personagemAlvo = await getPersonagemAtivo(alvo.id);

            if (!personagemAlvo) {
                return interaction.reply({
                    content: `🚫 O usuário **${alvo.username}** não tem um personagem ativo.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const resultado = await TransacaoService.modificarSaldoAdministrativo(personagemAlvo.id, valor, motivo);

            const embed = new EmbedBuilder()
                .setColor(valor >= 0 ? "#57F287" : "#ED4245")
                .setTitle("💰 Saldo Modificado (Admin)")
                .addFields(
                    {
                        name: "Personagem",
                        value: `${personagemAlvo.nome} (<@${alvo.id}>)`,
                        inline: true
                    },
                    {
                        name: "Modificação",
                        value: `${valor >= 0 ? "📈" : "📉"} ${valor >= 0 ? "+" : ""}${formatarMoeda(valor)}`,
                        inline: true
                    },
                    {
                        name: "Novo Saldo",
                        value: `**${formatarMoeda(resultado.saldo)}**`
                    },
                    {
                        name: "Motivo",
                        value: motivo
                    }
                )
                .setFooter({ text: `Modificado por ${interaction.user.username}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no modificar-saldo:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao modificar o saldo.", flags: MessageFlags.Ephemeral };

            interaction.replied ? await interaction.followUp(erroMsg) : await interaction.reply(erroMsg);
        }
    }
};
