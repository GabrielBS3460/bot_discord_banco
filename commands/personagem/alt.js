const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const PersonagemRepository = require("../../repositories/PersonagemRepository.js");
const AltService = require("../../services/AltService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("alt")
        .setDescription("Transfere recursos entre os seus próprios personagens.")
        .addSubcommand(sub =>
            sub.setName("dinheiro").setDescription("Envia K$ do seu personagem ativo para outro personagem seu.")
        )
        .addSubcommand(sub =>
            sub.setName("ingredientes").setDescription("Envia ingredientes do seu estoque para outro personagem seu.")
        )
        .addSubcommand(sub =>
            sub
                .setName("diverso")
                .setDescription("Envia um equipamento/item avulso para um alt usando um link.")
                .addStringOption(opt =>
                    opt.setName("nome").setDescription("Nome do item (Ex: Espada Longa)").setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("link").setDescription("Link da imagem ou ficha do item").setRequired(true)
                )
        ),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const charAtivo = await getPersonagemAtivo(interaction.user.id);
            if (!charAtivo) {
                return interaction.editReply({ content: "🚫 Você não tem um personagem ativo no momento." });
            }

            const meusAlts = await PersonagemRepository.buscarAltsDoJogador(interaction.user.id, charAtivo.id);
            if (meusAlts.length === 0) {
                return interaction.editReply({
                    content: "🚫 Você não possui outros personagens criados para receber a transferência."
                });
            }

            const subcomando = interaction.options.getSubcommand();

            const rotas = {
                dinheiro: this.executarDinheiro,
                ingredientes: this.executarIngredientes,
                diverso: this.executarDiverso
            };

            if (rotas[subcomando]) {
                await rotas[subcomando](interaction, charAtivo, meusAlts, formatarMoeda);
            }
        } catch (err) {
            console.error("Erro no comando alt:", err);
            await interaction
                .editReply({ content: "❌ Ocorreu um erro no sistema de alts.", components: [] })
                .catch(() => {});
        }
    },

    async executarDinheiro(interaction, charAtivo, meusAlts, formatarMoeda) {
        const menuAlts = new StringSelectMenuBuilder()
            .setCustomId(`menu_alt_dinheiro_${interaction.id}`)
            .setPlaceholder("Selecione qual personagem vai receber o K$...")
            .addOptions(
                meusAlts.map(alt =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(alt.nome)
                        .setDescription(`Saldo atual dele: K$ ${alt.saldo}`)
                        .setValue(String(alt.id))
                )
            );

        const replyMsg = await interaction.editReply({
            content: `💸 **Transferência entre Alts (Dinheiro)**\n**Origem:** ${charAtivo.nome}\n**Seu Saldo:** ${formatarMoeda(charAtivo.saldo)}\n\nSelecione o destinatário:`,
            components: [new ActionRowBuilder().addComponents(menuAlts)]
        });

        const collector = replyMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on("collect", async iSelect => {
            const destinoId = parseInt(iSelect.values[0]);
            const destinoAlt = meusAlts.find(a => a.id === destinoId);

            const modalId = `modal_alt_dinheiro_${interaction.id}`;
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle(`Transferir para ${destinoAlt.nome}`)
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("inp_valor")
                            .setLabel("Quantidade de K$ para enviar:")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

            await iSelect.showModal(modal);

            try {
                const modalSubmit = await iSelect.awaitModalSubmit({
                    filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                    time: 60000
                });
                await modalSubmit.deferUpdate();

                const valor = parseFloat(modalSubmit.fields.getTextInputValue("inp_valor").replace(",", "."));
                if (isNaN(valor) || valor <= 0)
                    return modalSubmit.followUp({ content: "🚫 Valor inválido.", flags: MessageFlags.Ephemeral });

                const charAtualizado = await PersonagemRepository.buscarPorId(charAtivo.id);
                if (charAtualizado.saldo < valor) {
                    return modalSubmit.followUp({
                        content: "💸 Você não tem saldo suficiente para essa transferência.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                await AltService.transferirDinheiro(charAtivo.id, destinoId, valor, charAtivo.nome, destinoAlt.nome);

                await interaction.editReply({
                    content: `✅ **Transferência Concluída!**\nVocê enviou **K$ ${valor}** de **${charAtivo.nome}** para **${destinoAlt.nome}**.`,
                    components: []
                });
                collector.stop();
                // eslint-disable-next-line no-unused-vars
            } catch (err) {
                /* ignora timeout */
            }
        });
    },

    async executarIngredientes(interaction, charAtivo, meusAlts) {
        const estoque = charAtivo.estoque_ingredientes || {};
        const listaItens = Object.keys(estoque);

        if (listaItens.length === 0)
            return interaction.editReply({ content: "🚫 O estoque deste personagem está vazio." });

        const menuItens = new StringSelectMenuBuilder()
            .setCustomId(`menu_alt_item_${interaction.id}`)
            .setPlaceholder("1️⃣ Selecione o item...");
        listaItens
            .slice(0, 25)
            .forEach(nomeItem =>
                menuItens.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(nomeItem)
                        .setDescription(`Você tem: ${estoque[nomeItem]}`)
                        .setValue(nomeItem)
                )
            );

        const menuAlts = new StringSelectMenuBuilder()
            .setCustomId(`menu_alt_destino_${interaction.id}`)
            .setPlaceholder("2️⃣ Selecione o personagem destino...");
        meusAlts.forEach(alt =>
            menuAlts.addOptions(new StringSelectMenuOptionBuilder().setLabel(alt.nome).setValue(String(alt.id)))
        );

        const btnConfirmar = new ButtonBuilder()
            .setCustomId(`btn_confirmar_alt_${interaction.id}`)
            .setLabel("Avançar para Quantidade")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const buildComponents = () => [
            new ActionRowBuilder().addComponents(menuItens),
            new ActionRowBuilder().addComponents(menuAlts),
            new ActionRowBuilder().addComponents(btnConfirmar)
        ];

        const replyMsg = await interaction.editReply({
            content: `📦 **Transferência entre Alts (Estoque)**\n**Origem:** ${charAtivo.nome}\n\nSelecione o Item e o Destino abaixo:`,
            components: buildComponents()
        });

        const collector = replyMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 120000
        });
        let itemEscolhido = null;
        let destinoEscolhidoId = null;

        collector.on("collect", async iComp => {
            if (iComp.isStringSelectMenu()) {
                if (iComp.customId.startsWith("menu_alt_item_")) itemEscolhido = iComp.values[0];
                if (iComp.customId.startsWith("menu_alt_destino_")) destinoEscolhidoId = parseInt(iComp.values[0]);

                if (itemEscolhido && destinoEscolhidoId) {
                    btnConfirmar.setDisabled(false);
                    btnConfirmar.setStyle(ButtonStyle.Success);
                }
                await iComp.update({ components: buildComponents() });
            }

            if (iComp.isButton() && iComp.customId.startsWith("btn_confirmar_alt_")) {
                const destinoAlt = meusAlts.find(a => a.id === destinoEscolhidoId);
                const maxDisp = estoque[itemEscolhido];
                const modalId = `mod_qtd_item_${interaction.id}`;
                const nomeCurto = itemEscolhido.length > 25 ? itemEscolhido.substring(0, 25) + "..." : itemEscolhido;

                const modal = new ModalBuilder()
                    .setCustomId(modalId)
                    .setTitle(`Enviar ${nomeCurto}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inp_qtd")
                                .setLabel(`Quantidade (Máx: ${maxDisp})`)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await iComp.showModal(modal);

                try {
                    const modalSubmit = await iComp.awaitModalSubmit({
                        filter: m => m.customId === modalId && m.user.id === interaction.user.id,
                        time: 60000
                    });
                    await modalSubmit.deferUpdate();

                    const qtdEnviar = parseInt(modalSubmit.fields.getTextInputValue("inp_qtd"));
                    if (isNaN(qtdEnviar) || qtdEnviar <= 0 || qtdEnviar > maxDisp) {
                        return modalSubmit.followUp({
                            content: `🚫 Quantidade inválida. Você só tem ${maxDisp} disponíveis.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const charOrigemAtualizado = await PersonagemRepository.buscarPorId(charAtivo.id);
                    const charDestinoAtualizado = await PersonagemRepository.buscarPorId(destinoEscolhidoId);

                    const estOrigem = charOrigemAtualizado.estoque_ingredientes || {};
                    const estDestino = charDestinoAtualizado.estoque_ingredientes || {};

                    if (!estOrigem[itemEscolhido] || estOrigem[itemEscolhido] < qtdEnviar) {
                        return modalSubmit.followUp({
                            content: "❌ Ocorreu um erro: o item não está mais no seu estoque.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    estOrigem[itemEscolhido] -= qtdEnviar;
                    if (estOrigem[itemEscolhido] <= 0) delete estOrigem[itemEscolhido];
                    estDestino[itemEscolhido] = (estDestino[itemEscolhido] || 0) + qtdEnviar;

                    await AltService.transferirIngredientes(
                        charAtivo.id,
                        destinoEscolhidoId,
                        itemEscolhido,
                        qtdEnviar,
                        estOrigem,
                        estDestino
                    );

                    await interaction.editReply({
                        content: `✅ **Transferência Concluída!**\nVocê enviou **${qtdEnviar}x ${itemEscolhido}** de **${charAtivo.nome}** para **${destinoAlt.nome}**.`,
                        components: []
                    });
                    collector.stop();
                    // eslint-disable-next-line no-unused-vars
                } catch (err) {
                    /* ignora timeout */
                }
            }
        });
    },

    async executarDiverso(interaction, charAtivo, meusAlts) {
        const nomeItem = interaction.options.getString("nome");
        const linkItem = interaction.options.getString("link");

        const menuAlts = new StringSelectMenuBuilder()
            .setCustomId(`menu_alt_div_${interaction.id}`)
            .setPlaceholder("Selecione o destinatário...")
            .addOptions(
                meusAlts.map(alt => new StringSelectMenuOptionBuilder().setLabel(alt.nome).setValue(String(alt.id)))
            );

        const replyMsg = await interaction.editReply({
            content: `📦 **Transferir Equipamento / Item Avulso**\n**Origem:** ${charAtivo.nome}\n**Item:** [${nomeItem}](${linkItem})\n\nSelecione para qual personagem seu você deseja enviar:`,
            components: [new ActionRowBuilder().addComponents(menuAlts)]
        });

        const collector = replyMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on("collect", async iSelect => {
            await iSelect.deferUpdate();
            const destinoId = parseInt(iSelect.values[0]);
            const destinoAlt = meusAlts.find(a => a.id === destinoId);

            await AltService.transferirItemDiverso(charAtivo.id, destinoId, nomeItem, charAtivo.nome, destinoAlt.nome);

            await interaction.channel.send({
                content: `🔀 **Transferência de Equipamento (Alts)**\nO personagem **${charAtivo.nome}** guardou os pertences e enviou o item **[${nomeItem}](${linkItem})** para o inventário de **${destinoAlt.nome}**.`
            });
            await interaction.editReply({
                content: `✅ Item **${nomeItem}** enviado com sucesso para **${destinoAlt.nome}**!\nUma mensagem foi enviada no canal.`,
                components: []
            });
            collector.stop();
        });
    }
};
