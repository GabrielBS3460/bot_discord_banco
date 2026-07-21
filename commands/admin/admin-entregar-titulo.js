const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-entregar-titulo")
        .setDescription("🛠️ Concede um título honorífico a um personagem (Apenas Admin).")
        .addUserOption(opt => opt.setName("jogador").setDescription("O jogador agraciado").setRequired(true))
        .addStringOption(opt => opt.setName("titulo").setDescription("O nome do título").setRequired(true))
        .addStringOption(opt => opt.setName("personagem").setDescription("Nome ou filtro do personagem").setRequired(false)),

    async execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD }) {
        const temPermissao = interaction.member.roles.cache.has(ID_CARGO_ADMIN) || interaction.member.roles.cache.has(ID_CARGO_MOD);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para conceder títulos.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const alvoUser = interaction.options.getUser("jogador");
        const tituloConcedido = interaction.options.getString("titulo").trim();
        const filtroNome = interaction.options.getString("personagem");

        if (alvoUser.bot) return interaction.editReply("🚫 Bots não recebem títulos.");

        try {
            const personagens = await PersonagemRepository.buscarTodosDoJogador(alvoUser.id);
            if (personagens.length === 0) {
                return interaction.editReply(`🚫 O jogador **${alvoUser.username}** não possui personagens.`);
            }

            let charAlvo = null;
            if (filtroNome) {
                charAlvo = personagens.find(p => p.nome.toLowerCase().includes(filtroNome.toLowerCase()));
            }

            if (!charAlvo && personagens.length === 1) {
                charAlvo = personagens[0];
            }

            const aplicarTitulo = async (char) => {
                const titulosAtuais = Array.isArray(char.titulos) ? [...char.titulos] : [];
                if (!titulosAtuais.includes(tituloConcedido)) {
                    titulosAtuais.push(tituloConcedido);
                }

                await PersonagemRepository.atualizar(char.id, {
                    titulos: titulosAtuais,
                    titulo_ativo: char.titulo_ativo || tituloConcedido
                });

                const embed = new EmbedBuilder()
                    .setColor("#FFD700")
                    .setTitle("👑 Título Concedido!")
                    .setDescription(`**${char.nome}** (jogador ${alvoUser}) recebeu o honroso título:\n\n✨ **${tituloConcedido}** ✨`)
                    .setFooter({ text: `Concedido por ${interaction.user.username}` })
                    .setTimestamp();

                await interaction.channel.send({ content: `<@${alvoUser.id}>`, embeds: [embed] });
                return interaction.editReply({ content: `✅ Título "**${tituloConcedido}**" concedido com sucesso para **${char.nome}**!`, components: [] });
            };

            if (charAlvo) {
                return await aplicarTitulo(charAlvo);
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`menu_grant_title_${interaction.id}`)
                .setPlaceholder(`Escolha qual personagem de ${alvoUser.username} receberá o título...`);

            personagens.forEach(p => {
                menu.addOptions(
                    new StringSelectMenuOptionBuilder().setLabel(p.nome).setValue(p.id.toString())
                );
            });

            const msgSel = await interaction.editReply({
                content: `👑 **Conceder Título:** Selecione qual personagem de **${alvoUser.username}** receberá "**${tituloConcedido}**":`,
                components: [new ActionRowBuilder().addComponents(menu)],
                fetchReply: true
            });

            const collector = msgSel.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async iSelect => {
                await iSelect.deferUpdate();
                const pId = parseInt(iSelect.values[0]);
                const charSelecionado = personagens.find(p => p.id === pId);
                collector.stop();
                await aplicarTitulo(charSelecionado);
            });

        } catch (err) {
            console.error("Erro no admin-entregar-titulo:", err);
            return interaction.editReply("❌ Ocorreu um erro ao entregar o título.");
        }
    }
};
