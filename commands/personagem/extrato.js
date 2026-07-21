const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");
const TransacaoRepository = require("../../repositories/TransacaoRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("extrato")
        .setDescription("Consulta o extrato de movimentações do seu personagem com paginação.")
        .addStringOption(opt =>
            opt.setName("personagem")
                .setDescription("Nome do personagem (opcional)")
                .setRequired(false)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const filtroNome = interaction.options.getString("personagem");
            const todosPersonagens = await PersonagemRepository.buscarTodosDoJogador(interaction.user.id);

            if (todosPersonagens.length === 0) {
                return interaction.editReply("🚫 Você não possui nenhum personagem cadastrado.");
            }

            let charAlvo = null;

            if (filtroNome) {
                charAlvo = todosPersonagens.find(p => p.nome.toLowerCase().includes(filtroNome.toLowerCase()));
            }

            if (!charAlvo) {
                charAlvo = await getPersonagemAtivo(interaction.user.id);
            }

            if (!charAlvo && todosPersonagens.length === 1) {
                charAlvo = todosPersonagens[0];
            }

            if (!charAlvo) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`menu_extrato_pj_${interaction.id}`)
                    .setPlaceholder("Selecione para qual personagem deseja ver o extrato...");

                todosPersonagens.forEach(p => {
                    menu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(p.nome)
                            .setDescription(`Saldo: ${formatarMoeda(p.saldo)}`)
                            .setValue(p.id.toString())
                    );
                });

                const replySel = await interaction.editReply({
                    content: "📊 Selecione o personagem para visualizar o extrato:",
                    components: [new ActionRowBuilder().addComponents(menu)],
                    fetchReply: true
                });

                const selCollector = replySel.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                selCollector.on("collect", async iMenu => {
                    await iMenu.deferUpdate();
                    const pId = parseInt(iMenu.values[0]);
                    charAlvo = todosPersonagens.find(p => p.id === pId);
                    selCollector.stop();
                    await this.renderizarExtratoPaginado(interaction, charAlvo, formatarMoeda);
                });
                return;
            }

            await this.renderizarExtratoPaginado(interaction, charAlvo, formatarMoeda);
        } catch (err) {
            console.error("Erro no comando extrato:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao buscar seu extrato.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    },

    async renderizarExtratoPaginado(interaction, char, formatarMoeda) {
        const LIMITE = 10;
        const total = await TransacaoRepository.contarTransacoes(char.id);
        const totalPaginas = Math.ceil(total / LIMITE) || 1;
        let paginaAtual = 1;

        const gerarEmbed = async (pag) => {
            const transacoes = await TransacaoRepository.buscarTransacoesPaginadas(char.id, pag, LIMITE);

            const embed = new EmbedBuilder()
                .setColor("#1ABC9C")
                .setTitle(`📊 Extrato de ${char.nome}`)
                .setDescription(`💰 **Saldo Atual:** ${formatarMoeda(char.saldo)}\n\nPage **${pag} / ${totalPaginas}** (${total} movimentações no total)`);

            if (transacoes.length > 0) {
                const lista = transacoes.map(t => {
                    let icone = "🔹";
                    if (t.tipo === "GASTO") icone = "🔴";
                    if (["RECOMPENSA", "GANHO", "VENDA"].includes(t.tipo)) icone = "🟢";
                    if (t.tipo === "COMPRA") icone = "💸";

                    const dataFormatada = new Date(t.data).toLocaleDateString("pt-BR");
                    const sinal = (t.tipo === "GASTO" || t.tipo === "COMPRA") ? "-" : "+";
                    return `\`#${t.id}\` \`${dataFormatada}\` ${icone} **${sinal}${formatarMoeda(t.valor)}**\n╰ *${t.descricao}*`;
                }).join("\n");

                embed.addFields({ name: "Movimentações", value: lista });
            } else {
                embed.addFields({ name: "Histórico", value: "Nenhuma transação registrada." });
            }

            return embed;
        };

        const gerarBotoes = (pag) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ext_prev_${interaction.id}`)
                    .setLabel("◀️ Anterior")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pag === 1),
                new ButtonBuilder()
                    .setCustomId(`ext_info_${interaction.id}`)
                    .setLabel(`${pag} / ${totalPaginas}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`ext_next_${interaction.id}`)
                    .setLabel("Próximo ▶️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pag === totalPaginas)
            );
        };

        const embedInicial = await gerarEmbed(paginaAtual);
        const replyMsg = await interaction.editReply({
            content: null,
            embeds: [embedInicial],
            components: totalPaginas > 1 ? [gerarBotoes(paginaAtual)] : []
        });

        if (totalPaginas <= 1) return;

        const collector = replyMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 120000
        });

        collector.on("collect", async iBtn => {
            if (iBtn.customId.startsWith("ext_prev_")) paginaAtual = Math.max(1, paginaAtual - 1);
            if (iBtn.customId.startsWith("ext_next_")) paginaAtual = Math.min(totalPaginas, paginaAtual + 1);

            const novoEmbed = await gerarEmbed(paginaAtual);
            await iBtn.update({ embeds: [novoEmbed], components: [gerarBotoes(paginaAtual)] });
        });
    }
};
