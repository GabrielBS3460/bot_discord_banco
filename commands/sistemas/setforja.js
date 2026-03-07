module.exports = {

    name: "setforja",

    async execute({ message, args, prisma, getPersonagemAtivo }) {

        const poderesFabricacao = parseInt(args[0]);

        if (isNaN(poderesFabricacao) || poderesFabricacao < 0) {
            return message.reply(
                "⚠️ **Uso correto:** `!setforja <quantidade_de_poderes_de_fabricacao>`\n" +
                "Exemplo: `!setforja 1`"
            ).catch(()=>{});
        }

        try {

            const char = await getPersonagemAtivo(message.author.id);

            if (!char)
                return message.reply("🚫 Você não tem um personagem ativo.").catch(()=>{});

            const pericias = char.pericias || [];

            const OFICIOS_VALIDOS = [
                "Ofício Armeiro",
                "Ofício Artesão",
                "Ofício Alquimista",
                "Ofício Cozinheiro",
                "Ofício Alfaiate",
                "Ofício Escriba",
                "Ofício Tatuador"
            ];

            const oficiosTreinados = pericias.filter(p =>
                OFICIOS_VALIDOS.includes(p)
            );

            const quantidadeOficios = oficiosTreinados.length;

            const limiteForja = (poderesFabricacao + 1) * quantidadeOficios * 2;

            await prisma.personagens.update({
                where: { id: char.id },
                data: {
                    pontos_forja_max: limiteForja
                }
            });

            const oficiosTexto =
                quantidadeOficios > 0
                    ? oficiosTreinados.join(", ")
                    : "Nenhum";

            await message.reply(
                `⚒️ **Configuração de Forja Atualizada!**\n\n` +
                `👤 **Personagem:** ${char.nome}\n` +
                `⚙️ **Poderes de Fabricação:** ${poderesFabricacao}\n` +
                `🛠️ **Ofícios Válidos (${quantidadeOficios}):** ${oficiosTexto}\n\n` +
                `🔥 **Seu ganho base de Pontos de Forja agora é:** \`${limiteForja}\` pts.\n` +
                `*Use \`!resgatarforja\` para encher seus pontos diariamente.*`
            ).catch(()=>{});

        } catch (err) {

            console.error("Erro no comando setforja:", err);

            message.reply(
                "❌ Ocorreu um erro ao salvar seu limite de forja."
            ).catch(()=>{});
        }

    }

};