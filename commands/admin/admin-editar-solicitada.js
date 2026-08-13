const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-editar-solicitada")
        .setDescription("[ADMIN] Adiciona ou subtrai missões solicitadas de um jogador no mês atual.")
        .addUserOption(opt =>
            opt
                .setName("jogador")
                .setDescription("O jogador que terá as solicitadas alteradas")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt
                .setName("operacao")
                .setDescription("Escolha se deseja adicionar ou subtrair o limite")
                .setRequired(true)
                .addChoices(
                    { name: "➕ Adicionar (Dar +1 limite / Devolver uso)", value: "Adicionar" },
                    { name: "➖ Subtrair (Consumir -1 limite / Reduzir uso)", value: "Subtrair" }
                )
        )
        .addIntegerOption(opt =>
            opt
                .setName("quantidade")
                .setDescription("Quantidade de solicitadas a alterar (padrão: 1)")
                .setRequired(false)
                .setMinValue(1)
        ),

    async execute({ interaction, getPersonagemAtivo, ID_CARGO_ADMIN }) {
        const eAdmin = interaction.member?.roles?.cache?.has(ID_CARGO_ADMIN);
        if (!eAdmin) {
            return interaction.reply({
                content: "🚫 **Acesso Negado:** Apenas Administradores podem usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const targetUser = interaction.options.getUser("jogador");
            const operacao = interaction.options.getString("operacao");
            const quantidade = interaction.options.getInteger("quantidade") || 1;

            const char = await getPersonagemAtivo(targetUser.id);
            if (!char) {
                return interaction.editReply({
                    content: `🚫 **${targetUser.username}** não possui um personagem ativo.`
                });
            }

            const agora = new Date();
            const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

            const operacoesPrisma = [];
            for (let k = 0; k < quantidade; k++) {
                if (operacao === "Adicionar") {
                    operacoesPrisma.push(
                        prisma.transacao.create({
                            data: {
                                personagem_id: char.id,
                                descricao: `Admin (${interaction.user.tag}): Adicionou +1 solicitada disponível`,
                                valor: 0,
                                tipo: "GANHO",
                                categoria: "CONTRATO_SOLICITADO_AJUSTE"
                            }
                        })
                    );
                } else {
                    operacoesPrisma.push(
                        prisma.transacao.create({
                            data: {
                                personagem_id: char.id,
                                descricao: `Admin (${interaction.user.tag}): Subtraiu -1 solicitada disponível`,
                                valor: 0,
                                tipo: "GASTO",
                                categoria: "CONTRATO_SOLICITADO"
                            }
                        })
                    );
                }
            }

            await prisma.$transaction(operacoesPrisma);

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

            const solicitadasUsadas = Math.max(0, consumidosNoMes - devolvidosNoMes);
            const solicitadasRestantes = Math.max(0, 4 - solicitadasUsadas);

            const embed = new EmbedBuilder()
                .setTitle("🛠️ Ajuste de Solicitadas (Admin)")
                .setColor(operacao === "Adicionar" ? "#2ECC71" : "#E74C3C")
                .setDescription(`O limite de missões solicitadas de **${char.nome}** (${targetUser}) foi atualizado.`)
                .addFields(
                    { name: "👤 Personagem / Jogador", value: `**${char.nome}** (${targetUser})`, inline: true },
                    { name: "👑 Admin Responsável", value: `${interaction.user}`, inline: true },
                    { name: "⚙️ Operação Realizada", value: operacao === "Adicionar" ? "➕ Adicionar (+1 Limite)" : "➖ Subtrair (-1 Limite)", inline: true },
                    { name: "🔢 Quantidade Alterada", value: `**${quantidade}** solicitada(s)`, inline: true },
                    { name: "📊 Novo Status no Mês", value: `**${solicitadasUsadas}/4** utilizadas (Restantes: **${solicitadasRestantes}**)`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando admin-editar-solicitada:", err);
            await interaction.editReply({
                content: "🚨 Ocorreu um erro ao editar as solicitadas do jogador."
            });
        }
    }
};
