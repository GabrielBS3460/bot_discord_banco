const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "admin-criar",

    async execute({
        message,
        args,
        prisma,
        ID_CARGO_ADMIN,
        ID_CARGO_MOD
    }) {

        if (
            !message.member.roles.cache.has(ID_CARGO_ADMIN) &&
            !message.member.roles.cache.has(ID_CARGO_MOD)
        ) {
            return message.reply("🚫 Você não tem permissão para usar este comando.");
        }

        const alvo = message.mentions.users.first();

        const nomePersonagem = args
            .filter(arg => !arg.includes("<@"))
            .join(" ")
            .trim();

        if (!alvo || !nomePersonagem) {
            return message.reply(
                "Sintaxe incorreta!\n`!admin-criar <@jogador> <nome do personagem>`"
            );
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

                if (contagem >= 2) {
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

                .setDescription(
                    `O administrador **${message.author.username}** criou um personagem para ${alvo}.`
                )

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

            return message.reply({ embeds: [embed] });

        }
        catch (err) {

            if (err.message === "LIMITE_PERSONAGENS") {

                return message.reply(
                    `⚠️ O usuário **${alvo.username}** já atingiu o limite de **2 personagens**.`
                );

            }

            if (err.code === "P2002") {

                return message.reply(
                    `❌ O nome **"${nomePersonagem}"** já está em uso.`
                );

            }

            console.error("Erro no admin-criar:", err);

            return message.reply(
                "❌ Ocorreu um erro ao criar o personagem."
            );

        }

    }

};