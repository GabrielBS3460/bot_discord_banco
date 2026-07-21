const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-premiar-comunidade")
        .setDescription("Entrega uma quantidade de dinheiro para todos os personagens ativos.")
        .addNumberOption(opt => opt.setName("quantidade").setDescription("Valor em Kwanzas (K$) para cada um").setRequired(true).setMinValue(0.01))
        .addStringOption(opt => opt.setName("descricao").setDescription("Motivo da premiação").setRequired(true)),

    async execute({ interaction, formatarMoeda, ID_CARGO_ADMIN }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN)) {
            return interaction.reply({ content: "🚫 Apenas Administradores podem executar ações em massa.", flags: MessageFlags.Ephemeral });
        }

        const quantidade = interaction.options.getNumber("quantidade");
        const descricao = interaction.options.getString("descricao");

        const usuariosComAtivo = await prisma.usuarios.findMany({
            where: { personagem_ativo_id: { not: null } },
            include: { personagemAtivo: true }
        });

        const numPersonagens = usuariosComAtivo.length;
        if (numPersonagens === 0) {
            return interaction.reply({ content: "🚫 Nenhum personagem ativo encontrado.", flags: MessageFlags.Ephemeral });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor("#F1C40F")
            .setTitle("Ação em Massa!")
            .setDescription(`**TEM CERTEZA QUE QUER ENTREGAR ${formatarMoeda(quantidade)} PARA TODOS OS ${numPersonagens} PERSONAGENS ATIVOS DA COMUNIDADE?**\n\n*Motivo:* ${descricao}`);

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`conf_prem_com_${interaction.id}`).setLabel("CONFIRMAR").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`canc_prem_com_${interaction.id}`).setLabel("CANCELAR").setStyle(ButtonStyle.Danger)
        );

        const replyMsg = await interaction.reply({
            embeds: [confirmEmbed],
            components: [botoes],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        const collector = replyMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on("collect", async iBtn => {
            await iBtn.deferUpdate();

            if (iBtn.customId.startsWith("canc_prem_com_")) {
                await iBtn.editReply({ content: "❌ Ação cancelada.", embeds: [], components: [] });
                return collector.stop();
            }

            const pIds = usuariosComAtivo.map(u => u.personagemAtivo.id);

            await prisma.$transaction([
                prisma.personagens.updateMany({
                    where: { id: { in: pIds } },
                    data: { saldo: { increment: quantidade } }
                }),
                ...pIds.map(pId =>
                    prisma.transacao.create({
                        data: {
                            personagem_id: pId,
                            descricao: `[PREMIAÇÃO COMUNIDADE] ${descricao}`,
                            valor: quantidade,
                            tipo: "RECOMPENSA"
                        }
                    })
                )
            ]);

            const publicEmbed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("🎁 PRESENTE ENTREGUE PARA A COMUNIDADE")
                .setDescription(
                    `Todos os personagens ativos recebem\n\n` +
                    `**QUANTIDADE DE DINHEIRO:** ${formatarMoeda(quantidade)}\n\n` +
                    `> **Descrição:** ${descricao}`
                )
                .setFooter({ text: `Feito por ${interaction.user.username} · ${new Date().toLocaleString("pt-BR")}` });

            await interaction.channel.send({ content: "@everyone", embeds: [publicEmbed] });

            await iBtn.editReply({
                content: `✅ Premiação de **${formatarMoeda(quantidade)}** entregue com sucesso para **${numPersonagens}** personagens!`,
                embeds: [],
                components: []
            });

            collector.stop();
        });
    }
};
