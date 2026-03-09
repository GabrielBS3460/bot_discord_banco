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

const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const DAY_EMOJIS = ["🌕", "🔥", "💧", "🌲", "✨", "🌟", "☀️"];
const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const HEAT_COLORS = [
    { label: "0", color: "#383a40", min: 0 },
    { label: "1-2", color: "#1a4d2e", min: 1 },
    { label: "3-4", color: "#248046", min: 3 },
    { label: "5+", color: "#57f287", min: 5 }
];

function getColor(count) {
    if (count >= 5) return "#57f287";
    if (count >= 3) return "#248046";
    if (count >= 1) return "#1a4d2e";
    return "#383a40";
}

function generateHourOptions(selectedHours) {
    const options = [];
    for (let i = 0; i < 24; i++) {
        const hourStr = `${i.toString().padStart(2, '0')}:00`;
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(hourStr)
                .setValue(String(i))
                .setDefault(selectedHours.includes(i))
        );
    }
    return options;
}

function buildSummaryField(availability, startDay, endDay) {
    const fields = [];
    for (let i = startDay; i < endDay; i++) {
        const horas = availability[i].length > 0 
            ? availability[i].sort((a,b) => a-b).map(h => `${h}h`).join(", ") 
            : "Nenhum";
        fields.push({ name: `${DAY_EMOJIS[i]} ${DAY_NAMES[i]}`, value: horas, inline: false });
    }
    return fields;
}

function buildDayMenuRows(availability, startDay, endDay, interactionId) {
    const rows = [];
    for (let i = startDay; i < endDay; i++) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`day_${i}_${interactionId}`)
            .setPlaceholder(`${DAY_EMOJIS[i]} ${DAY_NAMES[i]}`)
            .setMinValues(0)
            .setMaxValues(24)
            .addOptions(generateHourOptions(availability[i] || []));
        rows.push(new ActionRowBuilder().addComponents(menu));
    }
    return rows;
}

function buildWeekendRows(availability, interactionId) {
    const rows = buildDayMenuRows(availability, 5, 7, interactionId);
    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`save_availability_${interactionId}`)
                .setLabel("💾 Salvar Agenda")
                .setStyle(ButtonStyle.Success)
        )
    );
    return rows;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("agenda")
        .setDescription("Sistema de disponibilidade de horários para jogar RPG.")
        .addSubcommand(sub =>
            sub.setName("marcar")
                .setDescription("Define os dias e horários que você está disponível para jogar.")
        )
        .addSubcommand(sub =>
            sub.setName("mapa")
                .setDescription("Exibe o Heatmap (mapa de calor) com os horários de todo o servidor.")
        ),

    async execute({ interaction, prisma }) {
        const userId = interaction.user.id;
        const subcomando = interaction.options.getSubcommand();

        const NOME_COLUNA_DISCORD = "usuario_id"; 

        try {
            if (subcomando === "marcar") {
                const char = await prisma.personagens.findFirst({ where: { [NOME_COLUNA_DISCORD]: userId } });
                if (!char) return interaction.reply({ content: "🚫 Crie um personagem antes de usar a agenda.", flags: MessageFlags.Ephemeral });

                let availability = char.agenda ? char.agenda : [[], [], [], [], [], [], []];

                const weekdayEmbed = (avail, footer) => new EmbedBuilder()
                    .setTitle("📅 Disponibilidade - Dias Úteis")
                    .setDescription("Selecione os horários em que você costuma estar livre (Horário de Brasília).")
                    .addFields(buildSummaryField(avail, 0, 5))
                    .setColor("#5865f2")
                    .setFooter({ text: footer });

                const weekendEmbed = (avail, footer) => new EmbedBuilder()
                    .setTitle("📅 Disponibilidade - Fim de Semana")
                    .setDescription("Selecione os horários para sábado e domingo.")
                    .addFields(buildSummaryField(avail, 5, 7))
                    .setColor("#5865f2")
                    .setFooter({ text: footer });

                await interaction.reply({
                    embeds: [weekdayEmbed(availability, "Ajuste os menus abaixo para atualizar.")],
                    components: buildDayMenuRows(availability, 0, 5, interaction.id),
                    flags: MessageFlags.Ephemeral
                });
                const replyMsg = await interaction.fetchReply();

                const followUpMsg = await interaction.followUp({
                    embeds: [weekendEmbed(availability, "Clique em Salvar quando terminar tudo.")],
                    components: buildWeekendRows(availability, interaction.id),
                    flags: MessageFlags.Ephemeral,
                    withResponse: true 
                });
                const followMsg = followUpMsg.resource ? followUpMsg.resource.message : followUpMsg;

                const filter = i => i.user.id === userId;
                const weekdayCollector = replyMsg.createMessageComponentCollector({ filter, time: 300000 });
                const weekendCollector = followMsg.createMessageComponentCollector({ filter, time: 300000 });

                weekdayCollector.on("collect", async i => {
                    await i.deferUpdate();
                    const dayIndex = parseInt(i.customId.split("_")[1]);
                    availability[dayIndex] = i.values.map(Number).sort((a,b) => a-b);
                    await interaction.editReply({ embeds: [weekdayEmbed(availability, `✅ ${DAY_NAMES[dayIndex]} atualizado!`)], components: buildDayMenuRows(availability, 0, 5, interaction.id) });
                });

                weekendCollector.on("collect", async i => {
                    await i.deferUpdate();

                    if (i.isStringSelectMenu()) {
                        const dayIndex = parseInt(i.customId.split("_")[1]);
                        availability[dayIndex] = i.values.map(Number).sort((a,b) => a-b);
                        await i.editReply({ embeds: [weekendEmbed(availability, `✅ ${DAY_NAMES[dayIndex]} atualizado!`)], components: buildWeekendRows(availability, interaction.id) });
                    }

                    if (i.isButton() && i.customId.startsWith("save_availability")) {
                        await prisma.personagens.updateMany({
                            where: { [NOME_COLUNA_DISCORD]: userId },
                            data: { agenda: availability }
                        });

                        await i.followUp({
                            embeds: [new EmbedBuilder().setTitle("✅ Disponibilidade salva!").setDescription("Seus horários foram registrados no banco de dados.").setColor("#57f287")],
                            flags: MessageFlags.Ephemeral
                        });

                        weekdayCollector.stop();
                        weekendCollector.stop();
                        await interaction.editReply({ components: [] }).catch(()=>{});
                        await i.editReply({ components: [] }).catch(()=>{});
                    }
                });
            }

            if (subcomando === "mapa") {
                await interaction.deferReply(); 

                const players = await prisma.personagens.findMany({
                    select: { usuario_id: true, agenda: true },
                    distinct: [NOME_COLUNA_DISCORD]
                });

                const matrix = Array(7).fill(0).map(() => Array(24).fill(0));
                let totalPlayersComAgenda = 0;

                players.forEach(p => {
                    if (p.agenda && Array.isArray(p.agenda)) {
                        totalPlayersComAgenda++;
                        for (let day = 0; day < 7; day++) {
                            if (p.agenda[day]) {
                                p.agenda[day].forEach(hour => {
                                    if (hour >= 0 && hour <= 23) {
                                        matrix[day][hour]++;
                                    }
                                });
                            }
                        }
                    }
                });

                if (totalPlayersComAgenda === 0) {
                    return interaction.editReply("🚫 Ninguém preencheu a agenda do servidor ainda! Mandem um `/agenda marcar`!");
                }

                const renderHeatmap = async (matrix) => {
                    const CELL_SIZE = 35;
                    const PADDING = 4;
                    const HEADER_H = 50;
                    const LABEL_W = 120;
                    const ROWS = 7;
                    const COLS = 24;

                    const WIDTH = LABEL_W + (CELL_SIZE + PADDING) * COLS + 20;
                    const HEIGHT = HEADER_H + (CELL_SIZE + PADDING) * ROWS + 80;

                    const canvas = createCanvas(WIDTH, HEIGHT);
                    const ctx = canvas.getContext('2d');

                    ctx.fillStyle = "#2b2d31";
                    ctx.fillRect(0, 0, WIDTH, HEIGHT);

                    ctx.fillStyle = "#b5bac1";
                    ctx.font = "bold 16px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    for (let h = 0; h < COLS; h++) {
                        const x = LABEL_W + PADDING + h * (CELL_SIZE + PADDING) + CELL_SIZE / 2;
                        ctx.fillText(`${h}h`, x, HEADER_H / 2);
                    }

                    for (let day = 0; day < ROWS; day++) {
                        const y = HEADER_H + PADDING + day * (CELL_SIZE + PADDING);

                        ctx.fillStyle = "#ffffff";
                        ctx.font = "bold 20px sans-serif";
                        ctx.textAlign = "right";
                        ctx.textBaseline = "middle";
                        ctx.fillText(DAY_LABELS[day], LABEL_W - 16, y + CELL_SIZE / 2);

                        for (let hour = 0; hour < COLS; hour++) {
                            const x = LABEL_W + PADDING + hour * (CELL_SIZE + PADDING);
                            const count = matrix[day][hour];

                            ctx.fillStyle = getColor(count);
                            ctx.beginPath();
                            ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 6); 
                            ctx.fill();

                            if (count > 0) {
                                ctx.fillStyle = "#ffffff";
                                ctx.font = "bold 18px sans-serif";
                                ctx.textAlign = "center";
                                ctx.textBaseline = "middle";
                                ctx.fillText(count.toString(), x + CELL_SIZE / 2, y + CELL_SIZE / 2);
                            }
                        }
                    }

                    const legendY = HEADER_H + ROWS * (CELL_SIZE + PADDING) + PADDING + 25;
                    ctx.font = "18px sans-serif";
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    let legendX = LABEL_W;

                    ctx.fillStyle = "#b5bac1";
                    ctx.fillText("Disponibilidade:", 15, legendY + 15);

                    for (const item of HEAT_COLORS) {
                        ctx.fillStyle = item.color;
                        ctx.beginPath();
                        ctx.roundRect(legendX, legendY, 30, 30, 6);
                        ctx.fill();

                        ctx.fillStyle = "#ffffff";
                        ctx.fillText(`${item.label} Players`, legendX + 40, legendY + 15);
                        legendX += 140;
                    }

                    return canvas.toBuffer();
                };

                const buffer = await renderHeatmap(matrix);
                const attachment = new AttachmentBuilder(buffer, { name: "heatmap.png" });

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("📊 Mapa de Calor - Horários do Servidor")
                            .setDescription(`Baseado na agenda de **${totalPlayersComAgenda}** jogadores registrados.\nOs números dentro dos quadrados indicam **quantas pessoas podem jogar naquela hora**.`)
                            .setImage("attachment://heatmap.png")
                            .setColor("#ff5555")
                    ],
                    files: [attachment]
                });
            }

        } catch (err) {
            console.error("Erro no comando agenda:", err);
            const erroMsg = { content: "❌ Ocorreu um erro no sistema de horários.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) await interaction.followUp(erroMsg).catch(()=>{});
            else await interaction.reply(erroMsg).catch(()=>{});
        }
    }
};