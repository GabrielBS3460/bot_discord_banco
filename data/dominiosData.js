module.exports = {
    TERRENOS: {
        Colinas: { nivelMax: 5, potencialMistico: 5 },
        Deserto: { nivelMax: 4, potencialMistico: 6 },
        Floresta: { nivelMax: 4, potencialMistico: 6, nivelMaxNatureza: 6 },
        Montanha: { nivelMax: 3, potencialMistico: 7 },
        Pântano: { nivelMax: 3, potencialMistico: 7 },
        Planície: { nivelMax: 6, potencialMistico: 4 },
        Subterrâneo: { nivelMax: 2, potencialMistico: 8, nivelMaxSub: 6 },
        "Rio ou mar": { nivelMaxBonus: 1 },
        "Elemento místico": { potencialMisticoBonus: 1 }
    },
    IMPOSTOS: {
        1: { baixo: "1", medio: "1d3", alto: "1d3+1" },
        2: { baixo: "1d3", medio: "1d3+1", alto: "2d4" },
        3: { baixo: "1d4", medio: "2d4", alto: "2d6" },
        4: { baixo: "1d6", medio: "2d4+1", alto: "2d6+2" },
        5: { baixo: "1d8", medio: "2d6", alto: "2d8+2" },
        6: { baixo: "1d10", medio: "2d6+1", alto: "2d10+2" },
        7: { baixo: "1d12", medio: "2d8+1", alto: "2d12+2" }
    },
    MANUTENCAO_CORTE: {
        Inexistente: 0,
        Pobre: 1,
        Comum: 3,
        Rica: 5
    },
    MODIFICADORES_POPULARIDADE: {
        Adorado: 2,
        Popular: 1,
        Tolerado: 0,
        Impopular: -2,
        Odiado: -5
    },
    CONSELHEIROS: {
        Bispo: "Religião",
        "Capitão da Guarda": "Guerra",
        Embaixador: "Diplomacia",
        Espião: "Enganação",
        Falcoeiro: "Sobrevivência",
        Magistrado: "Investigação",
        "Mago da Corte": "Misticismo",
        Menestrel: "Atuação",
        Senescal: "Nobreza"
    }
};
