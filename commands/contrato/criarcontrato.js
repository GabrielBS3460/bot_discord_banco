module.exports = {

    name: "criarcontrato",

    async execute({ message, prisma }) {

        try {

            const regex = /"([^"]+)"\s+(\d+)\s+(\d+)/;
            const match = message.content.match(regex);

            if (!match) {
                return message.reply(
                    'Sintaxe incorreta. Use: `!criarcontrato "Nome do Contrato" <ND> <Vagas>`\n' +
                    'Ex: `!criarcontrato "Resgate na Floresta" 2 4`'
                ).catch(()=>{});
            }

            const nomeMissao = match[1];
            const nd = parseInt(match[2]);
            const vagas = parseInt(match[3]);

            if (isNaN(nd) || nd <= 0) {
                return message.reply("ND inválido.").catch(()=>{});
            }

            if (isNaN(vagas) || vagas <= 0) {
                return message.reply("Número de vagas inválido.").catch(()=>{});
            }

            await prisma.missoes.create({
                data: {
                    nome: nomeMissao,
                    nd: nd,
                    vagas: vagas,
                    criador_id: message.author.id,
                    status: "ABERTA"
                }
            });

            await message.reply(
                `✅ **Contrato Criado!**\n` +
                `📜 **${nomeMissao}** (ND ${nd})\n` +
                `👥 Vagas: ${vagas}\n\n` +
                `Jogadores, usem \`!inscrever "${nomeMissao}"\` para participar!`
            ).catch(()=>{});

        }
        catch (err) {

            if (err.code === "P2002") {
                return message.reply(
                    "Já existe um contrato com esse nome."
                ).catch(()=>{});
            }

            console.error("Erro no comando criarcontrato:", err);

            message.reply(
                "Erro ao criar contrato."
            ).catch(()=>{});

        }

    }

};