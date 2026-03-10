const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setforja")
        .setDescription("Configura o seu limite e ganho diário de pontos de forja.")
        .addIntegerOption(option =>
            option
                .setName("poderes")
                .setDescription("Quantidade de poderes de fabricação que você possui")
                .setRequired(true)
                .setMinValue(0)
        ),

    async execute({ interaction, prisma, getPersonagemAtivo }) {
        const poderesFabricacao = interaction.options.getInteger("poderes");

        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    ephemeral: true
                });
            }

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

            const oficiosTreinados = pericias.filter(p => OFICIOS_VALIDOS.includes(p));
            const quantidadeOficios = oficiosTreinados.length;

            const limiteForja = (poderesFabricacao + 1) * quantidadeOficios * 2;

            await prisma.personagens.update({
                where: { id: char.id },
                data: {
                    pontos_forja_max: limiteForja
                }
            });

            const oficiosTexto = quantidadeOficios > 0 ? oficiosTreinados.join(", ") : "Nenhum";

            await interaction.reply({
                content:
                    `⚒️ **Configuração de Forja Atualizada!**\n\n` +
                    `👤 **Personagem:** ${char.nome}\n` +
                    `⚙️ **Poderes de Fabricação:** ${poderesFabricacao}\n` +
                    `🛠️ **Ofícios Válidos (${quantidadeOficios}):** ${oficiosTexto}\n\n` +
                    `🔥 **Seu ganho base de Pontos de Forja agora é:** \`${limiteForja}\` pts.\n` +
                    `*Use \`/resgatarforja\` para encher seus pontos diariamente.*`
            });
        } catch (err) {
            console.error("Erro no comando setforja:", err);

            const erroMsg = { content: "❌ Ocorreu um erro ao salvar seu limite de forja.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
