const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require("discord.js");
const catarseRepo = require("../../repositories/CatarseRepository.js");
const catarseService = require("../../services/CatarseService.js");

const DISCONNECT_BUTTON_PREFIX = "disconnect_catarse_email";

function buildDisconnectButton(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${DISCONNECT_BUTTON_PREFIX}:${userId}`)
            .setLabel("Desconectar")
            .setStyle(ButtonStyle.Danger),
    );
}

function formatMonths(value) {
    if (!Number.isFinite(value)) return "Indisponível";
    return `${value.toFixed(1).replace(".", ",")} meses`;
}

function formatRoleName(roleConfig) {
    return roleConfig ? roleConfig.cargo_nome : "Sem cargo elegível";
}

function buildConnectedEmbed(email) {
    return new EmbedBuilder()
        .setColor(0xf08c00)
        .setTitle("Email já conectado")
        .setDescription("Você já possui um email de Catarse conectado.")
        .addFields({ name: "Email conectado", value: email })
        .setTimestamp();
}

function buildStatusEmbed(email, apoioStatus, supportMonths, roleConfig) {
    const embed = new EmbedBuilder()
        .setColor(0x1c7ed6)
        .setTitle("Status Da Conexão Do Catarse")
        .addFields(
            { name: "Email conectado", value: email || "Nenhum", inline: false },
            { name: "Tempo de apoio", value: formatMonths(supportMonths), inline: false },
            { name: "Cargo atual", value: formatRoleName(roleConfig), inline: false },
        )
        .setTimestamp();

    if (apoioStatus) {
        embed.addFields({ name: "Status de apoio", value: String(apoioStatus), inline: false });
    }

    return embed;
}

function buildSuccessEmbed(email) {
    return new EmbedBuilder()
        .setColor(0x2b8a3e)
        .setTitle("Catarse conectado")
        .setDescription("Seu email foi conectado com sucesso.")
        .addFields({ name: "Email", value: email })
        .setTimestamp();
}

async function execute({ interaction }) {
    const rawEmail = interaction.options.getString("email", false);
    const email = rawEmail ? catarseService.normalizeEmail(rawEmail) : null;
    const userId = interaction.user.id;

    const existing = await catarseRepo.buscarEmailPorUserId(userId);

    if (!email) {
        if (!existing) {
            return interaction.reply({ embeds: [buildStatusEmbed(null)], flags: MessageFlags.Ephemeral });
        }

        const { subscriber } = await catarseService.getConnectionStats(existing.email);
        const supportMonths = Number(subscriber && subscriber.mesesAssinante);
        const roleConfig = catarseService.getTargetRoleConfig(supportMonths, catarseService.getRoleConfigs());

        return interaction.reply({
            embeds: [buildStatusEmbed(existing.email, subscriber && subscriber.status, supportMonths, roleConfig)],
            components: [buildDisconnectButton(userId)],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (!catarseService.isValidEmail(email)) {
        return interaction.reply({ content: "Informe um email válido.", flags: MessageFlags.Ephemeral });
    }

    if (existing) {
        const { subscriber } = await catarseService.getConnectionStats(existing.email);
        const supportMonths = Number(subscriber && subscriber.mesesAssinante);
        const roleConfig = catarseService.getTargetRoleConfig(supportMonths, catarseService.getRoleConfigs());

        return interaction.reply({
            embeds: [buildConnectedEmbed(existing.email), buildStatusEmbed(existing.email, subscriber && subscriber.status, supportMonths, roleConfig)],
            components: [buildDisconnectButton(userId)],
            flags: MessageFlags.Ephemeral,
        });
    }

    const supportCost = catarseService.getSupportCost();
    if (supportCost <= 0) {
        return interaction.reply({
            content: "Configuração inválida: defina Custo_Apoio (> 0) em data/catarseData/catarse-config.json.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const { subscriber, usedConnections, maxConnections, pagamentoMensal } = await catarseService.getConnectionStats(email);

    if (!subscriber) {
        return interaction.reply({
            content: "Este email não existe em catarse-assinantes. Importe/atualize a planilha antes de conectar.",
            flags: MessageFlags.Ephemeral,
        });
    }

    if (!Number.isFinite(pagamentoMensal) || pagamentoMensal <= 0) {
        return interaction.reply({
            content: "Pagamento_Mensal inválido para este email. Verifique a coluna F da planilha.",
            flags: MessageFlags.Ephemeral,
        });
    }

    if (usedConnections >= maxConnections) {
        return interaction.reply({
            content: `Limite atingido para este email (${usedConnections}/${maxConnections}).`,
            flags: MessageFlags.Ephemeral,
        });
    }

    await catarseRepo.criarEmail({ id: userId, userId, email });

    return interaction.reply({ embeds: [buildSuccessEmbed(email)], flags: MessageFlags.Ephemeral });
}

async function handleButtonInteraction(interaction) {
    if (!interaction.customId.startsWith(`${DISCONNECT_BUTTON_PREFIX}:`)) return false;

    const [, ownerUserId] = interaction.customId.split(":");

    if (ownerUserId !== interaction.user.id) {
        await interaction.reply({ content: "Somente quem conectou este email pode desconectar.", flags: MessageFlags.Ephemeral });
        return true;
    }

    const existing = await catarseRepo.buscarEmailPorUserId(interaction.user.id);

    if (!existing) {
        await interaction.update({ content: "Não existe email conectado para remover.", embeds: [], components: [] });
        return true;
    }

    await catarseRepo.removerEmail(existing.id);

    try {
        await catarseService.removeManagedCatarseRoles(interaction.client, interaction.user.id, interaction.guildId);
    } catch (error) {
        console.error("Erro ao remover cargos do Catarse ao desconectar:", error);
    }

    await interaction.update({ content: "Email desconectado com sucesso. Cargos do Catarse removidos.", embeds: [], components: [] });
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("conectar-catarse")
        .setDescription("Conecta seu email do Catarse")
        .addStringOption(option =>
            option.setName("email").setDescription("Seu email do Catarse").setRequired(false),
        ),
    execute,
    handleButtonInteraction,
};
