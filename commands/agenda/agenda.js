const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    AttachmentBuilder,
    EmbedBuilder
} = require("discord.js");
const { createCanvas } = require("canvas");
const AgendaService = require("../../services/AgendaService.js");

const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const DAY_EMOJIS = ["🌕", "🔥", "💧", "🌲", "✨", "🌟", "☀️"];
const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const HEAT_COLORS = [
    { label: "0", color: "#383a40" },
    { label: "1-2", color: "#1a4d2e" },
    { label: "3-4", color: "#248046" },
    { label: "5+", color: "#57f287" }
];

const getColor = count => {
    if (count >= 5) return "#57f287";
    if (count >= 3) return "#248046";
    if (count >= 1) return "#1a4d2e";
    return "#383a40";
};

const generateHourOptions = selectedHours => {
    return Array.from({ length: 24 }, (_, i) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(`${i.toString().padStart(2, "0")}:00`)
            .setValue(String(i))
            .setDefault(selectedHours.includes(i))
    );
};

const buildSummaryField = (availability, start, end) => {
    const fields = [];
    for (let i = start; i < end; i++) {
        const horas =
            availability[i].length > 0
                ? availability[i]
                      .sort((a, b) => a - b)
                      .map(h => `${h}h`)
                      .join(", ")
                : "Nenhum";
        fields.push({ name: `${DAY_EMOJIS[i]} ${DAY_NAMES[i]}`, value: horas, inline: false });
    }
    return fields;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("agenda")
        .setDescription("Sistema de disponibilidade para RPG.")
        .addSubcommand(sub => sub.setName("marcar").setDescription("Define seus horários disponíveis."))
        .addSubcommand(sub => sub.setName("mapa").setDescription("Exibe o Heatmap do servidor.")),

    async execute({ interaction, getPersonagemAtivo }) {
        const subcomando = interaction.options.getSubcommand();

        try {
            if (subcomando === "marcar") {
                const char = await getPersonagemAtivo(interaction.user.id);
                if (!char)
                    return interaction.reply({
                        content: "🚫 Crie um personagem antes.",
                        flags: MessageFlags.Ephemeral
                    });

                let availability = char.agenda || [[], [], [], [], [], [], []];

                const renderEmbed = (avail, isWeekend) =>
                    new EmbedBuilder()
                        .setTitle(`📅 Disponibilidade - ${isWeekend ? "Fim de Semana" : "Dias Úteis"}`)
                        .setDescription("Selecione os horários (Brasília).")
                        .addFields(isWeekend ? buildSummaryField(avail, 5, 7) : buildSummaryField(avail, 0, 5))
                        .setColor("#5865f2");

                const buildRows = (start, end, showSave) => {
                    const rows = [];
                    for (let i = start; i < end; i++) {
                        rows.push(
                            new ActionRowBuilder().addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`day_${i}`)
                                    .setPlaceholder(`${DAY_EMOJIS[i]} ${DAY_NAMES[i]}`)
                                    .setMinValues(0)
                                    .setMaxValues(24)
                                    .addOptions(generateHourOptions(availability[i]))
                            )
                        );
                    }
                    if (showSave)
                        rows.push(
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId("save_agenda")
                                    .setLabel("💾 Salvar Agenda")
                                    .setStyle(ButtonStyle.Success)
                            )
                        );
                    return rows;
                };

                await interaction.reply({
                    embeds: [renderEmbed(availability, false)],
                    components: buildRows(0, 5, false),
                    flags: MessageFlags.Ephemeral
                });
                const followMsg = await interaction.followUp({
                    embeds: [renderEmbed(availability, true)],
                    components: buildRows(5, 7, true),
                    flags: MessageFlags.Ephemeral,
                    withResponse: true
                });

                const collector = interaction.channel.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 300000
                });

                collector.on("collect", async i => {
                    await i.deferUpdate();
                    if (i.customId === "save_agenda") {
                        await AgendaService.salvarAgendaUsuario(interaction.user.id, availability);
                        await i.followUp({ content: "✅ Agenda salva!", flags: MessageFlags.Ephemeral });
                        return collector.stop();
                    }

                    const dayIndex = parseInt(i.customId.split("_")[1]);
                    availability[dayIndex] = i.values.map(Number).sort((a, b) => a - b);

                    await interaction.editReply({
                        embeds: [renderEmbed(availability, false)],
                        components: buildRows(0, 5, false)
                    });
                    await followMsg.resource.message.edit({
                        embeds: [renderEmbed(availability, true)],
                        components: buildRows(5, 7, true)
                    });
                });
            }

            if (subcomando === "mapa") {
                await interaction.deferReply();
                const { matrix, totalAtivos } = await AgendaService.gerarMatrizHeatmap();

                if (totalAtivos === 0) return interaction.editReply("🚫 Nenhuma agenda preenchida ainda!");

                const CELL_SIZE = 35;
                const PADDING = 4;
                const HEADER_H = 50;
                const LABEL_W = 120;
                const WIDTH = LABEL_W + (CELL_SIZE + PADDING) * 24 + 20;
                const HEIGHT = HEADER_H + (CELL_SIZE + PADDING) * 7 + 80;

                const canvas = createCanvas(WIDTH, HEIGHT);
                const ctx = canvas.getContext("2d");

                ctx.fillStyle = "#2b2d31";
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                ctx.fillStyle = "#b5bac1";
                ctx.font = "bold 14px sans-serif";
                ctx.textAlign = "center";
                for (let h = 0; h < 24; h++) {
                    const x = LABEL_W + PADDING + h * (CELL_SIZE + PADDING) + CELL_SIZE / 2;
                    ctx.fillText(`${h}h`, x, HEADER_H / 2 + 5);
                }

                for (let day = 0; day < 7; day++) {
                    const y = HEADER_H + PADDING + day * (CELL_SIZE + PADDING);

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 16px sans-serif";
                    ctx.textAlign = "right";
                    ctx.fillText(DAY_LABELS[day], LABEL_W - 15, y + CELL_SIZE / 2 + 5);

                    for (let hour = 0; hour < 24; hour++) {
                        const count = matrix[day][hour];
                        const x = LABEL_W + PADDING + hour * (CELL_SIZE + PADDING);

                        ctx.fillStyle = getColor(count);
                        ctx.beginPath();
                        ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 4);
                        ctx.fill();

                        if (count > 0) {
                            ctx.fillStyle = "#ffffff";
                            ctx.font = "bold 14px sans-serif";
                            ctx.textAlign = "center";
                            ctx.fillText(count.toString(), x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 5);
                        }
                    }
                }

                const legendY = HEIGHT - 40;
                let legendX = LABEL_W;
                ctx.textAlign = "left";
                ctx.font = "14px sans-serif";

                for (const item of HEAT_COLORS) {
                    ctx.fillStyle = item.color;
                    ctx.beginPath();
                    ctx.roundRect(legendX, legendY, 20, 20, 4);
                    ctx.fill();

                    ctx.fillStyle = "#b5bac1";
                    ctx.fillText(
                        item.label === "5+" ? "5+ Players" : `${item.label} Players`,
                        legendX + 25,
                        legendY + 15
                    );
                    legendX += 110;
                }

                const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "heatmap.png" });
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("📊 Mapa de Calor do Servidor")
                            .setDescription(`Disponibilidade geral baseada em **${totalAtivos}** agendas preenchidas.`)
                            .setImage("attachment://heatmap.png")
                            .setColor("#57f287")
                    ],
                    files: [attachment]
                });
            }
        } catch (err) {
            console.error(err);
            const msg = { content: "❌ Erro no sistema de agenda.", flags: MessageFlags.Ephemeral };
            interaction.replied ? await interaction.followUp(msg) : await interaction.reply(msg);
        }
    }
};
