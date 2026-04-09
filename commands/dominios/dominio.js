const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const DominioService = require("../../services/DominioService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dominio")
        .setDescription("Gerencia o seu domínio e terras.")
        .addSubcommand(sub =>
            sub
                .setName("fundar")
                .setDescription(`Funda um novo domínio de nível 1. Custo: T$ 5.000`)
                .addStringOption(opt => opt.setName("nome").setDescription("O nome das suas terras").setRequired(true))
                .addStringOption(opt =>
                    opt
                        .setName("terreno")
                        .setDescription("O tipo de terreno principal")
                        .setRequired(true)
                        .addChoices(
                            { name: "Planície", value: "Planície" },
                            { name: "Floresta", value: "Floresta" },
                            { name: "Montanha", value: "Montanha" },
                            { name: "Colinas", value: "Colinas" },
                            { name: "Pântano", value: "Pântano" },
                            { name: "Deserto", value: "Deserto" },
                            { name: "Subterrâneo", value: "Subterrâneo" },
                            { name: "Rio ou Mar", value: "Rio ou Mar" },
                            { name: "Elemento Místico", value: "Elemento Místico" }
                        )
                )
                .addBooleanOption(opt =>
                    opt
                        .setName("mistico")
                        .setDescription("É um domínio místico? (Apenas para conjuradores)")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("painel")
                .setDescription("Abre o painel de controle interativo do seu domínio.")
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        const subcomando = interaction.options.getSubcommand();
        const char = await getPersonagemAtivo(interaction.user.id);

        if (!char) {
            return interaction.reply({ content: "🚫 Você não tem um personagem ativo.", flags: MessageFlags.Ephemeral });
        }

        if (subcomando === "fundar") {
            await interaction.deferReply();

            const nome = interaction.options.getString("nome");
            const terreno = interaction.options.getString("terreno");
            const mistico = interaction.options.getBoolean("mistico");

            try {
                await DominioService.fundarDominio(char, nome, terreno, mistico);

                const embed = new EmbedBuilder()
                    .setColor(mistico ? "#9B59B6" : "#2ECC71")
                    .setTitle("🏰 Novo Domínio Fundado!")
                    .setDescription(`**${char.nome}** reivindicou terras virgens e estabeleceu um novo centro de poder.`)
                    .addFields(
                        { name: "Nome do Domínio", value: nome, inline: true },
                        { name: "Terreno", value: terreno, inline: true },
                        { name: "Tipo", value: mistico ? "Místico ✨" : "Padrão 🛡️", inline: true },
                        { name: "Nível Inicial", value: "1", inline: true },
                        { name: "Custo Pago", value: "T$ 5.000", inline: true }
                    )
                    .setFooter({ text: "Use /dominio painel para gerenciar suas terras." });

                return interaction.editReply({ embeds: [embed] });

            } catch (err) {
                let msgErro = "❌ Ocorreu um erro ao fundar o domínio.";
                
                if (err.message === "SALDO_INSUFICIENTE") msgErro = "💸 Você precisa de **T$ 5.000** para fundar um domínio.";
                if (err.message === "JA_POSSUI_DOMINIO") msgErro = "🚫 Você já é regente de um domínio! Cada personagem só pode ter um.";
                if (err.message === "CLASSE_INVALIDA_MISTICO") msgErro = "🔮 Apenas Conjuradores (Arcanos ou Divinos) podem criar um Domínio Místico.";

                return interaction.editReply({ content: msgErro });
            }
        }

        else if (subcomando === "painel") {
            await interaction.deferReply();

            const dominio = await DominioService.buscarPainel(char.id);

            if (!dominio) {
                return interaction.editReply({ 
                    content: "🚫 Você ainda não é um regente. Use `/dominio fundar` para reivindicar suas terras." 
                });
            }

            // Cálculos básicos
            const maxConstrucoes = dominio.nivel * 3;
            const qtdConstrucoes = dominio.construcoes.length;
            const qtdTropas = dominio.tropas.reduce((acc, tropa) => acc + tropa.quantidade, 0);

            const embed = new EmbedBuilder()
                .setColor(dominio.mistico ? "#9B59B6" : "#F1C40F")
                .setTitle(`🏰 Domínio: ${dominio.nome}`)
                .setDescription(`*Regido por ${char.nome}*`)
                .addFields(
                    { name: "📊 Geral", value: `**Nível:** ${dominio.nivel}\n**Terreno:** ${dominio.terreno}\n**Tipo:** ${dominio.mistico ? "Místico ✨" : "Padrão 🛡️"}`, inline: true },
                    { name: "👑 Status Público", value: `**Corte:** ${dominio.corte}\n**Popularidade:** ${dominio.popularidade}`, inline: true },
                    { name: "💰 Economia", value: `**Tesouro:** ${dominio.tesouro_lo} LO\n*(1 LO = T$ 1.000)*`, inline: false },
                    { name: "⚙️ Administração", value: `**Ações:** ${dominio.acoes_disponiveis} / ${dominio.corte === "Rica" ? 3 : 2}\n*(Reseta mês que vem)*`, inline: true },
                    { name: "🏗️ Infra & Guerra", value: `**Construções:** ${qtdConstrucoes}/${maxConstrucoes}\n**Unidades Militares:** ${qtdTropas}`, inline: true }
                )
                .setFooter({ text: "Utilize os botões abaixo para gerenciar seu território." })
                .setTimestamp();

            const botoesRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dom_btn_acoes_${interaction.id}`)
                    .setLabel("Ações de Regente")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📜"),
                new ButtonBuilder()
                    .setCustomId(`dom_btn_construir_${interaction.id}`)
                    .setLabel("Construir")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("🏗️"),
                new ButtonBuilder()
                    .setCustomId(`dom_btn_exercito_${interaction.id}`)
                    .setLabel("Exército")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("⚔️"),
                new ButtonBuilder()
                    .setCustomId(`dom_btn_bonus_${interaction.id}`)
                    .setLabel("Meus Bônus")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("✨")
            );

            return interaction.editReply({ embeds: [embed], components: [botoesRow] });
        }
    }
};