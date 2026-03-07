const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tix")
        .setDescription("Transfere dinheiro (Kwanzas) do seu personagem para outro jogador.")
        .addUserOption(option => 
            option.setName("destinatario")
                .setDescription("O jogador que vai receber o dinheiro")
                .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName("valor")
                .setDescription("O valor que deseja transferir")
                .setRequired(true)
                .setMinValue(0.1) 
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda }) {
        const destinatarioUser = interaction.options.getUser("destinatario");
        const valor = interaction.options.getNumber("valor");

        if (destinatarioUser.bot) {
            return interaction.reply({
                content: "🚫 Você não pode enviar dinheiro para um bot.",
                ephemeral: true
            });
        }

        if (destinatarioUser.id === interaction.user.id) {
            return interaction.reply({
                content: "🚫 Você não pode transferir dinheiro para si mesmo.",
                ephemeral: true
            });
        }

        try {
            const [charRemetente, charDestinatario] = await Promise.all([
                getPersonagemAtivo(interaction.user.id),
                getPersonagemAtivo(destinatarioUser.id)
            ]);

            if (!charRemetente) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo para enviar dinheiro. Use `/cadastrar` ou `/personagem trocar`.",
                    ephemeral: true
                });
            }

            if (!charDestinatario) {
                return interaction.reply({
                    content: `🚫 O usuário **${destinatarioUser.username}** não tem um personagem ativo para receber.`,
                    ephemeral: true
                });
            }

            if (charRemetente.saldo < valor) {
                return interaction.reply({
                    content: `💸 **${charRemetente.nome}** não tem saldo suficiente. Atual: **${formatarMoeda(charRemetente.saldo)}**.`,
                    ephemeral: true
                });
            }

            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: charRemetente.id },
                    data: { saldo: { decrement: valor } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: charRemetente.id,
                        descricao: `Transferiu para ${charDestinatario.nome}`,
                        valor: valor,
                        tipo: 'GASTO'
                    }
                }),
                prisma.personagens.update({
                    where: { id: charDestinatario.id },
                    data: { saldo: { increment: valor } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: charDestinatario.id,
                        descricao: `Recebeu de ${charRemetente.nome}`,
                        valor: valor,
                        tipo: 'RECOMPENSA' 
                    }
                })
            ]);

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('💸 Tix Realizado')
                .addFields(
                    { name: 'Remetente', value: charRemetente.nome, inline: true },
                    { name: 'Destinatário', value: charDestinatario.nome, inline: true },
                    { name: 'Valor', value: `**${formatarMoeda(valor)}**`, inline: false }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando tix:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao processar a transferência.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};