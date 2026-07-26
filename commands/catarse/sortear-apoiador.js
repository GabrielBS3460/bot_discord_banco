const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const catarseRepo = require("../../repositories/CatarseRepository.js");
const catarseService = require("../../services/CatarseService.js");

function getRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

async function execute({ interaction, ID_CARGO_ADMIN, ID_CARGO_MOD, ID_CARGO_CORRETOR }) {
    const temPermissao =
        interaction.member.roles.cache.has(ID_CARGO_ADMIN) ||
        interaction.member.roles.cache.has(ID_CARGO_MOD) ||
        interaction.member.roles.cache.has(ID_CARGO_CORRETOR);

    if (!temPermissao) {
        return interaction.reply({
            content: "🚫 Você não tem permissão para usar este comando.",
            flags: MessageFlags.Ephemeral
        });
    }

    const linkedEmails = await catarseRepo.listarEmails();

    if (linkedEmails.length === 0) {
        return interaction.reply({ content: "Não há apoiadores com email conectado para sortear.", flags: MessageFlags.Ephemeral });
    }

    const subscribers = await catarseRepo.listarAssinantes();
    const subscriberByEmail = new Map(
        subscribers.map(item => [catarseService.normalizeEmail(item.email), item]),
    );

    const winner = getRandomItem(linkedEmails);
    const winnerSubscriber = subscriberByEmail.get(catarseService.normalizeEmail(winner.email));

    const embed = new EmbedBuilder()
        .setColor(0x37b24d)
        .setTitle("Resultado Do Sorteio De Apoiador")
        .setDescription("Temos um vencedor!")
        .addFields(
            { name: "Apoiador sorteado", value: `<@${winner.userId}>`, inline: false },
            {
                name: "Status de apoio",
                value: String((winnerSubscriber && winnerSubscriber.status) || "Desconhecido"),
                inline: true,
            },
            { name: "Participantes", value: String(linkedEmails.length), inline: true },
        )
        .setFooter({ text: `Sorteado por ${interaction.user.username}` })
        .setTimestamp();

    return interaction.reply({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin-catarse-sortear-apoiador")
        .setDescription("Sorteia aleatoriamente um apoiador com email conectado"),
    execute,
};
