const {
    SlashCommandBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("solicitada")
        .setDescription("Solicita um novo contrato personalizado (Máximo 4 por mês)."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const modalId = `modal_solicitada_${Date.now()}`;

        const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle("Solicitar Contrato")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("inp_titulo")
                        .setLabel("Adicione o Título da Solicitada")
                        .setPlaceholder("Ex: Caçada ao Dragão de Fogo")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("inp_custo")
                        .setLabel("Adicione o custo da Solicitada")
                        .setPlaceholder("Ex: 50 (Custo em Kwanzas K$)")
                        .setStyle(TextInputStyle.Short)
                        .setValue("0")
                        .setRequired(true)
                )
            );

        // Exibir o modal IMEDIATAMENTE (evita timeout de 3 segundos na interacao do Discord)
        try {
            await interaction.showModal(modal);
        } catch (err) {
            console.error("Erro ao exibir modal de solicitada:", err);
            return;
        }

        try {
            const submit = await interaction.awaitModalSubmit({
                filter: i => i.customId === modalId && i.user.id === interaction.user.id,
                time: 120000
            });

            // Deferir a resposta do submit IMEDIATAMENTE (garante 15 minutos para consultas ao DB)
            await submit.deferReply();

            const char = await getPersonagemAtivo(interaction.user.id);
            if (!char) {
                return submit.editReply({
                    content: "🚫 **Sem personagem ativo.** Use `/cadastrar` ou `/personagem trocar`."
                });
            }

            const agora = new Date();
            const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

            const consumidosNoMes = await prisma.transacao.count({
                where: {
                    personagem_id: char.id,
                    categoria: "CONTRATO_SOLICITADO",
                    data: { gte: inicioDoMes }
                }
            });

            const devolvidosNoMes = await prisma.transacao.count({
                where: {
                    personagem_id: char.id,
                    categoria: "CONTRATO_SOLICITADO_AJUSTE",
                    data: { gte: inicioDoMes }
                }
            });

            const solicitadasNoMes = Math.max(0, consumidosNoMes - devolvidosNoMes);
            const LIMITE_MENSAL = 4;

            if (solicitadasNoMes >= LIMITE_MENSAL) {
                return submit.editReply({
                    content:
                        `🚫 **Limite de Solicitadas Atingido!**\n` +
                        `Você já solicitou **${solicitadasNoMes}/${LIMITE_MENSAL}** contratos este mês.\n` +
                        `O seu limite será renovado no dia 1º do próximo mês.`
                });
            }

            const tituloSolicitada = submit.fields.getTextInputValue("inp_titulo").trim();
            const custoSolicitadaRaw = submit.fields.getTextInputValue("inp_custo").replace(",", ".").trim();
            const custoSolicitada = parseFloat(custoSolicitadaRaw);

            if (isNaN(custoSolicitada) || custoSolicitada < 0) {
                return submit.editReply({
                    content: "🚫 **Custo inválido!** Digite um valor numérico maior ou igual a zero."
                });
            }

            if (char.saldo < custoSolicitada) {
                return submit.editReply({
                    content:
                        `🚫 **Saldo insuficiente em Kwanzas!**\n` +
                        `Custo da solicitada: **${formatarMoeda(custoSolicitada)}**.\n` +
                        `Seu saldo atual: **${formatarMoeda(char.saldo)}**.`
                });
            }

            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: char.id },
                    data: { saldo: { decrement: custoSolicitada } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: char.id,
                        descricao: `Solicitou contrato: "${tituloSolicitada}"`,
                        valor: custoSolicitada,
                        tipo: "GASTO",
                        categoria: "CONTRATO_SOLICITADO"
                    }
                })
            ]);

            const novoSaldo = char.saldo - custoSolicitada;
            const novasSolicitadas = solicitadasNoMes + 1;
            const restantesFinais = LIMITE_MENSAL - novasSolicitadas;

            const embed = new EmbedBuilder()
                .setTitle("📜 Novo Contrato Solicitado!")
                .setColor("#3498DB")
                .setDescription(`👤 **Solicitante:** **${char.nome}** (${interaction.user})\n📜 **Título:** **${tituloSolicitada}**`)
                .addFields(
                    { name: "💰 Custo da Solicitada", value: `**-${formatarMoeda(custoSolicitada)}**`, inline: true },
                    { name: "📊 Solicitadas no Mês", value: `**${novasSolicitadas}/${LIMITE_MENSAL}** (${restantesFinais} restante(s))`, inline: true },
                    { name: "💰 Novo Saldo", value: `${formatarMoeda(novoSaldo)}`, inline: true }
                )
                .setTimestamp();

            await submit.editReply({ embeds: [embed] });
        } catch (err) {
            if (err.code === "InteractionCollectorError" || err.message?.includes("time")) {
                return;
            }
            console.error("Erro no processamento da solicitada:", err);
        }
    }
};
