const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("drop")
        .setDescription("Gera um drop de recompensa baseado no Nível de Desafio (ND).")
        .addIntegerOption(option => 
            option.setName("nd")
                .setDescription("O Nível de Desafio (ND) do drop")
                .setRequired(true)
                .setMinValue(1) 
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, gerarRecompensa }) {
        try {
            const nd = interaction.options.getInteger("nd");

            const resultado = gerarRecompensa(nd);

            if (!resultado) {
                return interaction.reply({ 
                    content: "❌ Erro ao gerar recompensa.", 
                    ephemeral: true 
                });
            }

            let footerTexto = "Sistema de Recompensa T20 JDA";
            let corEmbed = "#9B59B6";

            if (resultado.valor && resultado.valor > 0) {
                const char = await getPersonagemAtivo(interaction.user.id);

                if (char) {
                    await prisma.$transaction([
                        prisma.personagens.update({
                            where: { id: char.id },
                            data: {
                                saldo: { increment: resultado.valor }
                            }
                        }),
                        prisma.transacao.create({
                            data: {
                                personagem_id: char.id,
                                descricao: `Drop ND ${nd}`,
                                valor: resultado.valor,
                                tipo: "GANHO"
                            }
                        })
                    ]);

                    footerTexto = `✅ K$ ${resultado.valor} creditados para ${char.nome}`;
                    corEmbed = "#F1C40F";
                } else {
                    footerTexto = "⚠️ Nenhum personagem ativo para receber o dinheiro.";
                }
            }

            const embed = new EmbedBuilder()
                .setColor(corEmbed)
                .setTitle(`🎁 Drop Gerado (ND ${nd})`)
                .setDescription(resultado.mensagem || "Nenhum item encontrado.")
                .setFooter({ text: footerTexto });

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando drop:", err);
            
            const erroMsg = { content: "❌ Ocorreu um erro ao gerar o drop.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};