const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-punir-comunidade")
        .setDescription("Retira uma quantidade de dinheiro de todos os personagens ativos.")
        .addNumberOption(opt => opt.setName("quantidade").setDescription("Valor em Kwanzas (K$) a retirar de cada um").setRequired(true).setMinValue(0.01))
        .addStringOption(opt => opt.setName("descricao").setDescription("Motivo da punição").setRequired(true)),

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
            .setColor("#E74C3C")
            .setTitle("Ação em Massa!")
            .setDescription(`**TEM CERTEZA QUE QUER RETIRAR ${formatarMoeda(quantidade)} DE TODOS OS ${numPersonagens} PERSONAGENS ATIVOS DA COMUNIDADE?**\n\n*Motivo:* ${descricao}`);

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`conf_pun_com_${interaction.id}`).setLabel("CONFIRMAR").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`canc_pun_com_${interaction.id}`).setLabel("CANCELAR").setStyle(ButtonStyle.Danger)
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

            if (iBtn.customId.startsWith("canc_pun_com_")) {
                await iBtn.editReply({ content: "❌ Ação cancelada.", embeds: [], components: [] });
                return collector.stop();
            }

            const pIds = usuariosComAtivo.map(u => u.personagemAtivo.id);

            await prisma.$transaction([
                prisma.personagens.updateMany({
                    where: { id: { in: pIds } },
                    data: { saldo: { decrement: quantidade } }
                }),
                ...pIds.map(pId =>
                    prisma.transacao.create({
                        data: {
                            personagem_id: pId,
                            descricao: `[PUNIÇÃO COMUNIDADE] ${descricao}`,
                            valor: quantidade,
                            tipo: "GASTO"
                        }
                    })
                )
            ]);

            const publicEmbed = new EmbedBuilder()
                .setColor("#E74C3C")
                .setTitle("⬇️ PUNIÇÃO APLICADA PARA A COMUNIDADE")
                .setDescription(
                    `Todos os personagens ativos perdem\n\n` +
                    `**QUANTIDADE DE DINHEIROS:** ${formatarMoeda(quantidade)}\n\n` +
                    `> **Descrição Adicionada ao ato (Explicação do pq):** ${descricao}`
                )
                .setFooter({ text: `Feito por ${interaction.user.username} · ${new Date().toLocaleString("pt-BR")}` });

            await interaction.channel.send({ content: "@everyone", embeds: [publicEmbed] });

            await iBtn.editReply({
                content: `✅ Punição de **${formatarMoeda(quantidade)}** aplicada com sucesso para **${numPersonagens}** personagens!`,
                embeds: [],
                components: []
            });

            collector.stop();
        });
    }
};
