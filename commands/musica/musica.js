const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const { useMainPlayer, useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("musica")
        .setDescription("Abre o painel de controle de música da sessão.")
        .addStringOption(opt => 
            opt.setName("busca")
                .setDescription("Link ou nome da primeira música para iniciar o painel")
                .setRequired(false)
        ),

    async execute({ interaction }) {
        const player = useMainPlayer();
        const canalVoz = interaction.member.voice.channel;
        const queryInicial = interaction.options.getString("busca");

        const botCanalVoz = interaction.guild.members.me.voice.channel;

        if (!canalVoz) {
            return interaction.reply({ 
                content: "🚫 Você precisa estar em um canal de voz para usar a música.", 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (botCanalVoz && botCanalVoz.id !== canalVoz.id) {
            return interaction.reply({ 
                content: `🚫 Eu já estou ocupado tocando música em outro canal. Junte-se a nós lá ou aguarde a sessão acabar!`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply();

        if (queryInicial) {
            try {
                await player.play(canalVoz, queryInicial, {
                    nodeOptions: { metadata: interaction.channel }
                });
            } catch (err) {
                console.error("Erro ao tocar música:", err);
                return interaction.editReply("❌ Não foi possível reproduzir esta música.");
            }
        }

        const atualizarPainel = () => {
            const queue = useQueue(interaction.guild.id);
            const trackAtual = queue?.currentTrack;

            const embed = new EmbedBuilder()
                .setColor("#1DB954")
                .setTitle("📻 Painel de Som da Guilda")
                .setImage(trackAtual?.thumbnail || "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=1000&auto=format&fit=crop")
                .addFields(
                    { name: "Tocando Agora", value: trackAtual ? `[${trackAtual.title}](${trackAtual.url})` : "Nenhuma música tocando.", inline: false },
                    { name: "Artista", value: trackAtual?.author || "-", inline: true },
                    { name: "Duração", value: trackAtual?.duration || "-", inline: true },
                    { name: "Fila", value: queue ? `${queue.tracks.size} música(s)` : "Vazia", inline: true }
                )
                .setFooter({ 
                    text: `Painel pertencente a: ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("btn_music_playpause").setEmoji(queue?.node.isPaused() ? "▶️" : "⏸️").setStyle(queue?.node.isPaused() ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("btn_music_skip").setEmoji("⏭️").setStyle(ButtonStyle.Primary).setDisabled(!trackAtual),
                new ButtonBuilder().setCustomId("btn_music_shuffle").setEmoji("🔀").setStyle(ButtonStyle.Secondary).setDisabled(!queue || queue.tracks.size < 2),
                new ButtonBuilder().setCustomId("btn_music_add").setEmoji("➕").setLabel("Adicionar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("btn_music_queue").setEmoji("📜").setLabel("Ver Fila").setStyle(ButtonStyle.Secondary)
            );

            return { embeds: [embed], components: [row] };
        };

        const msgPainel = await interaction.editReply(atualizarPainel());

        const collector = msgPainel.createMessageComponentCollector({ time: 3600000 });

        collector.on("collect", async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "🚫 Apenas quem iniciou o comando pode controlar o painel.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const queue = useQueue(i.guild.id);

            try {
                if (i.customId === "btn_music_playpause") {
                    await i.deferUpdate();
                    if (!queue) return;
                    queue.node.setPaused(!queue.node.isPaused());
                    await interaction.editReply(atualizarPainel());
                }

                if (i.customId === "btn_music_skip") {
                    await i.deferUpdate();
                    if (!queue) return;
                    queue.node.skip();
                    setTimeout(() => interaction.editReply(atualizarPainel()), 1000);
                }

                if (i.customId === "btn_music_shuffle") {
                    await i.deferUpdate();
                    if (!queue) return;
                    queue.tracks.shuffle();
                    await i.followUp({ content: "🔀 A fila foi embaralhada!", flags: MessageFlags.Ephemeral });
                    await interaction.editReply(atualizarPainel());
                }

                if (i.customId === "btn_music_queue") {
                    if (!queue || queue.tracks.size === 0) {
                        return i.reply({ content: "📜 A fila está vazia no momento.", flags: MessageFlags.Ephemeral });
                    }
                    const lista = queue.tracks.toArray().slice(0, 10).map((t, index) => `**${index + 1}.** ${t.title}`).join("\n");
                    await i.reply({ content: `📜 **Próximas Músicas (Top 10):**\n${lista}`, flags: MessageFlags.Ephemeral });
                }

                if (i.customId === "btn_music_add") {
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_add_music_${i.id}`)
                        .setTitle("Adicionar Música")
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("inp_musica")
                                    .setLabel("Link ou Nome da Música")
                                    .setPlaceholder("Ex: Trilha sonora de taverna medieval")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            )
                        );

                    await i.showModal(modal);

                    const submit = await i.awaitModalSubmit({ 
                        filter: m => m.customId === `modal_add_music_${i.id}`, 
                        time: 60000 
                    }).catch(() => null);
                    
                    if (submit) {
                        await submit.deferReply({ flags: MessageFlags.Ephemeral });
                        const query = submit.fields.getTextInputValue("inp_musica");
                        
                        await player.play(canalVoz, query, {
                            nodeOptions: { metadata: interaction.channel }
                        });

                        await submit.editReply({ content: `✅ **Adicionado à fila:** ${query}` });
                        
                        await interaction.editReply(atualizarPainel());
                    }
                }
            } catch (err) {
                console.error("Erro na interação de música:", err);
                if (!i.replied && !i.deferred) {
                    await i.reply({ content: "❌ Ocorreu um erro na operação.", flags: MessageFlags.Ephemeral });
                }
            }
        });
    }
};