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

    #getRangeByRoll(data, roll, bonus = 0, moreThanHundred = false) {
        console.log(`Roll: ${roll}, Bonus: ${bonus}`);
        let dHundredRollWithBonus;
        if (!moreThanHundred) {
            dHundredRollWithBonus = roll + bonus > 100 ? 100 : roll + bonus < 1 ? 1 : roll + bonus;
        } else {
            dHundredRollWithBonus = roll + bonus;
        }
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

    async gerarRiquezas(type, bonus = 0) {
        const filePath = path.join(__dirname, "../data/tesouroData/riqueza_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)[type];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, bonus ? 20 : 0);

        console.log(JSON.stringify(result));

        const title = `Riqueza ${type.charAt(0).toUpperCase() + type.slice(1)} ${bonus ? "+%" : ""}`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, bonus ? 20 : 0, result.faixa);

        const riquezaRoll = this.#rollNdXpY(result.recompensa.dados).total;

        const resultText = `K$\` ${riquezaRoll} \`x${result.recompensa.multiplicador} = K$${riquezaRoll * result.recompensa.multiplicador}`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText
        };
    }

    async gerarItemDiverso() {
        const filePath = path.join(__dirname, "../data/tesouroData/item_diverso_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData);

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, 0);

        const title = `Item Diverso`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, 0, result.faixa);
        const resultText = `${result.item}`;
        const footerText = `${result.livro} - Página ${result.pagina}`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText,
            footerText: footerText
        };
    }

    async gerarEquipamento(type) {
        const filePath = path.join(__dirname, "../data/tesouroData/equipamentos_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)[type];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, 0);

        const title = `Equipamento`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, 0, result.faixa);
        const resultText = `${result.item}`;
        const footerText = `${result.livro} - Página ${result.pagina}`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText,
            footerText: footerText
        };
    }

    async gerarPocao(bonus = 0) {
        const filePath = path.join(__dirname, "../data/tesouroData/pocao_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData);

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, bonus ? 20 : 0, true);

        console.log(JSON.stringify(result));

        const title = `Poção ${bonus ? "+%" : ""}`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, bonus ? 20 : 0, result.faixa);
        const resultText = `${result.item} [K$${result.valor_compra}]\n\n*Valor de Venda: K$${result.valor_venda}*`;
        const footerText = `${result.livro} - Página ${result.pagina}`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText,
            footerText: footerText
        };
    }

    async gerarMelhoria(type) {
        const filePath = path.join(__dirname, "../data/tesouroData/melhorias_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)[type];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, 0);

        console.log(JSON.stringify(result));

        const typeFormated =
            type === "armas" ? "de Arma" : type === "armaduras_e_escudos" ? "de Armadura e/ou Escudo" : "de Esotérico";

        const title = `Melhoria ${typeFormated}`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, 0, result.faixa);
        if (result.item === "Material especial") {
            const materialRoll = this.#rollNdXpY("1d6").total;
            const materialName = [
                "Aço-rubi",
                "Adamante",
                "Gelo Eterno",
                "Madeira de Tollon",
                "Matéria Vermelha",
                "Mitral"
            ][materialRoll - 1];
            if (materialName) result.item += ` (${materialName})`;
        }
        const resultText = `${result.item}${result.item.includes("*") ? "\n*[Conta como duas melhorias.]*" : ""}`;
        const footerText = `${result.livro} - Página ${result.pagina}`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText,
            footerText: footerText
        };
    }

    async gerarEncanto(type) {
        const filePath = path.join(__dirname, "../data/tesouroData/encanto_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)[type];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, 0);

        console.log(JSON.stringify(result));

        const typeFormated =
            type === "armas" ? "de Arma" : type === "armaduras_e_escudos" ? "de Armadura e/ou Escudo" : "de Esotérico";

        const title = `Encanto ${typeFormated}`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, 0, result.faixa);

        const starsCount = (result.item.match(/\*/g) || []).length;
        let resultText = result.item.replace(/\*/g, "");
        if (type === "armas" || (type === "esotericos" && starsCount !== 0)) {
            if (starsCount === 1) resultText += "\n*[Conta como dois encantos.]*";
        } else if (type === "armaduras_e_escudos" && starsCount !== 0) {
            if (starsCount === 1) resultText += " (Armadura)";
            if (starsCount === 2) resultText += " (Escudo)";
            if (starsCount === 3) resultText += "\n*[Conta como dois encantos.]*";
        }

        let footerText = result.livro;
        footerText += result.pagina
            ? ` - Página ${result.pagina}`
            : ` | Use /tesouro item_especifico tipo:${type === "armas" ? "Arma" : type === "armaduras_e_escudos" ? "Armadura e Escudo" : "Esoterico"}.`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText,
            footerText: footerText
        };
    }

    async gerarItemEspecifico(type) {
        const filePath = path.join(__dirname, "../data/tesouroData/especifico_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)[type];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, 0);

        console.log(JSON.stringify(result));

        const title =
            type === "armas"
                ? "Arma Especifica"
                : type === "armaduras_e_escudos"
                  ? "Armadura e/ou Escudo Especifico"
                  : "Esotérico Especifico";
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, 0, result.faixa);
        const resultText = `${result.item}`;
        const footerText = `${result.livro} - Página ${result.pagina}`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText,
            footerText: footerText
        };
    }

    async gerarAcessorio(level) {
        const filePath = path.join(__dirname, "../data/tesouroData/acessorios_data.json");
        const jsonData = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(jsonData)[level];

        const dHundredRoll = this.#rollDHundred();
        const result = this.#getRangeByRoll(data, dHundredRoll, 0);

        console.log(JSON.stringify(result));

        const title = `Acessório ${level.charAt(0).toUpperCase() + level.slice(1)}`;
        const { dHundredRollText, resultTitle } = this.#buildRollMeta(dHundredRoll, 0, result.faixa);
        const resultText = `${result.item} [K$${result.valor_compra}]\n\n*Valor de Venda: K$${result.valor_venda}*`;
        const footerText = `${result.livro} - Página ${result.pagina}`;

        return {
            title: title,
            dHundredRollText: dHundredRollText,
            resultTitle: resultTitle,
            resultText: resultText,
            footerText: footerText
        };
    }
}

module.exports = new TesouroService();
