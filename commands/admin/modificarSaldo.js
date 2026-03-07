const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("modificar-saldo")
        .setDescription("Adiciona ou remove saldo de um jogador (Apenas Admins/Mods).")
        .addUserOption(option => 
            option.setName("jogador")
                .setDescription("O jogador que terá o saldo modificado")
                .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName("valor")
                .setDescription("Valor a adicionar (positivo) ou remover (com sinal negativo, ex: -50)")
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("motivo")
                .setDescription("Motivo da modificação no extrato")
                .setRequired(false) 
        ),

    async execute({ interaction, prisma, getPersonagemAtivo, formatarMoeda, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        if (
            !interaction.member.roles.cache.has(ID_CARGO_ADMIN) &&
            !interaction.member.roles.cache.has(ID_CARGO_MOD)
        ) {
            return interaction.reply({ 
                content: "🚫 Você não tem permissão para usar este comando.", 
                ephemeral: true 
            });
        }

        const alvo = interaction.options.getUser("jogador");
        const valor = interaction.options.getNumber("valor");
        const motivo = interaction.options.getString("motivo") || "Modificação administrativa";

        if (alvo.bot) {
            return interaction.reply({ 
                content: "🚫 Bots não possuem saldo.", 
                ephemeral: true 
            });
        }

        try {
            const personagemAlvo = await getPersonagemAtivo(alvo.id);

            if (!personagemAlvo) {
                return interaction.reply({
                    content: `🚫 O usuário **${alvo.username}** não tem um personagem ativo.`,
                    ephemeral: true
                });
            }

            const resultado = await prisma.$transaction(async tx => {
                const personagemAtualizado = await tx.personagens.update({
                    where: { id: personagemAlvo.id },
                    data: {
                        saldo: { increment: valor }
                    }
                });

                await tx.transacao.create({
                    data: {
                        personagem_id: personagemAlvo.id,
                        descricao: motivo,
                        valor: valor,
                        tipo: valor >= 0 ? "RECOMPENSA" : "GASTO"
                    }
                });

                return personagemAtualizado;
            });

            const embed = new EmbedBuilder()
                .setColor("#FFA500")
                .setTitle("💰 Saldo Modificado")
                .addFields(
                    {
                        name: "Personagem",
                        value: `${personagemAlvo.nome} (<@${alvo.id}>)`,
                        inline: true
                    },
                    {
                        name: "Modificação",
                        value: `${valor >= 0 ? "+" : ""}${formatarMoeda(valor)}`,
                        inline: true
                    },
                    {
                        name: "Novo Saldo",
                        value: `**${formatarMoeda(resultado.saldo)}**`
                    },
                    {
                        name: "Motivo",
                        value: motivo
                    }
                )
                .setFooter({ text: `Modificado por ${interaction.user.username}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no modificar-saldo:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao modificar o saldo.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};