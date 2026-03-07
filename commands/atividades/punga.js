const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("punga")
        .setDescription("Tenta roubar um alvo NPC.")
        .addStringOption(option => 
            option.setName("alvo")
                .setDescription("O que você deseja tentar roubar?")
                .setRequired(true)
                .addChoices(
                    { name: "💰 Dinheiro", value: "Dinheiro" },
                    { name: "🎁 Item", value: "Item" }
                )
        )
        .addIntegerOption(option => 
            option.setName("nd")
                .setDescription("O Nível de Desafio (ND) do alvo (1 a 20)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(20)
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, PungaSystem }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({ 
                    content: "🚫 Você precisa de um personagem ativo para pungar.", 
                    ephemeral: true 
                });
            }

            const tipo = interaction.options.getString("alvo");
            const nd = interaction.options.getInteger("nd");

            let resultado = "";

            if (tipo === "Dinheiro") {
                const valor = PungaSystem.processarDinheiro(nd);

                await prisma.$transaction([
                    prisma.personagens.update({
                        where: { id: char.id },
                        data: { saldo: { increment: valor } }
                    }),
                    prisma.transacao.create({
                        data: {
                            personagem_id: char.id,
                            descricao: `Punga (Alvo ND ${nd})`,
                            valor: valor,
                            tipo: "GANHO"
                        }
                    })
                ]);

                const charAtualizado = await getPersonagemAtivo(interaction.user.id);

                resultado = `💰 Você pungou **K$ ${valor}**!\n✅ *Valor depositado na conta.*\n💰 **Saldo Atual:** K$ ${charAtualizado.saldo}`;

            } else { 
                const item = PungaSystem.processarPunga(nd);
                resultado = `🎁 Você pungou: **${item}**`;
            }

            await interaction.reply({
                content: `🥷 **Punga Realizada por ${char.nome}**\n✅ **Resultado (Alvo ND ${nd}):**\n${resultado}`
            });

        } catch (err) {
            console.error("Erro no comando punga:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao processar a punga.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};