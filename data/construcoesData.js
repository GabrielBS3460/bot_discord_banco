module.exports = {
    // ==========================================
    // CONSTRUÇÕES DE NOBREZA
    // ==========================================
    Adega: { custo: 4, tipo: "Nobreza", beneficio: "+3 pontos de mana", req: null, reqTerreno: null },
    Aqueduto: {
        custo: 15,
        tipo: "Nobreza",
        beneficio: "Rola duas vezes encontros aleatórios e escolhe um",
        req: null,
        reqTerreno: null
    },
    "Banhos Públicos": {
        custo: 7,
        tipo: "Nobreza",
        beneficio: "+5 em testes da ação governar",
        req: null,
        reqTerreno: null
    },
    Biblioteca: {
        custo: 10,
        tipo: "Nobreza",
        beneficio: "Torna-se treinado em uma perícia",
        req: null,
        reqTerreno: null
    },
    Universidade: { custo: 25, tipo: "Nobreza", beneficio: "Recebe um poder geral", req: null, reqTerreno: null },
    Botica: { custo: 3, tipo: "Nobreza", beneficio: "+1 em Fortitude", req: null, reqTerreno: null },
    "Cabana de Caça": {
        custo: 2,
        tipo: "Nobreza",
        beneficio: "Dano de Marca da Presa aumenta em um passo",
        req: null,
        reqTerreno: null
    },
    Cadafalso: { custo: 1, tipo: "Nobreza", beneficio: "+2 em Intimidação", req: null, reqTerreno: null },
    "Campo de Treinamento": {
        custo: 2,
        tipo: "Nobreza",
        beneficio: "Permite recrutar milícias",
        req: null,
        reqTerreno: null
    },
    "Corte de Lei": {
        custo: 5,
        tipo: "Nobreza",
        beneficio: "Rola dois dados em testes de resistência mental",
        req: null,
        reqTerreno: null
    },
    Curtume: { custo: 4, tipo: "Nobreza", beneficio: "+2 na Defesa de capangas", req: null, reqTerreno: null },
    Estátua: {
        custo: 2,
        tipo: "Nobreza",
        beneficio: "Máximo de PM por habilidade aumenta em +1",
        req: null,
        reqTerreno: null
    },
    Estrada: { custo: 10, tipo: "Nobreza", beneficio: "+2 em Iniciativa", req: null, reqTerreno: null },
    Estalagem: {
        custo: 8,
        tipo: "Nobreza",
        beneficio: "Uma ação padrão adicional uma vez por aventura",
        req: "Estrada",
        reqTerreno: null
    },
    Fazenda: { custo: 2, tipo: "Nobreza", beneficio: "Gera 1d6-2 LO por turno", req: null, reqTerreno: null },
    Celeiro: {
        custo: 3,
        tipo: "Nobreza",
        beneficio: "Elimina a penalidade no ganho da fazenda (1d6 ou 1d8)",
        req: "Fazenda",
        reqTerreno: null
    },
    Moinho: {
        custo: 5,
        tipo: "Nobreza",
        beneficio: "Ganho da fazenda aumenta para 1d8-2 LO",
        req: "Fazenda",
        reqTerreno: null
    },
    Feira: { custo: 5, tipo: "Nobreza", beneficio: "Gera 1d4 LO por turno", req: null, reqTerreno: null },
    Mercado: {
        custo: 10,
        tipo: "Nobreza",
        beneficio: "Muda o ganho da feira para 1d8 LO",
        req: "Feira",
        reqTerreno: null
    },
    Forja: { custo: 6, tipo: "Nobreza", beneficio: "+1 nas rolagens de dano de capangas", req: null, reqTerreno: null },
    Forte: { custo: 10, tipo: "Nobreza", beneficio: "Fortificação +2", req: null, reqTerreno: null },
    Armorial: {
        custo: 3,
        tipo: "Nobreza",
        beneficio: "Custo de Orgulho diminui em -1 PM",
        req: "Forte",
        reqTerreno: null
    },
    Castelo: {
        custo: 25,
        tipo: "Nobreza",
        beneficio: "Muda bônus de fortificação do forte para +5",
        req: "Forte",
        reqTerreno: null
    },
    "Ordem de Cavalaria": {
        custo: 20,
        tipo: "Nobreza",
        beneficio: "Custo de Baluarte diminui em -1 PM",
        req: "Forte",
        reqTerreno: null
    },
    "Sala do Trono": { custo: 5, tipo: "Nobreza", beneficio: "+2 em Diplomacia", req: "Forte", reqTerreno: null },
    Madeireira: {
        custo: 15,
        tipo: "Nobreza",
        beneficio: "Gera 1d8 LO, -10% em eventos aleatórios",
        req: null,
        reqTerreno: "Floresta"
    },
    Masmorra: {
        custo: 20,
        tipo: "Nobreza",
        beneficio: "+2 na CD de habilidades (exceto magias)",
        req: null,
        reqTerreno: null
    },
    Mina: {
        custo: 20,
        tipo: "Nobreza",
        beneficio: "Gera 1d12 LO, -20% em eventos aleatórios",
        req: null,
        reqTerreno: ["Montanha", "Subterrâneo"]
    },
    "Obra de Arte": { custo: 3, tipo: "Nobreza", beneficio: "+1 em Vontade", req: null, reqTerreno: null },
    Oficina: { custo: 2, tipo: "Nobreza", beneficio: "+2 em Ofício", req: null, reqTerreno: null },
    "Sede de Guilda": {
        custo: 15,
        tipo: "Nobreza",
        beneficio: "Item recebe uma melhoria no início da aventura",
        req: "Oficina",
        reqTerreno: null
    },
    Palácio: {
        custo: 100,
        tipo: "Nobreza",
        beneficio: "Aumenta limite de parceiros em +1",
        req: null,
        reqTerreno: null
    },
    Paliçada: { custo: 4, tipo: "Nobreza", beneficio: "Fortificação +2", req: null, reqTerreno: null },
    Muralha: {
        custo: 10,
        tipo: "Nobreza",
        beneficio: "Muda bônus de fortificação da paliçada para +5",
        req: "Paliçada",
        reqTerreno: null
    },
    "Poço de Piche": {
        custo: 6,
        tipo: "Nobreza",
        beneficio: "+2 na CD de preparados e venenos",
        req: null,
        reqTerreno: "Pântano"
    },
    Porto: { custo: 10, tipo: "Nobreza", beneficio: "Gera 1d6 LO por turno", req: null, reqTerreno: "Rio ou mar" },
    Docas: {
        custo: 4,
        tipo: "Nobreza",
        beneficio: "Bônus de Audácia +1, pode usar em ataques",
        req: "Porto",
        reqTerreno: null
    },
    "Povoado Afastado": {
        custo: 4,
        tipo: "Nobreza",
        beneficio: "Permite construção de outro terreno",
        req: null,
        reqTerreno: null
    },
    "Quarto Luxuoso": { custo: 2, tipo: "Nobreza", beneficio: "+5 pontos de vida", req: null, reqTerreno: null },
    "Torre de Vigia": { custo: 2, tipo: "Nobreza", beneficio: "+2 em Percepção", req: null, reqTerreno: null },

    // ==========================================
    // CONSTRUÇÕES DE GUERRA
    // ==========================================
    Canil: { custo: 4, tipo: "Guerra", beneficio: "Permite recrutar cães de guerra", req: null, reqTerreno: null },
    Estrebaria: {
        custo: 10,
        tipo: "Guerra",
        beneficio: "Recebe cavalo de guerra veterano",
        req: null,
        reqTerreno: null
    },
    "Pista de Justa": {
        custo: 10,
        tipo: "Guerra",
        beneficio: "Permite recrutar cavaleiros",
        req: null,
        reqTerreno: null
    },
    "Pátio de Treinamento": {
        custo: 6,
        tipo: "Guerra",
        beneficio: "Recebe proficiência ou +1 em testes de ataque",
        req: null,
        reqTerreno: null
    },
    Liças: {
        custo: 2,
        tipo: "Guerra",
        beneficio: "Bônus de Fúria ou Fúria Divina aumenta em +1",
        req: "Pátio de Treinamento",
        reqTerreno: null
    },
    "Salão de Guerreiros": {
        custo: 4,
        tipo: "Guerra",
        beneficio: "Custo de Ataque Especial diminui em -1 PM",
        req: null,
        reqTerreno: null
    },
    "Pista de Arquearia": {
        custo: 2,
        tipo: "Guerra",
        beneficio: "Permite recrutar arqueiros",
        req: null,
        reqTerreno: null
    },
    "Posto de Pedágio": {
        custo: 2,
        tipo: "Guerra",
        beneficio: "Impostos altos rendem +1 LO por nível",
        req: "Estrada",
        reqTerreno: null
    },
    "Sala de Mapas": {
        custo: 8,
        tipo: "Guerra",
        beneficio: "Ação de movimento adicional no 1º turno",
        req: null,
        reqTerreno: null
    },
    "Torre de Guarnição": {
        custo: 5,
        tipo: "Guerra",
        beneficio: "Permite recrutar guardas",
        req: null,
        reqTerreno: null
    },

    // ==========================================
    // CONSTRUÇÕES DE ENGANAÇÃO
    // ==========================================
    Bazar: {
        custo: 5,
        tipo: "Enganação",
        beneficio: "Muda preço em 10% a seu favor (itens mundanos)",
        req: null,
        reqTerreno: null
    },
    Caravançará: {
        custo: 10,
        tipo: "Enganação",
        beneficio: "Permite criar caravanas",
        req: ["Bazar", "Estrada"],
        reqTerreno: null
    },
    Empório: {
        custo: 10,
        tipo: "Enganação",
        beneficio: "Muda preço em 10% a seu favor (item superior)",
        req: "Bazar",
        reqTerreno: null
    },
    Esconderijo: { custo: 8, tipo: "Enganação", beneficio: "Permite recrutar bandidos", req: null, reqTerreno: null },
    Taverna: {
        custo: 10,
        tipo: "Enganação",
        beneficio: "Interrogar como ação livre 1x/aventura",
        req: null,
        reqTerreno: null
    },
    "Antro de Jogatina": {
        custo: 10,
        tipo: "Enganação",
        beneficio: "+2 em Enganação",
        req: "Taverna",
        reqTerreno: null
    },
    "Arena Clandestina": {
        custo: 15,
        tipo: "Enganação",
        beneficio: "Fornece Ataque Furtivo +1d6 (cumulativo)",
        req: "Taverna",
        reqTerreno: null
    },
    "Casa de Prazeres": {
        custo: 10,
        tipo: "Enganação",
        beneficio: "Permite usar Favor 1x/aventura (+5 se já tiver)",
        req: "Taverna",
        reqTerreno: null
    },
    Palco: { custo: 4, tipo: "Enganação", beneficio: "+2 em Atuação", req: null, reqTerreno: null },
    "Trupe de Malabaristas": { custo: 4, tipo: "Enganação", beneficio: "+1 em Reflexos", req: null, reqTerreno: null },

    // ==========================================
    // CONSTRUÇÕES DE RELIGIÃO
    // ==========================================
    Abadia: { custo: 12, tipo: "Religião", beneficio: "Aprende uma magia divina", req: null, reqTerreno: null },
    Capela: { custo: 5, tipo: "Religião", beneficio: "+2 em Religião", req: null, reqTerreno: null },
    Relicário: {
        custo: 8,
        tipo: "Religião",
        beneficio: "+5 em teste de resistência 1x/aventura",
        req: "Capela",
        reqTerreno: null
    },
    Mosteiro: {
        custo: 15,
        tipo: "Religião",
        beneficio: "+3 PM (apenas conjuradores divinos)",
        req: null,
        reqTerreno: null
    },
    Santuário: { custo: 4, tipo: "Religião", beneficio: "Fornece um poder de druida", req: null, reqTerreno: null },
    "Bosque Sagrado": {
        custo: 5,
        tipo: "Religião",
        beneficio: "Um companheiro animal não conta no limite",
        req: "Santuário",
        reqTerreno: null
    },
    "Círculo de Pedras": {
        custo: 10,
        tipo: "Religião",
        beneficio: "Aumenta bônus de atributo de Forma Selvagem em +2",
        req: "Santuário",
        reqTerreno: null
    },
    Templo: { custo: 15, tipo: "Religião", beneficio: "Fornece um poder de clérigo", req: null, reqTerreno: null },
    Altar: { custo: 3, tipo: "Religião", beneficio: "Canalizar Energia muda para d8", req: "Templo", reqTerreno: null },
    Catedral: {
        custo: 20,
        tipo: "Religião",
        beneficio: "Dobra efeitos de uma de suas Missas",
        req: "Templo",
        reqTerreno: null
    },

    // ==========================================
    // CONSTRUÇÕES DE MISTICISMO
    // ==========================================
    "Estante de Pergaminhos": {
        custo: 12,
        tipo: "Misticismo",
        beneficio: "Aprende uma magia arcana",
        req: null,
        reqTerreno: null
    },
    "Poço de Adivinhação": {
        custo: 10,
        tipo: "Misticismo",
        beneficio: "Rola dois dados e usa o melhor 1x/aventura",
        req: null,
        reqTerreno: null
    },
    "Salão dos Mistérios": {
        custo: 15,
        tipo: "Misticismo",
        beneficio: "+2 em Misticismo",
        req: null,
        reqTerreno: null
    },
    "Pedra de Maldições": {
        custo: 6,
        tipo: "Misticismo",
        beneficio: "Alvo sofre -5 na resistência 1x/aventura",
        req: "Salão dos Mistérios",
        reqTerreno: null
    },
    "Sala de Meditação": {
        custo: 5,
        tipo: "Misticismo",
        beneficio: "+3 PM (apenas conjuradores arcanos)",
        req: null,
        reqTerreno: null
    },
    "Torre de Estudos": {
        custo: 10,
        tipo: "Misticismo",
        beneficio: "Fornece um poder de arcanista",
        req: null,
        reqTerreno: null
    },
    "Arena Arcana": {
        custo: 6,
        tipo: "Misticismo",
        beneficio: "+1 no dano de cada dado de Raio Arcano",
        req: "Salão dos Mistérios",
        reqTerreno: null
    },
    "Câmara Mística": {
        custo: 15,
        tipo: "Misticismo",
        beneficio: "Usa poder de aprimoramento s/ custo 1x/aventura",
        req: "Torre de Estudos",
        reqTerreno: null
    },
    "Círculo de Poder": {
        custo: 10,
        tipo: "Misticismo",
        beneficio: "CD de magias arcanas aumenta em +1",
        req: null,
        reqTerreno: null
    },
    "Linhas Místicas": {
        custo: 25,
        tipo: "Misticismo",
        beneficio: "Recuperação de PM aumenta em +1 por nível",
        req: null,
        reqTerreno: null
    }
};
