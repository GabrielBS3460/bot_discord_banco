const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const TesouroService = require("../../services/TesouroService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tesouro")
        .setDescription("Gera tesouros e recompensas por categoria.")
        .addSubcommand(sub =>
            sub
                .setName("dinheiro")
                .setDescription("Gera dinheiro.")
                .addStringOption(option =>
                    option
                        .setName("valor")
                        .setDescription("Valor do tesouro")
                        .setRequired(true)
                        .addChoices(
                            { name: "1/4", value: "1/4" },
                            { name: "1/2", value: "1/2" },
                            { name: "1", value: "1" },
                            { name: "2", value: "2" },
                            { name: "3", value: "3" },
                            { name: "4", value: "4" },
                            { name: "5", value: "5" },
                            { name: "6", value: "6" },
                            { name: "7", value: "7" },
                            { name: "8", value: "8" },
                            { name: "9", value: "9" },
                            { name: "10", value: "10" },
                            { name: "11", value: "11" },
                            { name: "12", value: "12" },
                            { name: "13", value: "13" },
                            { name: "14", value: "14" },
                            { name: "15", value: "15" },
                            { name: "16", value: "16" },
                            { name: "17", value: "17" },
                            { name: "18", value: "18" },
                            { name: "19", value: "19" },
                            { name: "20", value: "20" }
                        )
                )
                .addIntegerOption(option => option.setName("bonus").setDescription("Bonus no d100"))
        )
        .addSubcommand(sub =>
            sub
                .setName("itens")
                .setDescription("Gera itens.")
                .addStringOption(option =>
                    option
                        .setName("valor")
                        .setDescription("Valor do tesouro")
                        .setRequired(true)
                        .addChoices(
                            { name: "1/4", value: "1/4" },
                            { name: "1/2", value: "1/2" },
                            { name: "1", value: "1" },
                            { name: "2", value: "2" },
                            { name: "3", value: "3" },
                            { name: "4", value: "4" },
                            { name: "5", value: "5" },
                            { name: "6", value: "6" },
                            { name: "7", value: "7" },
                            { name: "8", value: "8" },
                            { name: "9", value: "9" },
                            { name: "10", value: "10" },
                            { name: "11", value: "11" },
                            { name: "12", value: "12" },
                            { name: "13", value: "13" },
                            { name: "14", value: "14" },
                            { name: "15", value: "15" },
                            { name: "16", value: "16" },
                            { name: "17", value: "17" },
                            { name: "18", value: "18" },
                            { name: "19", value: "19" },
                            { name: "20", value: "20" }
                        )
                )
                .addIntegerOption(option => option.setName("bonus").setDescription("Bonus no d100"))
        )
        .addSubcommand(sub =>
            sub
                .setName("riquezas")
                .setDescription("Gera riquezas por tamanho.")
                .addStringOption(option =>
                    option
                        .setName("tipo")
                        .setDescription("Tamanho da riqueza")
                        .setRequired(true)
                        .addChoices(
                            { name: "Menor", value: "menor" },
                            { name: "Média", value: "media" },
                            { name: "Maior", value: "maior" }
                        )
                )
                .addBooleanOption(option => option.setName("bonus").setDescription("Bonus de +20% no d100"))
        )
        .addSubcommand(sub => sub.setName("item_diverso").setDescription("Gera um item diverso."))
        .addSubcommand(sub =>
            sub
                .setName("equipamento")
                .setDescription("Gera um equipamento por tipo.")
                .addStringOption(option =>
                    option
                        .setName("tipo")
                        .setDescription("Tipo de equipamento")
                        .setRequired(true)
                        .addChoices(
                            { name: "Arma", value: "armas" },
                            { name: "Armadura e Escudo", value: "armaduras_e_escudos" },
                            { name: "Esoterico", value: "esotericos" }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("pocao")
                .setDescription("Gera uma pocao.")
                .addBooleanOption(option => option.setName("bonus").setDescription("Bonus de +20% no d100"))
        )
        .addSubcommand(sub =>
            sub
                .setName("melhoria")
                .setDescription("Gera uma melhoria por tipo.")
                .addStringOption(option =>
                    option
                        .setName("tipo")
                        .setDescription("Tipo de melhoria")
                        .setRequired(true)
                        .addChoices(
                            { name: "Arma", value: "armas" },
                            { name: "Armadura e Escudo", value: "armaduras_e_escudos" },
                            { name: "Esoterico", value: "esotericos" }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("encanto")
                .setDescription("Gera um encanto por tipo.")
                .addStringOption(option =>
                    option
                        .setName("tipo")
                        .setDescription("Tipo de encanto")
                        .setRequired(true)
                        .addChoices(
                            { name: "Arma", value: "armas" },
                            { name: "Armadura e Escudo", value: "armaduras_e_escudos" },
                            { name: "Esoterico", value: "esotericos" }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("item_especifico")
                .setDescription("Gera um item especifico por tipo.")
                .addStringOption(option =>
                    option
                        .setName("tipo")
                        .setDescription("Tipo de item especifico")
                        .setRequired(true)
                        .addChoices(
                            { name: "Arma", value: "armas" },
                            { name: "Armadura e Escudo", value: "armaduras_e_escudos" },
                            { name: "Esoterico", value: "esotericos" }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("acessorio")
                .setDescription("Gera um acessorio por nivel.")
                .addStringOption(option =>
                    option
                        .setName("nivel")
                        .setDescription("Nivel do acessorio")
                        .setRequired(true)
                        .addChoices(
                            { name: "Menor", value: "menor" },
                            { name: "Medio", value: "medio" },
                            { name: "Maior", value: "maior" }
                        )
                )
        ),

    async execute({ interaction }) {
        const subcomando = interaction.options.getSubcommand();

        const rotas = {
            dinheiro: this.executarDinheiro,
            itens: this.executarItens,
            riquezas: this.executarRiquezas,
            item_diverso: this.executarItemDiverso,
            equipamento: this.executarEquipamento,
            pocao: this.executarPocao,
            melhoria: this.executarMelhoria,
            encanto: this.executarEncanto,
            item_especifico: this.executarItemEspecifico,
            acessorio: this.executarAcessorio
        };

        if (!rotas[subcomando]) return;

        return rotas[subcomando].call(this, interaction);
    },

    async executarDinheiro(interaction) {
        const valor = interaction.options.getString("valor");
        const bonus = interaction.options.getInteger("bonus") || 0;
        const { title, dHundredRollText, resultTitle, resultText } = await TesouroService.gerarDinheiro(valor, bonus);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarItens(interaction) {
        const valor = interaction.options.getString("valor");
        const bonus = interaction.options.getInteger("bonus") || 0;
        const { title, dHundredRollText, resultTitle, resultText, itemTypeText } = await TesouroService.gerarItens(
            valor,
            bonus
        );

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText });

        if (itemTypeText !== "") {
            embed.setFooter({ text: itemTypeText });
        }

        return interaction.reply({ embeds: [embed] });
    },

    async executarRiquezas(interaction) {
        const type = interaction.options.getString("tipo");
        const bonus = interaction.options.getBoolean("bonus");
        const { title, dHundredRollText, resultTitle, resultText } = await TesouroService.gerarRiquezas(type, bonus);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarItemDiverso(interaction) {
        const { title, dHundredRollText, resultTitle, resultText, footerText } =
            await TesouroService.gerarItemDiverso();

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText })
            .setFooter({ text: footerText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarEquipamento(interaction) {
        const type = interaction.options.getString("tipo");
        const { title, dHundredRollText, resultTitle, resultText, footerText } =
            await TesouroService.gerarEquipamento(type);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText })
            .setFooter({ text: footerText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarPocao(interaction) {
        const bonus = interaction.options.getBoolean("bonus");
        const { title, dHundredRollText, resultTitle, resultText, footerText } = await TesouroService.gerarPocao(bonus);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText })
            .setFooter({ text: footerText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarMelhoria(interaction) {
        const type = interaction.options.getString("tipo");
        const { title, dHundredRollText, resultTitle, resultText, footerText } =
            await TesouroService.gerarMelhoria(type);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText })
            .setFooter({ text: footerText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarEncanto(interaction) {
        const type = interaction.options.getString("tipo");
        const { title, dHundredRollText, resultTitle, resultText, footerText } =
            await TesouroService.gerarEncanto(type);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText })
            .setFooter({ text: footerText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarItemEspecifico(interaction) {
        const type = interaction.options.getString("tipo");
        const { title, dHundredRollText, resultTitle, resultText, footerText } =
            await TesouroService.gerarItemEspecifico(type);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText })
            .setFooter({ text: footerText });

        return interaction.reply({ embeds: [embed] });
    },

    async executarAcessorio(interaction) {
        const level = interaction.options.getString("nivel");
        const { title, dHundredRollText, resultTitle, resultText, footerText } =
            await TesouroService.gerarAcessorio(level);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(title)
            .setDescription(dHundredRollText)
            .addFields({ name: resultTitle, value: resultText })
            .setFooter({ text: footerText });

        return interaction.reply({ embeds: [embed] });
    }
};
