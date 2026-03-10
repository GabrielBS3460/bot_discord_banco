const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-criar")
        .setDescription("Cria um personagem para um jogador (Apenas Admins/Mods).")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que receberá o personagem").setRequired(true)
        )
        .addStringOption(option => option.setName("nome").setDescription("O nome do personagem").setRequired(true)),

    async execute({ interaction, prisma, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        if (!interaction.member.roles.cache.has(ID_CARGO_ADMIN) && !interaction.member.roles.cache.has(ID_CARGO_MOD)) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        const alvo = interaction.options.getUser("jogador");
        const nomePersonagem = interaction.options.getString("nome");

        if (alvo.bot) {
            return interaction.reply({
                content: "🚫 Bots não podem possuir personagens.",
                ephemeral: true
            });
        }

        try {
            const resultado = await prisma.$transaction(async tx => {
                await tx.usuarios.upsert({
                    where: { discord_id: alvo.id },
                    update: {},
                    create: { discord_id: alvo.id }
                });

                const contagem = await tx.personagens.count({
                    where: { usuario_id: alvo.id }
                });

                if (contagem >= 3) {
                    throw new Error("LIMITE_PERSONAGENS");
                }

                const novoPersonagem = await tx.personagens.create({
                    data: {
                        nome: nomePersonagem,
                        usuario_id: alvo.id,
                        saldo: 0
                    }
                });

                let statusMsg = "Criado com sucesso.";

                if (contagem === 0) {
                    await tx.usuarios.update({
                        where: { discord_id: alvo.id },
                        data: { personagem_ativo_id: novoPersonagem.id }
                    });

                    statusMsg = "Criado e definido como **ATIVO** automaticamente.";
                }

                return { novoPersonagem, statusMsg };
            });

            const embed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle("👤 Personagem Criado (Admin)")
                .setDescription(`O administrador **${interaction.user.username}** criou um personagem para ${alvo}.`)
                .addFields(
                    {
                        name: "Nome do Personagem",
                        value: resultado.novoPersonagem.nome,
                        inline: true
                    },
                    {
                        name: "Jogador",
                        value: alvo.username,
                        inline: true
                    },
                    {
                        name: "Status",
                        value: resultado.statusMsg
                    }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            if (err.message === "LIMITE_PERSONAGENS") {
                return interaction.reply({
                    content: `⚠️ O usuário **${alvo.username}** já atingiu o limite de **2 personagens**.`,
                    ephemeral: true
                });
            }

            if (err.code === "P2002") {
                return interaction.reply({
                    content: `❌ O nome **"${nomePersonagem}"** já está em uso no servidor.`,
                    ephemeral: true
                });
            }

            console.error("Erro no admin-criar:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao criar o personagem.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
