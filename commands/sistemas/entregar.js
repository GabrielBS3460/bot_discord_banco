const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const TransacaoService = require("../../services/TransacaoService.js");
const ItensRepository = require("../../repositories/ItensRepository.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("entregar")
        .setDescription("Entrega um item do seu inventário para outro personagem.")
        .addUserOption(option =>
            option.setName("destinatario").setDescription("O jogador que vai receber o item").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("filtro").setDescription("Filtrar itens pelo nome").setRequired(false)
        ),

    async execute({ interaction, getPersonagemAtivo }) {
        try {
            const destinatarioUser = interaction.options.getUser("destinatario");
            const filtro = interaction.options.getString("filtro");

            if (destinatarioUser.bot) {
                return interaction.reply({
                    content: "🚫 Você não pode entregar itens para um bot.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (destinatarioUser.id === interaction.user.id) {
                return interaction.reply({
                    content: "🚫 Você não pode entregar itens para si mesmo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const charRemetente = await getPersonagemAtivo(interaction.user.id);
            if (!charRemetente) {
                return interaction.reply({
                    content: "🚫 Você não tem um personagem ativo.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const pjsDestinatario = await PersonagemRepository.buscarTodosDoJogador(destinatarioUser.id);
            if (!pjsDestinatario || pjsDestinatario.length === 0) {
                return interaction.reply({
                    content: `🚫 O usuário **${destinatarioUser.username}** não tem nenhum personagem.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            let charDestinatario = null;

            if (pjsDestinatario.length > 1) {
                const menuPj = new StringSelectMenuBuilder()
                    .setCustomId(`menu_entregar_pj_${interaction.id}`)
                    .setPlaceholder(`Selecione para qual personagem de ${destinatarioUser.username} entregar...`);

                pjsDestinatario.forEach(p => {
                    menuPj.addOptions(new StringSelectMenuOptionBuilder().setLabel(p.nome).setValue(p.id.toString()));
                });

                const replySel = await interaction.reply({
                    content: `📦 **Selecione o destinatário:** Para qual personagem de **${destinatarioUser.username}** você deseja entregar o item?`,
                    components: [new ActionRowBuilder().addComponents(menuPj)],
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });

                const selCollector = replySel.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });

                const iSelect = await new Promise(resolve => {
                    selCollector.on("collect", i => resolve(i));
                    selCollector.on("end", () => resolve(null));
                });

                if (!iSelect) {
                    return interaction.editReply({ content: "⌛ Seleção expirada.", components: [] });
                }

                await iSelect.deferUpdate();
                const selectedId = parseInt(iSelect.values[0]);
                charDestinatario = pjsDestinatario.find(p => p.id === selectedId);
            } else {
                charDestinatario = pjsDestinatario[0];
            }

            let inventario = await ItensRepository.buscarInventario(charRemetente.id);

            if (!inventario || inventario.length === 0) {
                const msgVazio = "🎒 Seu inventário está vazio. Não há nada para entregar.";
                return interaction.replied || interaction.deferred
                    ? interaction.editReply({ content: msgVazio, components: [] })
                    : interaction.reply({ content: msgVazio, flags: MessageFlags.Ephemeral });
            }

            if (filtro) {
                const termo = filtro.toLowerCase();
                inventario = inventario.filter(i => i.nome.toLowerCase().includes(termo));

                if (inventario.length === 0) {
                    const msgFiltro = `🎒 Nenhum item encontrado com o filtro **"${filtro}"**.`;
                    return interaction.replied || interaction.deferred
                        ? interaction.editReply({ content: msgFiltro, components: [] })
                        : interaction.reply({ content: msgFiltro, flags: MessageFlags.Ephemeral });
                }
            }

            const menuItens = new StringSelectMenuBuilder()
                .setCustomId(`menu_entregar_item_${interaction.id}`)
                .setPlaceholder("Selecione o item que deseja entregar...");

            const itensMenu = inventario.slice(0, 25);
            itensMenu.forEach(item => {
                const sulfixo = ` (Qtd: ${item.quantidade})`;
                let nomeSeguro = item.nome;

                if (nomeSeguro.length + sulfixo.length > 100) {
                    nomeSeguro = nomeSeguro.substring(0, 100 - sulfixo.length - 3) + "...";
                }

                menuItens.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${nomeSeguro}${sulfixo}`)
                        .setDescription(`Tipo: ${item.tipo}`)
                        .setValue(item.id.toString())
                );
            });

            const rowMenu = new ActionRowBuilder().addComponents(menuItens);

            const payloadMenu = {
                content: `📦 **Transferência de Itens**\nSelecione o item da sua mochila que deseja entregar para **${charDestinatario.nome}**:`,
                components: [rowMenu],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            };

            const msg = interaction.replied || interaction.deferred
                ? await interaction.editReply(payloadMenu)
                : await interaction.reply(payloadMenu);

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async i => {
                if (i.isStringSelectMenu() && i.customId.startsWith("menu_entregar_item_")) {
                    const itemId = parseInt(i.values[0]);
                    const itemSelecionado = inventario.find(item => item.id === itemId);

                    if (!itemSelecionado)
                        return i.reply({ content: "Item não encontrado.", flags: MessageFlags.Ephemeral });

                    const modalId = `modal_qtd_entregar_${i.id}`;
                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle("Quantidade para Entrega")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_qtd")
                                    .setLabel(`Quantidade (Máx: ${itemSelecionado.quantidade})`)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("1")
                                    .setRequired(true)
                            )
                        );

                    await i.showModal(modal);

                    try {
                        const submit = await i.awaitModalSubmit({
                            filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                            time: 60000
                        });

                        await submit.deferReply({ flags: MessageFlags.Ephemeral });

                        let qtd = parseInt(submit.fields.getTextInputValue("inp_qtd"));

                        if (isNaN(qtd) || qtd <= 0) {
                            return submit.editReply("🚫 Quantidade inválida.");
                        }

                        if (qtd > itemSelecionado.quantidade) {
                            return submit.editReply(
                                `🚫 Você tem apenas **${itemSelecionado.quantidade}x** de **${itemSelecionado.nome}**.`
                            );
                        }

                        await ItensRepository.removerItem(itemSelecionado.id, qtd);

                        await ItensRepository.adicionarItem(
                            charDestinatario.id,
                            itemSelecionado.nome,
                            itemSelecionado.tipo,
                            qtd,
                            itemSelecionado.descricao
                        );

                        try {
                            await TransacaoService.registrarEntregaItem(
                                charDestinatario.id,
                                `${qtd}x ${itemSelecionado.nome} (de ${charRemetente.nome})`
                            );
                        } catch (err) {
                            console.log("Erro ao registrar no TransacaoService", err);
                        }

                        const embed = new EmbedBuilder()
                            .setColor("#9B59B6")
                            .setTitle("🎁 Item Entregue!")
                            .setDescription(
                                `**${charRemetente.nome}** passou um item para as mãos de **${charDestinatario.nome}**.`
                            )
                            .addFields({ name: "📦 Item", value: `${qtd}x **${itemSelecionado.nome}**` })
                            .setTimestamp();

                        await interaction.channel.send({ content: `<@${destinatarioUser.id}>`, embeds: [embed] });

                        await submit.editReply({
                            content: `✅ Você entregou ${qtd}x **${itemSelecionado.nome}** para ${charDestinatario.nome} com sucesso!`,
                            components: []
                        });

                        await interaction.editReply({ components: [] }).catch(() => null);
                        collector.stop();
                    } catch (err) {
                        console.error("Erro no submit do modal de entrega:", err);
                    }
                }
            });
        } catch (err) {
            console.error("Erro no comando entregar:", err);

            const erroMsg = {
                content: "❌ Ocorreu um erro ao preparar a entrega.",
                flags: MessageFlags.Ephemeral,
                components: []
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(erroMsg).catch(() => {});
            } else {
                await interaction.reply(erroMsg).catch(() => {});
            }
        }
    }
};
