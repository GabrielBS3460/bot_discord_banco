const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const PersonagemRepository = require("../../repositories/PersonagemRepository.js");
const PersonagemService = require("../../services/PersonagemService.js");
const { CUSTO_NIVEL } = require("../../data/fichaData.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-ficha")
        .setDescription("🛠️ Exibe a ficha de um personagem de outro jogador (Admin/Mod).")
        .addUserOption(opt =>
            opt.setName("jogador")
                .setDescription("O jogador que você deseja investigar")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("personagem")
                .setDescription("Nome exacto ou parcial do personagem (opcional)")
                .setRequired(false)
        ),

    async execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD, ID_CARGO_CORRETOR }) {
        const temPermissao =
            interaction.member.roles.cache.has(ID_CARGO_ADMIN) ||
            interaction.member.roles.cache.has(ID_CARGO_MOD) ||
            interaction.member.roles.cache.has(ID_CARGO_CORRETOR);

        if (!temPermissao) {
            return interaction.reply({
                content: "🚫 Você não tem permissão para usar este comando administrativo.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const alvoUser = interaction.options.getUser("jogador");
        const filtroNome = interaction.options.getString("personagem");

        if (alvoUser.bot) {
            return interaction.editReply("🚫 Bots não possuem ficha de personagem.");
        }

        try {
            const personagens = await PersonagemRepository.buscarTodosDoJogador(alvoUser.id);

            if (personagens.length === 0) {
                return interaction.editReply(`🚫 O jogador **${alvoUser.username}** não possui nenhum personagem.`);
            }

            let selecionado = null;

            if (filtroNome) {
                selecionado = personagens.find(p => p.nome.toLowerCase().includes(filtroNome.toLowerCase()));
            }

            const montarEmbedFicha = (p) => {
                const { nivelReal, patamar } = PersonagemService.calcularDadosBase(p);
                const calcCD = mod => 10 + mod + Math.floor(nivelReal / 2);

                const txtVida = p.vida_temp > 0 ? `${p.vida_atual}/${p.vida_max} (+${p.vida_temp})` : `${p.vida_atual}/${p.vida_max}`;
                const txtMana = p.mana_temp > 0 ? `${p.mana_atual}/${p.mana_max} (+${p.mana_temp})` : `${p.mana_atual}/${p.mana_max}`;
                const obsTexto = p.observacoes || "Nenhuma observação registrada.";
                const textoClasses = Array.isArray(p.classes) && p.classes.length > 0 ? p.classes.map(c => `${c.nome_classe} ${c.nivel}`).join(" / ") : "Sem Classe";
                const listaPericias = Array.isArray(p.pericias) && p.pericias.length ? p.pericias.join(", ") : "Nenhuma";
                const custoProx = CUSTO_NIVEL[nivelReal] || "Max";

                const embed = new EmbedBuilder()
                    .setColor("#E74C3C")
                    .setTitle(`📜 Ficha Administrativa: ${p.nome}`)
                    .setDescription(`**Dono:** ${alvoUser.username}\n**Classes:** ${textoClasses}\n**Nível:** ${nivelReal} (Patamar ${patamar})`)
                    .addFields(
                        { name: "❤️ Vida", value: txtVida, inline: true },
                        { name: "⭐ Mana", value: txtMana, inline: true },
                        { name: "📈 Progresso", value: `${p.pontos_missao}/${custoProx}`, inline: true },
                        { name: "🛠️ Forja", value: `${p.pontos_forja_atual.toFixed(1)} pts`, inline: true },
                        { name: "🏃 Deslocamento", value: `${p.deslocamento}m`, inline: true },
                        { name: "👑 Título Ativo", value: p.titulo_ativo || "Nenhum", inline: true },
                        {
                            name: "💪 Físicos",
                            value: `**FOR:** ${p.forca >= 0 ? "+" : ""}${p.forca} (CD ${calcCD(p.forca)})\n**DES:** ${p.destreza >= 0 ? "+" : ""}${p.destreza} (CD ${calcCD(p.destreza)})\n**CON:** ${p.constituicao >= 0 ? "+" : ""}${p.constituicao} (CD ${calcCD(p.constituicao)})`,
                            inline: true
                        },
                        {
                            name: "🧠 Mentais",
                            value: `**INT:** ${p.inteligencia >= 0 ? "+" : ""}${p.inteligencia} (CD ${calcCD(p.inteligencia)})\n**SAB:** ${p.sabedoria >= 0 ? "+" : ""}${p.sabedoria} (CD ${calcCD(p.sabedoria)})\n**CAR:** ${p.carisma >= 0 ? "+" : ""}${p.carisma} (CD ${calcCD(p.carisma)})`,
                            inline: true
                        },
                        { name: "🎭 Perícias", value: listaPericias },
                        { name: "📝 Observações", value: obsTexto }
                    );

                if (p.banner_url) embed.setImage(p.banner_url);
                else embed.setThumbnail(alvoUser.displayAvatarURL());

                return embed;
            };

            if (selecionado) {
                const charCompleto = await PersonagemRepository.obterFichaCompleta(selecionado.id);
                return interaction.editReply({ embeds: [montarEmbedFicha(charCompleto)] });
            }

            if (personagens.length === 1) {
                const charCompleto = await PersonagemRepository.obterFichaCompleta(personagens[0].id);
                return interaction.editReply({ embeds: [montarEmbedFicha(charCompleto)] });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`menu_admin_ficha_${interaction.id}`)
                .setPlaceholder("Selecione qual personagem investigar...");

            personagens.forEach(p => {
                menu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(p.nome)
                        .setDescription(`Nível ${p.nivel_personagem || 1}`)
                        .setValue(p.id.toString())
                );
            });

            const replyMsg = await interaction.editReply({
                content: `📜 **Personagens de ${alvoUser.username}:** Selecione um na lista abaixo:`,
                components: [new ActionRowBuilder().addComponents(menu)],
                fetchReply: true
            });

            const collector = replyMsg.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async iSelect => {
                await iSelect.deferUpdate();
                const pId = parseInt(iSelect.values[0]);
                const charCompleto = await PersonagemRepository.obterFichaCompleta(pId);
                await iSelect.editReply({ embeds: [montarEmbedFicha(charCompleto)], components: [] });
                collector.stop();
            });

        } catch (err) {
            console.error("Erro no admin-ficha:", err);
            return interaction.editReply("❌ Ocorreu um erro ao carregar a ficha.");
        }
    }
};
