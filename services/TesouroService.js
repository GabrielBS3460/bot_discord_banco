const fs = require("fs/promises");
const path = require("path");
const { text } = require("stream/consumers");

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

    #getEquipmentTypeText(roll) {
        return roll <= 3 ? "[Arma]" : roll <= 5 ? "[Armadura]" : "[Esotérico]";
    }

    #getMagicItemTypeText(roll) {
        return roll <= 2 ? "[Arma]" : roll === 3 ? "[Armadura]" : roll === 4 ? "[Esotérico]" : "[Acessório]";
    }

    #getItemTypeText(item) {
        const isEquipment = ["Equipamento", "Superior"].includes(item.categoria);
        const isMagic = item.categoria === "Mágico";
        if (!isEquipment && !isMagic) return "";

        const getTypeText = isEquipment ? this.#getEquipmentTypeText : this.#getMagicItemTypeText;
        const firstTypeText = getTypeText.call(this, this.#rollNdXpY("1d6").total);
        if (!item.duas_rolagens) return firstTypeText;

        const secondTypeText = getTypeText.call(this, this.#rollNdXpY("1d6").total);
        return secondTypeText !== firstTypeText ? `${firstTypeText} ou ${secondTypeText}` : firstTypeText;
    }

    #buildRollMeta(dHundredRoll, bonus, faixa) {
        const bonusText = bonus ? (bonus > 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`) : "";
        const dHundredRollText = `\` ${dHundredRoll + bonus} \` ⟵ [${dHundredRoll}] 1d100${bonusText}`;
        const resultTitle = `Resultado (${faixa.min} - ${faixa.max})`;

        return { bonusText, dHundredRollText, resultTitle };
    }

    async gerarDinheiro(value = "?", bonus = 0) {
        const filePath = path.join(__dirname, "../data/tesouroData/dinheiro_item_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)["Dinheiro"][value];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, bonus);

        console.log(JSON.stringify(result));

        const title = `Dinheiro ND ${value}`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, bonus, result.faixa);

        if (result.recompensa === null || !result.recompensa) {
            return {
                title: title,
                dHundredRollText: dHundredRollText,
                resultTitle: resultTitle,
                resultText: "Nenhuma recompensa encontrada."
            };
        }

        let quantityRoll = 1;
        if (result.recompensa.dados && result.recompensa.dados.includes("d")) {
            console.log("Rolando quantidade com base em:", result.recompensa.dados);
            const quantity = result.recompensa.dados;
            quantityRoll = this.#rollNdXpY(quantity).total;
        }

        let resultText;
        if (["TC", "T$", "TO"].includes(result.recompensa.tipo)) {
            resultText = `${result.recompensa.tipo} \` ${quantityRoll} \`x${result.recompensa.multiplicador} = ${result.recompensa.tipo}${quantityRoll * result.recompensa.multiplicador}`;
        } else {
            resultText = `**${quantityRoll}**x ${result.recompensa.tipo} ${result.recompensa.porcentagem_extra ? `+%` : ""}`;
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

        const title = `Itens ND ${value}`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, bonus, result.faixa);

        if (result.item === null || !result.item) {
            return {
                title: title,
                dHundredRollText: dHundredRollText,
                resultTitle: resultTitle,
                resultText: "Nenhum item encontrado.",
                itemTypeText: ""
            };
        }

        let quantityText = "**1**x ";
        if (result.item.dados && result.item.dados.includes("d")) {
            const quantity = result.item.dados;
            const quantityRoll = this.#rollNdXpY(quantity).total;
            quantityText = `**${quantityRoll}**x `;
        }

        let resultText = `${quantityText}${result.item.categoria}`;
        if (result.item.categoria === "Superior")
            resultText += ` (${result.item.melhorias} ${"melhoria" + (result.item.melhorias > 1 ? "s" : "")})`;
        if (result.item.categoria === "Mágico") resultText += ` (${result.item.raridade})`;

        resultText += `${result.item.porcentagem_extra ? ` +%` : ""}${result.item.duas_rolagens ? ` 2D` : ""}`;

        const itemTypeText = this.#getItemTypeText(result.item);

        return { title, dHundredRollText, resultTitle, resultText, itemTypeText };
    }

    gerarRiquezas(tipo) {
        return { title: this.criarTitulo("Riquezas", { tamanho: tipo }) };
    }

    gerarItemDiverso() {
        return { title: "Item Diverso" };
    }

    gerarEquipamento(tipo) {
        return { title: this.criarTitulo("Equipamento", { equipamento: tipo }) };
    }

    gerarPocao() {
        return { title: "Pocao" };
    }

    gerarMelhoria(tipo) {
        return { title: this.criarTitulo("Melhoria", { equipamento: tipo }) };
    }

    gerarEncanto(tipo) {
        return { title: this.criarTitulo("Encanto", { equipamento: tipo }) };
    }

    gerarItemEspecifico(tipo) {
        return { title: this.criarTitulo("Item Especifico", { equipamento: tipo }) };
    }

    gerarAcessorio(nivel) {
        return { title: this.criarTitulo("Acessorio", { tamanho: nivel }) };
    }

    criarTitulo(base, { tamanho, equipamento } = {}) {
        if (tamanho) return `${base} ${TIPOS_TAMANHO[tamanho]}`;
        if (equipamento) return `${base} ${TIPOS_EQUIPAMENTO[equipamento]}`;
        return base;
    }
}

module.exports = new TesouroService();
