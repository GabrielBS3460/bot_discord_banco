const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-dominio")
        .setDescription("[ADMIN] Modifica as ações de domínio de um jogador.")
        .addUserOption(opt => opt.setName("jogador").setDescription("Dono do domínio").setRequired(true))
        .addStringOption(opt =>
            opt
                .setName("operacao")
                .setDescription("O que você deseja fazer?")
                .setRequired(true)
                .addChoices(
                    { name: "➕ Adicionar", value: "ADD" },
                    { name: "➖ Remover", value: "REM" },
                    { name: "✏️ Definir Exato", value: "SET" }
                )
        )
        .addIntegerOption(opt =>
            opt.setName("valor").setDescription("Quantidade de ações").setRequired(true).setMinValue(0)
        ),

    async execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const alvoUser = interaction.options.getUser("jogador");
            const operacao = interaction.options.getString("operacao");
            const valor = interaction.options.getInteger("valor");

            const personagem = await prisma.personagens.findFirst({
                where: { usuario_id: alvoUser.id },
                include: { dominio: true }
            });

            if (!personagem || !personagem.dominio) {
                return interaction.editReply({
                    content: `🚫 O jogador ${alvoUser} não possui um domínio fundado.`
                });
            }

            const acoesAntigas = personagem.dominio.acoes_disponiveis;
            let novasAcoes = acoesAntigas;

            if (operacao === "ADD") novasAcoes += valor;
            else if (operacao === "REM") novasAcoes = Math.max(0, novasAcoes - valor);
            else if (operacao === "SET") novasAcoes = valor;

            await prisma.dominio.update({
                where: { id: personagem.dominio.id },
                data: { acoes_disponiveis: novasAcoes }
            });

            const embed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle("🏰 Ajuste de Ações de Domínio")
                .setDescription(`As ações do domínio **${personagem.dominio.nome}** foram atualizadas.`)
                .addFields(
                    { name: "Mestre/Admin", value: interaction.user.username, inline: true },
                    { name: "Regente", value: personagem.nome, inline: true },
                    { name: "Ações Antigas", value: String(acoesAntigas), inline: true },
                    { name: "Ações Atuais", value: String(novasAcoes), inline: true }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no admin-dominio:", err);
            await interaction.editReply({ content: "❌ Ocorreu um erro ao processar as ações de domínio." });
        }
    }
};
