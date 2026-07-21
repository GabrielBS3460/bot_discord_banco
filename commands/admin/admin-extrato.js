const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");
const TransacaoRepository = require("../../repositories/TransacaoRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-extrato")
        .setDescription("Consulta o extrato de movimentações de outro jogador com paginação e escolha de PJ.")
        .addUserOption(option =>
            option.setName("jogador").setDescription("O jogador que você deseja investigar").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("personagem").setDescription("Nome ou filtro do personagem").setRequired(false)
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda, ID_CARGO_ADMIN, ID_CARGO_MOD, ID_CARGO_CORRETOR }) {
        const eAdmin = interaction.member.roles.cache.has(ID_CARGO_ADMIN);
        const eMod = interaction.member.roles.cache.has(ID_CARGO_MOD);
        const eCorretor = interaction.member.roles.cache.has(ID_CARGO_CORRETOR);

        if (!eAdmin && !eMod && !eCorretor) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando administrativo.",
                flags: MessageFlags.Ephemeral
            });
        }

        const alvo = interaction.options.getUser("jogador");
        const filtroNome = interaction.options.getString("personagem");

        if (alvo.bot) {
            return interaction.reply({
                content: "🚫 Bots não possuem saldo ou extrato.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const todosPersonagens = await PersonagemRepository.buscarTodosDoJogador(alvo.id);

            if (todosPersonagens.length === 0) {
                return interaction.editReply(`🚫 O usuário **${alvo.username}** não possui nenhum personagem cadastrado.`);
            }

            let charAlvo = null;

            if (filtroNome) {
                charAlvo = todosPersonagens.find(p => p.nome.toLowerCase().includes(filtroNome.toLowerCase()));
            }

            if (!charAlvo) {
                charAlvo = await getPersonagemAtivo(alvo.id);
            }

            if (!charAlvo && todosPersonagens.length === 1) {
                charAlvo = todosPersonagens[0];
            }

            if (!charAlvo) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`menu_admin_extrato_pj_${interaction.id}`)
                    .setPlaceholder(`Selecione qual personagem de ${alvo.username} consultar...`);

                todosPersonagens.forEach(p => {
                    menu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(p.nome)
                            .setDescription(`Saldo: ${formatarMoeda(p.saldo)}`)
                            .setValue(p.id.toString())
                    );
                });

                const replySel = await interaction.editReply({
                    content: `🕵️ **Personagens de ${alvo.username}:** Selecione um na lista para carregar o extrato:`,
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
                    await this.renderizarExtratoPaginado(interaction, alvo, charAlvo, formatarMoeda);
                });
                return;
            }

            await this.renderizarExtratoPaginado(interaction, alvo, charAlvo, formatarMoeda);
        } catch (err) {
            console.error("Erro no admin-extrato:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao investigar o extrato.", flags: MessageFlags.Ephemeral };
            interaction.replied ? await interaction.followUp(erroMsg) : await interaction.reply(erroMsg);
        }
    },

    async renderizarExtratoPaginado(interaction, alvoUser, char, formatarMoeda) {
        const LIMITE = 10;
        const total = await TransacaoRepository.contarTransacoes(char.id);
        const totalPaginas = Math.ceil(total / LIMITE) || 1;
        let paginaAtual = 1;

        const gerarEmbed = async (pag) => {
            const transacoes = await TransacaoRepository.buscarTransacoesPaginadas(char.id, pag, LIMITE);

            const embed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle(`🕵️ Extrato Administrativo`)
                .setDescription(
                    `**Personagem:** ${char.nome}\n` +
                    `**Dono:** ${alvoUser.username}\n` +
                    `💰 **Saldo Atual:** ${formatarMoeda(char.saldo)}\n\n` +
                    `Página **${pag} / ${totalPaginas}** (${total} movimentações)`
                )
                .setFooter({ text: `Solicitado por ${interaction.user.username}` })
                .setTimestamp();

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
                embed.addFields({ name: "Histórico", value: "Nenhuma transação registrada para este personagem." });
            }

            return embed;
        };

        const gerarBotoes = (pag) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`adm_ext_prev_${interaction.id}`)
                    .setLabel("◀️ Anterior")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pag === 1),
                new ButtonBuilder()
                    .setCustomId(`adm_ext_info_${interaction.id}`)
                    .setLabel(`${pag} / ${totalPaginas}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`adm_ext_next_${interaction.id}`)
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
            if (iBtn.customId.startsWith("adm_ext_prev_")) paginaAtual = Math.max(1, paginaAtual - 1);
            if (iBtn.customId.startsWith("adm_ext_next_")) paginaAtual = Math.min(totalPaginas, paginaAtual + 1);

            const novoEmbed = await gerarEmbed(paginaAtual);
            await iBtn.update({ embeds: [novoEmbed], components: [gerarBotoes(paginaAtual)] });
        });
    }
};
