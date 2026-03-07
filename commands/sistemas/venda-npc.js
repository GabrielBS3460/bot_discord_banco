const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("venda-npc")
        .setDescription("Vende um item para um comerciante NPC e recebe Kwanzas.")
        .addNumberOption(option => 
            option.setName("valor")
                .setDescription("Valor da venda (ex: 50 ou 50.5)")
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("link")
                .setDescription("Link do item que está sendo vendido")
                .setRequired(true)
        ),

    async execute({
        interaction, 
        prisma,
        getPersonagemAtivo,
        formatarMoeda
    }) {
        const valor = interaction.options.getNumber("valor");
        const linkItem = interaction.options.getString("link");

        const char = await getPersonagemAtivo(interaction.user.id);

        if (!char) {
            return interaction.reply({ content: "🚫 Você não tem personagem ativo.", ephemeral: true });
        }

        if (!linkItem.startsWith("http")) {
            return interaction.reply({ content: "🚫 Você precisa enviar um link válido do item.", ephemeral: true });
        }

        try {
            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: char.id },
                    data: { saldo: { increment: valor } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: char.id,
                        descricao: `Venda para NPC`,
                        valor: valor,
                        tipo: "GANHO"
                    }
                })
            ]);

            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("💰 Venda para NPC")
                .addFields(
                    { name: "Personagem", value: char.nome, inline: true },
                    { name: "Valor Recebido", value: formatarMoeda(valor), inline: true },
                    { name: "Item Vendido", value: linkItem }
                )
                .setFooter({ text: "O item foi vendido para um comerciante NPC." })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando venda-npc:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao registrar a venda.", ephemeral: true });
        }
    }
};