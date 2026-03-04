module.exports = {

    name: "apostar",

    async execute({
        message,
        prisma,
        getPersonagemAtivo,
        BICHOS_T20
    }) {

        const char = await getPersonagemAtivo(message.author.id);

        if (!char)
            return message.reply("Você não tem personagem ativo.");

        const args = message.content.split(" ").slice(1);

        if (args.length < 4) {
            return message.reply(
                "Use: `!apostar <valor> <dezena/centena/milhar> <numero> <1-5 ou todas>`"
            );
        }

        const valor = parseFloat(args[0]);
        const tipo = args[1].toUpperCase();
        let numero = args[2];
        const posicaoInput = args[3].toLowerCase();

        if (isNaN(valor) || valor <= 0)
            return message.reply("Valor inválido.");

        if (char.saldo < valor)
            return message.reply("Saldo insuficiente.");

        if (!/^\d+$/.test(numero))
            return message.reply("Número inválido.");

        if (tipo === "DEZENA") {

            if (numero.length > 2)
                return message.reply(
                    "Para Dezena use apenas 2 dígitos (00-99)."
                );

            numero = numero.padStart(2, "0");

            if (!BICHOS_T20[numero])
                return message.reply("Bicho inválido (00-99).");

        }
        else if (tipo === "CENTENA") {

            if (numero.length > 3)
                return message.reply(
                    "Para Centena use até 3 dígitos."
                );

            numero = numero.padStart(3, "0");

        }
        else if (tipo === "MILHAR") {

            if (numero.length > 4)
                return message.reply(
                    "Para Milhar use até 4 dígitos."
                );

            numero = numero.padStart(4, "0");

        }
        else {

            return message.reply(
                "Tipo inválido. Use: DEZENA, CENTENA ou MILHAR."
            );

        }

        let posicaoBanco = "";

        if (["1","2","3","4","5"].includes(posicaoInput)) {
            posicaoBanco = posicaoInput;
        }
        else if (["todas","todos","1-5"].includes(posicaoInput)) {
            posicaoBanco = "TODAS";
        }
        else {
            return message.reply(
                "Posição inválida. Use um número de 1 a 5 ou 'todas'."
            );
        }

        await prisma.$transaction([

            prisma.personagens.update({
                where: { id: char.id },
                data: { saldo: { decrement: valor } }
            }),

            prisma.apostasBicho.create({
                data: {
                    personagem_id: char.id,
                    tipo: tipo,
                    numero: numero,
                    posicao: posicaoBanco,
                    valor: valor,
                    status: "PENDENTE"
                }
            }),

            prisma.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Jogo do Bicho: ${tipo} ${numero}`,
                    valor: valor,
                    tipo: "GASTO"
                }
            })

        ]);

        const nomeBicho =
            tipo === "DEZENA"
                ? `(${BICHOS_T20[numero]})`
                : "";

        return message.reply(

            `🎫 **Aposta Registrada!**\n` +
            `💰 Valor: K$ ${valor}\n` +
            `🎲 Jogo: ${tipo} **${numero}** ${nomeBicho}\n` +
            `📍 Posição: ${
                posicaoBanco === "TODAS"
                    ? "1º ao 5º"
                    : posicaoBanco + "º prêmio"
            }`

        );

    }

};