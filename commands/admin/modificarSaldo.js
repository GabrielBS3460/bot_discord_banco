const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "modificar-saldo",

    async execute({
        message,
        args,
        prisma,
        getPersonagemAtivo,
        formatarMoeda,
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

        const valor = parseFloat(args.find(a => !isNaN(parseFloat(a))));
        const motivo = args.slice(2).join(" ") || "Modificação administrativa";

        if (!alvo || isNaN(valor)) {
            return message.reply(
                "Sintaxe: `!modificar-saldo <@usuario> <valor> [motivo]`"
            );
        }

        try {

            const personagemAlvo = await getPersonagemAtivo(alvo.id);

            if (!personagemAlvo) {
                return message.reply(
                    `O usuário **${alvo.username}** não tem personagem ativo.`
                );
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
                        value: `${personagemAlvo.nome} (@${alvo.username})`,
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

                .setFooter({
                    text: `Modificado por ${message.author.username}`
                })

                .setTimestamp();

            return message.reply({ embeds: [embed] });

        }
        catch (err) {

            console.error("Erro no modificar-saldo:", err);

            return message.reply("❌ Erro ao modificar saldo.");

        }

    }

};