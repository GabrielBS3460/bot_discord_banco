const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const prisma = require("../../database.js");

function calcularLimiteNarrador(nivel) {
    switch (nivel) {
        case 1:
            return 0;
        case 2:
            return 2;
        case 3:
            return 4;
        case 4:
            return 4;
        default:
            return nivel > 3 ? Math.pow(2, nivel - 1) : 0;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-nivel-narrador")
        .setDescription("[ADMIN/MOD] Altera ou define o nível de narrador de um Mestre.")
        .addUserOption(option =>
            option
                .setName("mestre")
                .setDescription("O Mestre que terá o nível alterado")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("operacao")
                .setDescription("Tipo de alteração")
                .setRequired(true)
                .addChoices(
                    { name: "✏️ Definir Exato", value: "SET" },
                    { name: "➕ Aumentar/Subir", value: "ADD" },
                    { name: "➖ Diminuir/Reduzir", value: "REM" }
                )
        )
        .addIntegerOption(option =>
            option
                .setName("nivel")
                .setDescription("Nível ou quantidade de níveis (ex: 2)")
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) ||
            interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 **Acesso Negado:** Apenas Administradores e Moderadores podem alterar o nível de narrador.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const targetUser = interaction.options.getUser("mestre");
            const operacao = interaction.options.getString("operacao");
            const valor = interaction.options.getInteger("nivel");

            if (targetUser.bot) {
                return interaction.editReply({ content: "🚫 Bots não podem ser narradores." });
            }

            const usuarioAtual = await prisma.usuarios.findUnique({
                where: { discord_id: targetUser.id }
            });

            const nivelAntigo = usuarioAtual ? usuarioAtual.nivel_narrador : 1;
            let novoNivel = nivelAntigo;

            if (operacao === "SET") {
                novoNivel = valor;
            } else if (operacao === "ADD") {
                novoNivel = nivelAntigo + valor;
            } else if (operacao === "REM") {
                novoNivel = Math.max(1, nivelAntigo - valor);
            }

            await prisma.usuarios.upsert({
                where: { discord_id: targetUser.id },
                update: { nivel_narrador: novoNivel },
                create: { discord_id: targetUser.id, nivel_narrador: novoNivel }
            });

            const limiteAntigo = calcularLimiteNarrador(nivelAntigo);
            const novoLimite = calcularLimiteNarrador(novoNivel);

            const embed = new EmbedBuilder()
                .setTitle("🧙‍♂️ Nível de Narrador Atualizado")
                .setColor("#5865F2")
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: "Mestre", value: `${targetUser}`, inline: true },
                    { name: "Operação", value: operacao === "SET" ? "Definir" : operacao === "ADD" ? "Aumentar" : "Reduzir", inline: true },
                    { name: "Nível", value: `${nivelAntigo} ➔ **${novoNivel}**`, inline: true },
                    { name: "Limite Mensal de Missões", value: `${limiteAntigo} ➔ **${novoLimite} missões**`, inline: false }
                )
                .setFooter({ text: `Alterado por ${interaction.user.username}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error("Erro no comando admin-nivel-narrador:", err);
            return interaction.editReply({ content: "❌ Ocorreu um erro ao atualizar o nível do narrador." });
        }
    }
};
