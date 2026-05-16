const fs = require("fs/promises");
const path = require("path");

class TesouroService {
    #rollDHundred() {
        // Roll a d100
        return Math.floor(Math.random() * 100) + 1;
    }

    #rollNdXpY(str_dice) {
        // Roll a NdY + Z (e.g., "2d6+3")
        const match = str_dice.match(/(\d+)d(\d+)([+-]\d+)?/);

        const quantidade = Number(match[1]);
        const lados = Number(match[2]);
        const bonus = match[3] ? Number(match[3]) : 0;

        const rolls = Array.from({ length: quantidade }, () => Math.floor(Math.random() * lados) + 1);

        const total = rolls.reduce((sum, value) => sum + value, 0);

        return {
            rolls,
            bonus,
            total: total + bonus
        };
    }

    #getRangeByRoll(data, roll, bonus = 0) {
        const dHundredRollWithBonus = roll + bonus > 100 ? 100 : roll + bonus < 1 ? 1 : roll + bonus;
        return data.find(item => dHundredRollWithBonus >= item.faixa.min && dHundredRollWithBonus <= item.faixa.max);
    }

    async gerarDinheiro(value = "?", bonus = 0) {
        const filePath = path.join(__dirname, "../data/tesouroData/dinheiro_item_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)["Dinheiro"][value];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, bonus);

        console.log(JSON.stringify(result));

        const title = `Dinheiro ND ${value}`;
        const bonusText = bonus ? (bonus > 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`) : "";
        const dHundredRollText = `\` ${dHundredRoll + bonus} \` ⟵ [${dHundredRoll}] 1d100${bonusText}`;
        const resultTitle = `Resultado (${result.faixa.min} - ${result.faixa.max})`;

        if (result.recompensa === null) {
            return {
                title: title,
                dHundredRollText: dHundredRollText,
                resultTitle: resultTitle,
                resultText: "Nenhuma recompensa encontrada."
            };
        }

        const quantity = result.recompensa.dados;
        const quantitylRoll = this.#rollNdXpY(quantity).total;

        let resultText;
        if (["TC", "T$", "TO"].includes(result.recompensa.tipo)) {
            resultText = `${result.recompensa.tipo} \` ${quantitylRoll} \`x${result.recompensa.multiplicador} = ${result.recompensa.tipo}${quantitylRoll * result.recompensa.multiplicador}`;
        } else {
            resultText = `**${quantitylRoll}**x ${result.recompensa.tipo} ${result.recompensa.porcentagem_extra ? `+%` : ""}`;
        }

        return { title, dHundredRollText, resultTitle, resultText };
    }

    async gerarItens(value = "?", bonus = 0) {
        const filePath = path.join(__dirname, "../data/tesouroData/dinheiro_item_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)["Itens"][value];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, bonus);

        console.log(JSON.stringify(result));
        return { titulo: value ? `Itens ${value}` : "Itens" };
    }

    gerarRiquezas(tipo) {
        return { titulo: this.criarTitulo("Riquezas", { tamanho: tipo }) };
    }

    gerarItemDiverso() {
        return { titulo: "Item Diverso" };
    }

    gerarEquipamento(tipo) {
        return { titulo: this.criarTitulo("Equipamento", { equipamento: tipo }) };
    }

    gerarPocao() {
        return { titulo: "Pocao" };
    }

    gerarMelhoria(tipo) {
        return { titulo: this.criarTitulo("Melhoria", { equipamento: tipo }) };
    }

    gerarEncanto(tipo) {
        return { titulo: this.criarTitulo("Encanto", { equipamento: tipo }) };
    }

    gerarItemEspecifico(tipo) {
        return { titulo: this.criarTitulo("Item Especifico", { equipamento: tipo }) };
    }

    gerarAcessorio(nivel) {
        return { titulo: this.criarTitulo("Acessorio", { tamanho: nivel }) };
    }

    criarTitulo(base, { tamanho, equipamento } = {}) {
        if (tamanho) return `${base} ${TIPOS_TAMANHO[tamanho]}`;
        if (equipamento) return `${base} ${TIPOS_EQUIPAMENTO[equipamento]}`;
        return base;
    }
}

module.exports = new TesouroService();
