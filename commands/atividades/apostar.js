const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ApostaService = require("../../services/ApostaService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("apostar")
        .setDescription("Faça sua aposta no Jogo do Bicho do Herdeiros das Cinzas!")
        .addNumberOption(opt =>
            opt.setName("valor").setDescription("Valor em Kwanzas").setRequired(true).setMinValue(0.1)
        )
        .addStringOption(opt =>
            opt
                .setName("tipo")
                .setDescription("Tipo da aposta")
                .setRequired(true)
                .addChoices(
                    { name: "Dezena (2 dígitos)", value: "DEZENA" },
                    { name: "Centena (3 dígitos)", value: "CENTENA" },
                    { name: "Milhar (4 dígitos)", value: "MILHAR" }
                )
        )
        .addStringOption(opt => opt.setName("numero").setDescription("Número apostado").setRequired(true))
        .addStringOption(opt =>
            opt
                .setName("posicao")
                .setDescription("Posição do prêmio")
                .setRequired(true)
                .addChoices(
                    { name: "1º Prêmio (Cabeça)", value: "1" },
                    { name: "2º Prêmio", value: "2" },
                    { name: "3º Prêmio", value: "3" },
                    { name: "4º Prêmio", value: "4" },
                    { name: "5º Prêmio", value: "5" },
                    { name: "Do 1º ao 5º (Todos)", value: "TODAS" }
                )
        ),

    async execute({ interaction, getPersonagemAtivo, BICHOS_T20 }) {
        const char = await getPersonagemAtivo(interaction.user.id);
        if (!char) return interaction.reply({ content: "🚫 Sem personagem ativo.", flags: MessageFlags.Ephemeral });

        const valor = interaction.options.getNumber("valor");
        const tipo = interaction.options.getString("tipo");
        let numero = interaction.options.getString("numero");
        const posicaoBanco = interaction.options.getString("posicao");

        if (!/^\d+$/.test(numero)) {
            return interaction.reply({ content: "🔢 Digite apenas números.", flags: MessageFlags.Ephemeral });
        }

        if (tipo === "DEZENA") {
            if (numero.length > 2)
                return interaction.reply({ content: "⚠️ Use 2 dígitos.", flags: MessageFlags.Ephemeral });
            numero = numero.padStart(2, "0");
            if (!BICHOS_T20[numero])
                return interaction.reply({ content: "⚠️ Bicho inválido.", flags: MessageFlags.Ephemeral });
        } else if (tipo === "CENTENA") {
            if (numero.length > 3)
                return interaction.reply({ content: "⚠️ Use até 3 dígitos.", flags: MessageFlags.Ephemeral });
            numero = numero.padStart(3, "0");
        } else if (tipo === "MILHAR") {
            if (numero.length > 4)
                return interaction.reply({ content: "⚠️ Use até 4 dígitos.", flags: MessageFlags.Ephemeral });
            numero = numero.padStart(4, "0");
        }

        try {
            await ApostaService.registrarApostaBicho(char, { valor, tipo, numero, posicao: posicaoBanco });

            const nomeBicho = tipo === "DEZENA" ? `(${BICHOS_T20[numero]})` : "";
            const posicaoTexto = posicaoBanco === "TODAS" ? "1º ao 5º" : `${posicaoBanco}º prêmio`;

            return interaction.reply({
                content: `🎫 **Aposta Registrada!**\n👤 Apostador: ${char.nome}\n💰 Valor: K$ ${valor}\n🎲 Jogo: ${tipo} **${numero}** ${nomeBicho}\n📍 Posição: ${posicaoTexto}`
            });
        } catch (err) {
            if (err.message === "SALDO_INSUFICIENTE") {
                return interaction.reply({
                    content: `💸 Saldo insuficiente (K$ ${char.saldo.toFixed(2)}).`,
                    flags: MessageFlags.Ephemeral
                });
            }
            console.error(err);
            interaction.reply({ content: "❌ Erro ao registrar aposta.", flags: MessageFlags.Ephemeral });
        }
    }
};
