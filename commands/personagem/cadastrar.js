const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cadastrar")
        .setDescription("Cadastra um novo personagem no sistema.")
        .addStringOption(option => 
            option.setName("nome")
                .setDescription("O nome do seu personagem")
                .setRequired(true)
        ),

    async execute({ interaction, prisma }) {
        const nomePersonagem = interaction.options.getString("nome");

        try {
            await prisma.usuarios.upsert({
                where: { discord_id: interaction.user.id },
                update: {},
                create: { discord_id: interaction.user.id }
            });

            const contagem = await prisma.personagens.count({
                where: { usuario_id: interaction.user.id }
            });

            if (contagem >= 3) {
                return interaction.reply({
                    content: "🚫 Você já atingiu o limite de 3 personagens!",
                    ephemeral: true 
                });
            }

            const novoPersonagem = await prisma.personagens.create({
                data: {
                    nome: nomePersonagem,
                    usuario_id: interaction.user.id,
                    saldo: 0
                }
            });

            if (contagem === 0) {
                await prisma.usuarios.update({
                    where: { discord_id: interaction.user.id },
                    data: { personagem_ativo_id: novoPersonagem.id }
                });

                return interaction.reply({
                    content: `✅ Personagem **${novoPersonagem.nome}** criado e selecionado como ativo!`
                });

            } else {
                return interaction.reply({
                    content: `✅ Personagem **${novoPersonagem.nome}** criado! Use \`/personagem trocar\` para jogar com ele.`
                });
            }

        } catch (err) {
            if (err.code === 'P2002') {
                return interaction.reply({
                    content: "⚠️ Já existe um personagem com este nome no servidor. Por favor, escolha outro.",
                    ephemeral: true
                });
            }

            console.error("Erro ao cadastrar:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao criar o personagem.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};