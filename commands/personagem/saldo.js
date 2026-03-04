module.exports = {

    name: "saldo",

    async execute({ message, getPersonagemAtivo, formatarMoeda }) {

        try {

            const personagem = await getPersonagemAtivo(message.author.id);

            if (!personagem) {
                return message.reply(
                    "Você não tem um personagem ativo. Use `!cadastrar` ou `!personagem trocar`."
                ).catch(()=>{});
            }

            const embed = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("💰 Saldo do Personagem")
                .setDescription(`**${personagem.nome}** possui ${formatarMoeda(personagem.saldo)}`);

            return message.reply({ embeds: [embed] });

        } catch (err) {

            console.error("Erro no saldo:", err);

            return message.reply("Erro ao buscar saldo.").catch(()=>{});

        }

    }

};