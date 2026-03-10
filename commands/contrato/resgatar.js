const {
    SlashCommandBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const ContratoService = require("../../services/ContratoService.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resgatar")
        .setDescription("Resgata recompensas e pontos de missões concluídas."),

    async execute({ interaction, getPersonagemAtivo, CUSTO_NIVEL }) {
        const char = await getPersonagemAtivo(interaction.user.id);
        if (!char) return interaction.reply({ content: "🚫 Sem personagem ativo.", flags: MessageFlags.Ephemeral });

        const pendentes = await prisma.inscricoes.findMany({
            where: {
                personagem_id: char.id,
                selecionado: true,
                recompensa_resgatada: false,
                missao: { status: "CONCLUIDA" }
            },
            include: { missao: true }
        });

        if (pendentes.length === 0) {
            return interaction.reply({
                content: "🚫 Você não tem recompensas pendentes.",
                flags: MessageFlags.Ephemeral
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId("menu_resgate")
            .setPlaceholder("Selecione a missão para resgatar");

        pendentes.forEach(insc => {
            menu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${insc.missao.nome} (ND ${insc.missao.nd})`)
                    .setDescription(`Recompensa estimada: K$ ${insc.missao.nd * 100}`)
                    .setValue(`${insc.id}_${insc.missao.nd}`)
            );
        });

        const msg = await interaction.reply({
            content: "💰 **Recompensas Disponíveis:**",
            components: [new ActionRowBuilder().addComponents(menu)],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async i => {
            const [inscId, nd] = i.values[0].split("_").map(Number);

            const modal = new ModalBuilder()
                .setCustomId(`mod_resgate_${inscId}`)
                .setTitle("Relatório da Missão")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("pontos")
                            .setLabel("Pontos de Missão ganhos?")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder("Ex: 1 ou 1.5")
                            .setRequired(true)
                    )
                );

            await i.showModal(modal);

            const sub = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
            if (!sub) return;

            const pontosGanhos = parseFloat(sub.fields.getTextInputValue("pontos").replace(",", "."));
            if (isNaN(pontosGanhos) || pontosGanhos < 0) {
                return sub.reply({ content: "🚫 Valor inválido.", flags: MessageFlags.Ephemeral });
            }

            try {
                const charAtual = await getPersonagemAtivo(interaction.user.id);

                const resultado = await ContratoService.processarResgateMissao(
                    charAtual,
                    inscId,
                    nd,
                    pontosGanhos,
                    CUSTO_NIVEL
                );

                let msgFinal = `✅ **Resgate Concluído!**\n💰 **Kwanzas:** +K$ ${resultado.ouroGanho}\n📈 **Pontos:** +${pontosGanhos} (Total: ${resultado.novosPontos})`;
                if (resultado.niveisGanhos > 0)
                    msgFinal += `\n⏫ **LEVEL UP!** Você agora é nível **${resultado.novoNivel}**!`;

                await sub.update({ content: msgFinal, components: [] });
            } catch (err) {
                console.error(err);
                await sub.reply({ content: "❌ Erro ao processar resgate.", flags: MessageFlags.Ephemeral });
            }
        });
    }
};
