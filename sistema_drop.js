const DADOS = require("./data/dropData.js");

function rolarDado(faces) {
    return Math.floor(Math.random() * faces) + 1;
}

function pegarItemAleatorio(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function gerarRiqueza(tipo) {
    const lista = DADOS.RIQUEZAS[tipo];
    const item = pegarItemAleatorio(lista);
    return { nome: item.nome, valor: item.val };
}

// ==================================================================================
// FUNÇÃO PRINCIPAL: GERAR DROP
// ==================================================================================

function gerarRecompensa(nd) {
    const ndNum = parseFloat(nd);
    if (isNaN(ndNum)) return { mensagem: "ND Inválido.", valor: 0 };

    const raridade = DADOS.TABELA_RARIDADE(ndNum);

    if (raridade.tipo === "DINHEIRO") {
        const drop = DADOS.DINHEIRO_POR_ND(ndNum);

        if (drop.val !== undefined) {
            if (drop.val === 0) return { mensagem: "🗑️ **Nada encontrado.** (A poeira domina o local)", valor: 0 };

            return {
                mensagem: `💰 **Dinheiro:** T$ ${drop.val}`,
                valor: drop.val
            };
        }

        if (drop.riqueza) {
            let riquezasTexto = [];
            let total = 0;
            for (let i = 0; i < (drop.qtd || 1); i++) {
                const r = gerarRiqueza(drop.riqueza);
                riquezasTexto.push(`- ${r.nome} (Vale T$ ${r.valor})`);
                total += r.valor;
            }
            return {
                mensagem: `💎 **Riquezas Encontradas:**\n${riquezasTexto.join("\n")}\n*(Total T$ ${total})*`,
                valor: total
            };
        }
    }

    const d200 = rolarDado(200);
    let cat = DADOS.CATEGORIAS.find(c => d200 <= c.max).tipo;

    if (raridade.tipo === "MAGIC" && !["ARMAS", "ARMADURAS"].includes(cat)) {
        cat = Math.random() > 0.5 ? "ARMAS" : "ARMADURAS";
    }

    let itemBase = pegarItemAleatorio(DADOS.ITENS[cat]);
    let nomeFinal = itemBase;
    let detalhes = [];

    if (raridade.tipo === "SUPERIOR") {
        let slots = raridade.slots;
        let listaOriginal = [];

        if (cat === "ARMAS") listaOriginal = DADOS.MELHORIAS.ARMAS;
        else if (cat === "ARMADURAS") listaOriginal = DADOS.MELHORIAS.ARMADURAS;
        else if (cat === "ESOTERICOS") listaOriginal = DADOS.MELHORIAS.ESOTERICOS;
        else if (cat === "CONSUMIVEIS") listaOriginal = [];
        else listaOriginal = ["Aprimorado", "Banhado a Ouro", "Cravejado de Joias"];

        let disponiveis = [...listaOriginal];

        if (["ARMAS", "ARMADURAS", "ESOTERICOS"].includes(cat) && Math.random() < 0.1 && slots > 0) {
            const listaMateriais = DADOS.MELHORIAS.MATERIAIS;
            const material = pegarItemAleatorio(listaMateriais);
            detalhes.push(`Material: ${material}`);
            slots--;
        }

        for (let i = 0; i < slots; i++) {
            if (disponiveis.length === 0) break;
            const index = Math.floor(Math.random() * disponiveis.length);
            detalhes.push(disponiveis[index]);
            disponiveis.splice(index, 1);
        }

        nomeFinal = `**${itemBase} Superior** [${slots + (raridade.slots - slots)} mod]`;
    }

    if (raridade.tipo === "MAGIC") {
        let slots = raridade.poder;
        let listaOriginal = cat === "ARMAS" ? DADOS.ENCANTOS.ARMAS : DADOS.ENCANTOS.ARMADURAS;
        let disponiveis = [...listaOriginal];

        let encantosAplicados = [];

        while (slots > 0 && disponiveis.length > 0) {
            const index = Math.floor(Math.random() * disponiveis.length);
            const encanto = disponiveis[index];
            const custaDois = ["Magnífica", "Lancinante", "Energética", "Guardião"].some(n => encanto.includes(n));

            if (custaDois) {
                if (slots >= 2) {
                    encantosAplicados.push(encanto);
                    slots -= 2;
                    disponiveis.splice(index, 1);
                }
            } else {
                encantosAplicados.push(encanto);
                slots -= 1;
                disponiveis.splice(index, 1);
            }
        }

        const grau = raridade.poder === 1 ? "Menor" : raridade.poder === 2 ? "Médio" : "Maior";
        nomeFinal = `✨ **${itemBase} Mágico (${grau})**`;
        detalhes = encantosAplicados;
    }

    if (detalhes.length === 0 && raridade.tipo !== "MAGIC") {
        return { mensagem: `📦 **Item:** ${itemBase} (Comum)`, valor: 0 };
    }

    return {
        mensagem: `${nomeFinal}\n🔸 ${detalhes.join("\n🔸 ")}`,
        valor: 0
    };
}

module.exports = { gerarRecompensa };
