const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const ItensRepository = require("../../repositories/ItensRepository.js");
const prisma = require("../../database.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("comprar")
        .setDescription("🛒 Compra um item do livro pelo preço cheio x2."),

    async execute({ interaction, getPersonagemAtivo, formatarMoeda }) {
        try {
            const char = await getPersonagemAtivo(interaction.user.id);

            if (!char) {
                return interaction.reply({
                    content: "🚫 Sem personagem ativo. Use `/cadastrar` ou `/personagem trocar`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const categorias = [
                "Alimento",
                "Consumíveis",
                "Itens Permanentes",
                "Munição",
                "Item Mágico",
                "Poções/Pergaminhos (1-2)",
                "Poções/Pergaminhos (3-5)"
            ];

            const menuTipos = new StringSelectMenuBuilder()
                .setCustomId("menu_encomenda_tipo")
                .setPlaceholder("Selecione a categoria do item...");

            categorias.forEach(tipo => {
                menuTipos.addOptions(new StringSelectMenuOptionBuilder().setLabel(tipo).setValue(tipo));
            });

            const msg = await interaction.reply({
                content: `🛒 **Comércio Local (Livro de Regras)**\n💰 Seu Saldo: **${formatarMoeda(char.saldo)}**\n\nSelecione a **categoria** do item que deseja comprar:`,
                components: [new ActionRowBuilder().addComponents(menuTipos)],
                flags: MessageFlags.Ephemeral,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async i => {
                if (!i.isStringSelectMenu()) return;

                if (i.customId === "menu_encomenda_tipo") {
                    const tipoSelecionado = i.values[0];
                    const modalId = `modal_encomenda_${Date.now()}`;

                    const modal = new ModalBuilder()
                        .setCustomId(modalId)
                        .setTitle(`Comprar: ${tipoSelecionado.substring(0, 25)}`)
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_nome")
                                    .setLabel("Nome do Item (Ex: Espada Longa)")
                                    .setPlaceholder("Nome exato como no livro")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_qtd")
                                    .setLabel("Quantidade")
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("1")
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_ouro")
                                    .setLabel("Custo TOTAL em Kwanzas (K$)")
                                    .setPlaceholder("Ex: 15 ou 0.5")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_link")
                                    .setLabel("Descrição ou Bônus")
                                    .setPlaceholder("Opcional")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(false)
                            )
                        );

                    await i.showModal(modal);

                    try {
                        const submit = await i.awaitModalSubmit({
                            filter: inter => inter.customId === modalId && inter.user.id === interaction.user.id,
                            time: 120000
                        });

                        await submit.deferReply({ flags: MessageFlags.Ephemeral });

                        const nomeItem = submit.fields.getTextInputValue("inp_nome");
                        const qtd = parseInt(submit.fields.getTextInputValue("inp_qtd"));
                        const custoOuro = parseFloat(submit.fields.getTextInputValue("inp_ouro").replace(",", "."));
                        const linkItem = submit.fields.getTextInputValue("inp_link");

                        if (isNaN(qtd) || qtd <= 0) return submit.editReply("🚫 Quantidade inválida.");
                        if (isNaN(custoOuro) || custoOuro < 0) return submit.editReply("🚫 Custo em Kwanzas inválido.");

                        const charAtualizado = await prisma.personagens.findUnique({
                            where: { id: char.id },
                            select: { saldo: true, nome: true }
                        });

                        if (charAtualizado.saldo < custoOuro) {
                            return submit.editReply(
                                `🚫 Saldo insuficiente. Você possui **${formatarMoeda(charAtualizado.saldo)}**, mas a compra custa **${formatarMoeda(custoOuro)}**.`
                            );
                        }

                        await prisma.personagens.update({
                            where: { id: char.id },
                            data: { saldo: { decrement: custoOuro } }
                        });

                        let tipoFinal = tipoSelecionado;
                        if (tipoSelecionado.includes("Poções")) tipoFinal = "Poções/Pergaminhos (1-2)";

                        await ItensRepository.adicionarItem(char.id, nomeItem, tipoFinal, qtd, linkItem || null);

                        const saldoFinal = charAtualizado.saldo - custoOuro;

                        const embed = new EmbedBuilder()
                            .setColor("#2ECC71")
                            .setTitle("🛍️ Compra Realizada!")
                            .setDescription(`Você adquiriu **${qtd}x ${nomeItem}** com sucesso.`)
                            .addFields(
                                { name: "Custo Total", value: formatarMoeda(custoOuro), inline: true },
                                { name: "Saldo Restante", value: formatarMoeda(saldoFinal), inline: true }
                            )
                            .setTimestamp();

                        await submit.editReply({ embeds: [embed] });

                        await interaction.channel.send({
                            content: `🛒 **${char.nome}** visitou os mercadores locais e adquiriu **${qtd}x ${nomeItem}** por **${formatarMoeda(custoOuro)}**.`
                        });

                        await msg.edit({ components: [] }).catch(() => {});
                        collector.stop();
                    } catch (err) {
                        if (err.code !== "InteractionCollectorError") {
                            console.error("Erro na finalização da encomenda:", err);
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Erro no comando encomendar:", err);
            const erroMsg = { content: "❌ Ocorreu um erro ao abrir a loja.", flags: MessageFlags.Ephemeral };
            interaction.replied
                ? await interaction.followUp(erroMsg).catch(() => {})
                : await interaction.reply(erroMsg).catch(() => {});
        }
    }
};
