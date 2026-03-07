const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inscrever")
        .setDescription("Inscreve seu personagem em uma missão/contrato aberto.")
        .addStringOption(option => 
            option.setName("missao")
                .setDescription("Nome exato do contrato/missão que deseja participar")
                .setRequired(true)
        ),

    async execute({ interaction, prisma, getPersonagemAtivo }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({ 
                    content: "🚫 Você não tem um personagem ativo.", 
                    ephemeral: true 
                });
            }

            const nomeMissao = interaction.options.getString("missao");

            const missao = await prisma.missoes.findUnique({
                where: { nome: nomeMissao }
            });

            if (!missao) {
                return interaction.reply({ 
                    content: "🚫 Missão não encontrada. Verifique se o nome foi digitado corretamente.", 
                    ephemeral: true 
                });
            }

            if (missao.status !== "ABERTA") {
                return interaction.reply({ 
                    content: "🚫 Esta missão não está aceitando inscrições no momento.", 
                    ephemeral: true 
                });
            }

            const nivelMin = missao.nd - 2;
            const nivelMax = missao.nd + 2;

            if (char.nivel_personagem < nivelMin || char.nivel_personagem > nivelMax) {
                return interaction.reply({
                    content: `🚫 Nível incompatível! Seu nível (${char.nivel_personagem}) deve estar entre ${nivelMin} e ${nivelMax}.`,
                    ephemeral: true
                });
            }

            await prisma.inscricoes.create({
                data: {
                    missao_id: missao.id,
                    personagem_id: char.id
                }
            });

            await interaction.reply({
                content: `✅ **${char.nome}** se inscreveu na missão **${missao.nome}**!`
            });

        } catch (err) {
            if (err.code === "P2002") {
                return interaction.reply({
                    content: "⚠️ Você já está inscrito nesta missão.",
                    ephemeral: true
                });
            }

            if (err.message === "SEM_VAGAS") {
                return interaction.reply({
                    content: "🚫 Todas as vagas desta missão já foram preenchidas.",
                    ephemeral: true
                });
            }

            console.error("Erro no comando inscrever:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao se inscrever na missão.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};