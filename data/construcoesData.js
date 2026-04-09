module.exports = {
    // ==========================================
    // CONSTRUÇÕES DE NOBREZA (Obras Civis Gerais)
    // ==========================================
    "Adega": { custo: 4, tipo: "Nobreza", beneficio: "+3 pontos de mana", req: null, reqTerreno: null },
    "Aqueduto": { custo: 15, tipo: "Nobreza", beneficio: "Rola duas vezes para encontros aleatórios e usa o melhor", req: null, reqTerreno: null },
    "Banhos Públicos": { custo: 7, tipo: "Nobreza", beneficio: "+5 em testes de governar", req: null, reqTerreno: null },
    "Biblioteca": { custo: 10, tipo: "Nobreza", beneficio: "Torna-se treinado em uma perícia", req: null, reqTerreno: null },
    "Universidade": { custo: 25, tipo: "Nobreza", beneficio: "Recebe um poder geral", req: null, reqTerreno: null },
    "Botica": { custo: 3, tipo: "Nobreza", beneficio: "+1 em Fortitude", req: null, reqTerreno: null },
    "Cabana de Caça": { custo: 2, tipo: "Nobreza", beneficio: "Dano de Marca da Presa aumenta em um passo", req: null, reqTerreno: null },
    "Cadafalso": { custo: 1, tipo: "Nobreza", beneficio: "+2 em Intimidação", req: null, reqTerreno: null },
    "Campo de Treinamento": { custo: 2, tipo: "Nobreza", beneficio: "Recruta milícia", req: null, reqTerreno: null },
    "Corte de Lei": { custo: 5, tipo: "Nobreza", beneficio: "Rola dois dados em testes de resistência mental", req: null, reqTerreno: null },
    "Curtume": { custo: 4, tipo: "Nobreza", beneficio: "+2 na Defesa de capangas", req: null, reqTerreno: null },
    "Estátua": { custo: 2, tipo: "Nobreza", beneficio: "Aumenta limite de PM em +1", req: null, reqTerreno: null },
    "Estrada": { custo: 10, tipo: "Nobreza", beneficio: "+2 em Iniciativa", req: null, reqTerreno: null },
    "Estalagem": { custo: 8, tipo: "Nobreza", beneficio: "Uma ação padrão extra uma vez por aventura", req: "Estrada", reqTerreno: null },
    "Fazenda": { custo: 2, tipo: "Nobreza", beneficio: "+1d6 -2 LO por turno", req: null, reqTerreno: null },
    "Celeiro": { custo: 3, tipo: "Nobreza", beneficio: "Elimina penalidade da fazenda", req: "Fazenda", reqTerreno: null },
    "Moinho": { custo: 5, tipo: "Nobreza", beneficio: "Muda dado da fazenda para d8", req: "Fazenda", reqTerreno: null },
    "Feira": { custo: 5, tipo: "Nobreza", beneficio: "+1d4 LO por turno", req: null, reqTerreno: null },
    "Mercado": { custo: 10, tipo: "Nobreza", beneficio: "Muda ganho da feira para 1d8 LO", req: "Feira", reqTerreno: null },
    "Forja": { custo: 6, tipo: "Nobreza", beneficio: "+1 nas rolagens de dano de capangas", req: null, reqTerreno: null },
    "Forte": { custo: 10, tipo: "Nobreza", beneficio: "Fortificação +2", req: null, reqTerreno: null },
    "Armorial": { custo: 3, tipo: "Nobreza", beneficio: "Diminui custo de Orgulho em -1 PM", req: "Forte", reqTerreno: null },
    "Castelo": { custo: 25, tipo: "Nobreza", beneficio: "Muda fortificação do forte para +5", req: "Forte", reqTerreno: null },
    "Ordem de Cavalaria": { custo: 20, tipo: "Nobreza", beneficio: "Diminui custo de Baluarte em -1 PM", req: "Forte", reqTerreno: null },
    "Sala do Trono": { custo: 5, tipo: "Nobreza", beneficio: "+2 em Diplomacia", req: "Forte", reqTerreno: null },
    "Madeireira": { custo: 15, tipo: "Nobreza", beneficio: "+1d8 LO, -10% em eventos", req: null, reqTerreno: "Floresta" },
    "Masmorra": { custo: 20, tipo: "Nobreza", beneficio: "+2 na CD de habilidades de classe (exceto magias)", req: null, reqTerreno: null },
    "Mina": { custo: 20, tipo: "Nobreza", beneficio: "+1d12 LO, -20% em eventos", req: null, reqTerreno: ["Montanha", "Subterrâneo"] },
    "Obra de Arte": { custo: 3, tipo: "Nobreza", beneficio: "+1 em Vontade", req: null, reqTerreno: null },
    "Oficina": { custo: 2, tipo: "Nobreza", beneficio: "+2 em Ofício", req: null, reqTerreno: null },
    "Sede de Guilda": { custo: 15, tipo: "Nobreza", beneficio: "Adiciona melhoria a um item 1x/aventura", req: "Oficina", reqTerreno: null },
    "Palácio": { custo: 100, tipo: "Nobreza", beneficio: "Aumenta limite de parceiros em +1", req: null, reqTerreno: null },
    "Paliçada": { custo: 4, tipo: "Nobreza", beneficio: "Fortificação +2", req: null, reqTerreno: null },
    "Muralha": { custo: 10, tipo: "Nobreza", beneficio: "Muda fortificação da paliçada para +5", req: "Paliçada", reqTerreno: null },
    "Poço de Piche": { custo: 6, tipo: "Nobreza", beneficio: "Bônus em alquímicos", req: null, reqTerreno: "Pântano" },
    "Porto": { custo: 10, tipo: "Nobreza", beneficio: "Ganha 1d6 LO por turno", req: null, reqTerreno: "Rio ou Mar" },
    "Docas": { custo: 4, tipo: "Nobreza", beneficio: "Bônus de Audácia +1", req: "Porto", reqTerreno: null },
    "Povoado Afastado": { custo: 4, tipo: "Nobreza", beneficio: "Permite construção de outro terreno", req: null, reqTerreno: null },
    "Quarto Luxuoso": { custo: 2, tipo: "Nobreza", beneficio: "+5 pontos de vida", req: null, reqTerreno: null },
    "Torre de Vigia": { custo: 2, tipo: "Nobreza", beneficio: "+2 em Percepção", req: null, reqTerreno: null },

    // ==========================================
    // CONSTRUÇÕES DE GUERRA
    // ==========================================
    "Canil": { custo: 4, tipo: "Guerra", beneficio: "Recruta cães de guerra", req: null, reqTerreno: null },
    "Estrebaria": { custo: 10, tipo: "Guerra", beneficio: "Recebe montaria", req: null, reqTerreno: null },
    "Pista de Justa": { custo: 10, tipo: "Guerra", beneficio: "Recruta cavaleiros", req: null, reqTerreno: null },
    "Pátio de Treinamento": { custo: 6, tipo: "Guerra", beneficio: "+1 em ataque ou proficiência", req: null, reqTerreno: null },
    "Liças": { custo: 2, tipo: "Guerra", beneficio: "Aumenta bônus de Fúria em +1", req: "Pátio de Treinamento", reqTerreno: null },
    "Salão de Guerreiros": { custo: 4, tipo: "Guerra", beneficio: "Diminui custo de Ataque Especial em -1 PM", req: null, reqTerreno: null },
    "Pista de Arquearia": { custo: 2, tipo: "Guerra", beneficio: "Recruta arqueiros", req: null, reqTerreno: null },
    "Posto de Pedágio": { custo: 2, tipo: "Guerra", beneficio: "Aumenta ganho de impostos altos", req: "Estrada", reqTerreno: null },
    "Sala de Mapas": { custo: 8, tipo: "Guerra", beneficio: "Ação de movimento extra no turno 1", req: null, reqTerreno: null },
    "Torre de Guarnição": { custo: 5, tipo: "Guerra", beneficio: "Recruta guardas", req: null, reqTerreno: null },

    // ==========================================
    // CONSTRUÇÕES DE ENGANAÇÃO
    // ==========================================
    "Bazar": { custo: 5, tipo: "Enganação", beneficio: "+10% ao negociar itens comuns", req: null, reqTerreno: null },
    "Caravançará": { custo: 10, tipo: "Enganação", beneficio: "Cria caravanas", req: ["Bazar", "Estrada"], reqTerreno: null },
    "Empório": { custo: 10, tipo: "Enganação", beneficio: "+10% em item especial 1x/aventura", req: "Bazar", reqTerreno: null },
    "Esconderijo": { custo: 8, tipo: "Enganação", beneficio: "Recruta bandidos", req: null, reqTerreno: null },
    "Taverna": { custo: 10, tipo: "Enganação", beneficio: "Interrogar como ação livre", req: null, reqTerreno: null },
    "Antro de Jogatina": { custo: 10, tipo: "Enganação", beneficio: "+2 em Enganação", req: "Taverna", reqTerreno: null },
    "Arena Clandestina": { custo: 15, tipo: "Enganação", beneficio: "Recebe Ataque Furtivo", req: "Taverna", reqTerreno: null },
    "Casa de Prazeres": { custo: 10, tipo: "Enganação", beneficio: "Recebe um favor 1x/aventura", req: "Taverna", reqTerreno: null },
    "Palco": { custo: 4, tipo: "Enganação", beneficio: "+2 em Atuação", req: null, reqTerreno: null },
    "Trupe de Malabaristas": { custo: 4, tipo: "Enganação", beneficio: "+1 em Reflexos", req: null, reqTerreno: null },

    // ==========================================
    // CONSTRUÇÕES DE RELIGIÃO
    // ==========================================
    "Abadia": { custo: 12, tipo: "Religião", beneficio: "Aprende uma magia divina", req: null, reqTerreno: null },
    "Capela": { custo: 5, tipo: "Religião", beneficio: "+2 em Religião", req: null, reqTerreno: null },
    "Relicário": { custo: 8, tipo: "Religião", beneficio: "+5 em resistência 1x/aventura", req: "Capela", reqTerreno: null },
    "Mosteiro": { custo: 15, tipo: "Religião", beneficio: "+3 PM (apenas divinos)", req: null, reqTerreno: null },
    "Santuário": { custo: 4, tipo: "Religião", beneficio: "Fornece poder de druida", req: null, reqTerreno: null },
    "Bosque Sagrado": { custo: 5, tipo: "Religião", beneficio: "Companheiro animal não conta no limite", req: "Santuário", reqTerreno: null },
    "Círculo de Pedras": { custo: 10, tipo: "Religião", beneficio: "Atributo de Forma Selvagem +2", req: "Santuário", reqTerreno: null },
    "Templo": { custo: 15, tipo: "Religião", beneficio: "Fornece poder de clérigo", req: null, reqTerreno: null },
    "Altar": { custo: 3, tipo: "Religião", beneficio: "Canalizar energia vira d8", req: "Templo", reqTerreno: null },
    "Catedral": { custo: 20, tipo: "Religião", beneficio: "Dobra efeitos de Missa", req: "Templo", reqTerreno: null },

    // ==========================================
    // CONSTRUÇÕES DE MISTICISMO
    // ==========================================
    "Estante de Pergaminhos": { custo: 12, tipo: "Misticismo", beneficio: "Aprende uma magia arcana", req: null, reqTerreno: null },
    "Poço de Adivinhação": { custo: 10, tipo: "Misticismo", beneficio: "Rola 2d20 e usa o melhor 1x/aventura", req: null, reqTerreno: null },
    "Salão dos Mistérios": { custo: 15, tipo: "Misticismo", beneficio: "+2 em Misticismo", req: null, reqTerreno: null },
    "Pedra de Maldições": { custo: 6, tipo: "Misticismo", beneficio: "Alvo sofre -5 na res. 1x/aventura", req: "Salão dos Mistérios", reqTerreno: null },
    "Sala de Meditação": { custo: 5, tipo: "Misticismo", beneficio: "+3 PM (apenas arcanos)", req: null, reqTerreno: null },
    "Torre de Estudos": { custo: 10, tipo: "Misticismo", beneficio: "Fornece poder de arcanista", req: null, reqTerreno: null },
    "Arena Arcana": { custo: 6, tipo: "Misticismo", beneficio: "+1 dano por dado de Raio Arcano", req: "Salão dos Mistérios", reqTerreno: null },
    "Câmara Mística": { custo: 15, tipo: "Misticismo", beneficio: "Usa poder de aprimoramento s/ custo 1x/av", req: "Torre de Estudos", reqTerreno: null },
    "Círculo de Poder": { custo: 10, tipo: "Misticismo", beneficio: "+1 CD em magias arcanas", req: null, reqTerreno: null },
    "Linhas Místicas": { custo: 25, tipo: "Misticismo", beneficio: "Recuperação de PM +1/nível", req: null, reqTerreno: null }
};