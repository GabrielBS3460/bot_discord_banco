const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("apostar")
        .setDescription("Faça sua aposta no Jogo do Bicho de Arton!")
        .addNumberOption(option => 
            option.setName("valor")
                .setDescription("Valor da aposta em Kwanzas")
                .setRequired(true)
                .setMinValue(0.1) 
        )
        .addStringOption(option => 
            option.setName("tipo")
                .setDescription("O tipo da sua aposta")
                .setRequired(true)
                .addChoices(
                    { name: "Dezena (2 dígitos)", value: "DEZENA" },
                    { name: "Centena (3 dígitos)", value: "CENTENA" },
                    { name: "Milhar (4 dígitos)", value: "MILHAR" }
                )
        )
        .addStringOption(option => 
            option.setName("numero")
                .setDescription("Número apostado (Ex: 00 para dezena, 123 para centena)")
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("posicao")
                .setDescription("Posição do prêmio que deseja concorrer")
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

    async execute({ interaction, prisma, getPersonagemAtivo, BICHOS_T20 }) {
        const char = await getPersonagemAtivo(interaction.user.id);

        if (!char) {
            return interaction.reply({ 
                content: "🚫 Você não tem um personagem ativo.", 
                ephemeral: true 
            });
        }

        const valor = interaction.options.getNumber("valor");
        const tipo = interaction.options.getString("tipo");
        let numero = interaction.options.getString("numero");
        const posicaoBanco = interaction.options.getString("posicao");

        if (char.saldo < valor) {
            return interaction.reply({ 
                content: `💸 Saldo insuficiente. Você possui apenas K$ ${char.saldo.toFixed(2)}.`, 
                ephemeral: true 
            });
        }

        if (!/^\d+$/.test(numero)) {
            return interaction.reply({ 
                content: "🔢 Número inválido. Digite apenas números, sem letras ou símbolos.", 
                ephemeral: true 
            });
        }

        if (tipo === "DEZENA") {
            if (numero.length > 2) {
                return interaction.reply({ content: "⚠️ Para **Dezena** use apenas 2 dígitos (00-99).", ephemeral: true });
            }
            numero = numero.padStart(2, "0");
            
            if (!BICHOS_T20[numero]) {
                return interaction.reply({ content: "⚠️ Bicho inválido (00-99).", ephemeral: true });
            }
        } 
        else if (tipo === "CENTENA") {
            if (numero.length > 3) {
                return interaction.reply({ content: "⚠️ Para **Centena** use até 3 dígitos.", ephemeral: true });
            }
            numero = numero.padStart(3, "0");
        } 
        else if (tipo === "MILHAR") {
            if (numero.length > 4) {
                return interaction.reply({ content: "⚠️ Para **Milhar** use até 4 dígitos.", ephemeral: true });
            }
            numero = numero.padStart(4, "0");
        }

        try {
            await prisma.$transaction([
                prisma.personagens.update({
                    where: { id: char.id },
                    data: { saldo: { decrement: valor } }
                }),
                prisma.apostasBicho.create({
                    data: {
                        personagem_id: char.id,
                        tipo: tipo,
                        numero: numero,
                        posicao: posicaoBanco,
                        valor: valor,
                        status: "PENDENTE"
                    }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: char.id,
                        descricao: `Jogo do Bicho: ${tipo} ${numero}`,
                        valor: valor,
                        tipo: "GASTO"
                    }
                })
            ]);

            const nomeBicho = tipo === "DEZENA" ? `(${BICHOS_T20[numero]})` : "";
            const posicaoTexto = posicaoBanco === "TODAS" ? "1º ao 5º" : `${posicaoBanco}º prêmio`;

            return interaction.reply({
                content: `🎫 **Aposta Registrada!**\n` +
                         `👤 Apostador: ${char.nome}\n` +
                         `💰 Valor: K$ ${valor}\n` +
                         `🎲 Jogo: ${tipo} **${numero}** ${nomeBicho}\n` +
                         `📍 Posição: ${posicaoTexto}`
            });

        } catch (err) {
            console.error("Erro no comando apostar:", err);
            
            const erroMsg = { content: "❌ Ocorreu um erro ao registrar sua aposta.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(erroMsg).catch(()=>{});
            } else {
                await interaction.reply(erroMsg).catch(()=>{});
            }
        }
    }
};