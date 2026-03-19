const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-excluir")
        .setDescription("[ADMIN] Exclui permanentemente o personagem de um jogador.")
        .addUserOption(opt => opt.setName("jogador").setDescription("O dono do personagem").setRequired(true))
        .addStringOption(opt =>
            opt.setName("nome").setDescription("O nome exato do personagem para confirmar a exclusão").setRequired(true)
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
            const nomeConfirmacao = interaction.options.getString("nome");

            const personagem = await prisma.personagens.findFirst({
                where: {
                    usuario_id: alvoUser.id,
                    nome: { equals: nomeConfirmacao, mode: "insensitive" }
                }
            });

            if (!personagem) {
                return interaction.editReply({
                    content: `🚫 Não encontrei um personagem chamado **${nomeConfirmacao}** pertencente a ${alvoUser.username}. Verifique se o nome está correto.`
                });
            }

            const embedAviso = new EmbedBuilder()
                .setTitle("⚠️ CONFIRMAÇÃO DE EXCLUSÃO")
                .setColor("#ED4245")
                .setDescription(
                    `Você está prestes a excluir permanentemente o personagem:\n\n**Nome:** ${personagem.nome}\n**Dono:** ${alvoUser}\n**Saldo:** K$ ${personagem.saldo}\n\n**Esta ação não pode ser desfeita e apagará todos os registros (Inscrições, Transações, Moradia).**`
                )
                .setFooter({ text: "Clique no botão abaixo para confirmar." });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_admin_del_${interaction.id}`)
                    .setLabel("DELETAR PERSONAGEM")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`cancel_admin_del_${interaction.id}`)
                    .setLabel("Cancelar")
                    .setStyle(ButtonStyle.Secondary)
            );

            const response = await interaction.editReply({
                embeds: [embedAviso],
                components: [row]
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 30000
            });

            collector.on("collect", async i => {
                if (i.customId.startsWith("cancel_admin_del_")) {
                    await i.update({ content: "✅ Exclusão cancelada.", embeds: [], components: [] });
                    return collector.stop();
                }

                if (i.customId.startsWith("confirm_admin_del_")) {
                    await i.deferUpdate();

                    await prisma.$transaction([
                        prisma.transacao.deleteMany({ where: { personagem_id: personagem.id } }),
                        prisma.inscricoes.deleteMany({ where: { personagem_id: personagem.id } }),
                        prisma.baseResidente.deleteMany({ where: { personagem_id: personagem.id } }),
                        prisma.base.deleteMany({ where: { dono_id: personagem.id } }),
                        prisma.personagens.delete({ where: { id: personagem.id } })
                    ]);

                    await interaction.channel.send({
                        content: `🗑️ **PERSONAGEM EXCLUÍDO:** O Administrador ${interaction.user} removeu o personagem **${personagem.nome}** (Dono: ${alvoUser}) do sistema.`
                    });

                    await interaction.editReply({
                        content: `✅ O personagem **${personagem.nome}** foi apagado com sucesso.`,
                        embeds: [],
                        components: []
                    });

                    return collector.stop();
                }
            });
        } catch (err) {
            console.error("Erro ao excluir personagem:", err);
            return interaction.editReply({ content: "❌ Ocorreu um erro ao tentar excluir o personagem." });
        }
    }
};
