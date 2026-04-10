const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

const PersonagemRepository = require("../../repositories/PersonagemRepository.js");
const { CUSTO_NIVEL } = require("../../data/geralData.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-modificar-pontos")
        .setDescription("[ADMIN] Adiciona, remove ou define XP/Pontos e ajusta o nível automaticamente.")
        .addUserOption(opt => opt.setName("jogador").setDescription("Dono do personagem").setRequired(true))
        .addStringOption(opt => opt.setName("nome").setDescription("Nome exato do personagem").setRequired(true))
        .addStringOption(opt =>
            opt
                .setName("operacao")
                .setDescription("O que você deseja fazer?")
                .setRequired(true)
                .addChoices(
                    { name: "➕ Adicionar", value: "ADD" },
                    { name: "➖ Remover", value: "REM" },
                    { name: "✏️ Definir Exato", value: "SET" }
                )
        )
        .addNumberOption(opt => opt.setName("valor").setDescription("Quantidade de pontos").setRequired(true)),

    async execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const alvoUser = interaction.options.getUser("jogador");
            const nomeChar = interaction.options.getString("nome");
            const operacao = interaction.options.getString("operacao");
            const valor = interaction.options.getNumber("valor");

            const char = await PersonagemRepository.buscarPorNomeEJogador(nomeChar, alvoUser.id);

            if (!char) {
                return interaction.editReply({
                    content: `🚫 Personagem **${nomeChar}** não encontrado para o jogador ${alvoUser}.`
                });
            }

            let novosPontos = parseFloat(char.pontos_missao) || 0;
            let novoNivel = char.nivel_personagem;

            const nivelAntigo = novoNivel;
            const pontosAntigos = novosPontos;

            if (operacao === "ADD") novosPontos += valor;
            if (operacao === "REM") novosPontos -= valor;
            if (operacao === "SET") novosPontos = valor;

            while (CUSTO_NIVEL[novoNivel] && novosPontos >= CUSTO_NIVEL[novoNivel]) {
                novosPontos -= CUSTO_NIVEL[novoNivel];
                novoNivel++;
            }

            while (novosPontos < 0 && novoNivel > 1) {
                novoNivel--;
                const custoNivelAnterior = CUSTO_NIVEL[novoNivel] || 10;
                novosPontos += custoNivelAnterior;
            }

            if (novosPontos < 0) novosPontos = 0;
            if (novoNivel < 1) novoNivel = 1;

            novosPontos = Math.round(novosPontos * 10) / 10;

            await PersonagemRepository.atualizar(char.id, {
                pontos_missao: novosPontos,
                nivel_personagem: novoNivel
            });

            let statusNivel = "";
            if (novoNivel > nivelAntigo)
                statusNivel = `🎉 **LEVEL UP!** Subiu do nível ${nivelAntigo} para ${novoNivel}!`;
            else if (novoNivel < nivelAntigo)
                statusNivel = `📉 **LEVEL DOWN!** Caiu do nível ${nivelAntigo} para ${novoNivel}.`;

            const embed = new EmbedBuilder()
                .setColor(operacao === "ADD" ? "#00FF00" : operacao === "REM" ? "#ED4245" : "#00AAFF")
                .setTitle("⚙️ Ajuste de Pontos e Nível")
                .setDescription(`A ficha de **${char.nome}** foi atualizada.`)
                .addFields(
                    {
                        name: "Operação",
                        value: `${operacao === "ADD" ? "Adicionado" : operacao === "REM" ? "Removido" : "Definido para"} ${valor} pts`,
                        inline: false
                    },
                    { name: "Antes", value: `Nvl ${nivelAntigo} (${pontosAntigos} pts)`, inline: true },
                    { name: "Depois", value: `Nvl ${novoNivel} (${novosPontos} pts)`, inline: true }
                )
                .setFooter({ text: `Alteração feita por ${interaction.user.username}` });

            await interaction.editReply({
                content: statusNivel || "✅ Alteração concluída sem mudança de nível.",
                embeds: [embed]
            });
        } catch (err) {
            console.error("Erro no admin-modificar-pontos:", err);
            await interaction.editReply({ content: "❌ Ocorreu um erro ao processar os pontos." });
        }
    }
};
