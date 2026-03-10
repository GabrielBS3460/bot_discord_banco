const PORTES = {
    Mínima: { valor: 1, custo: 1000, comodos: 0, manutencao: 100, desc: "0 Cômodos. Ex: Quarto em estalagem." },
    Modesta: { valor: 2, custo: 3000, comodos: 3, manutencao: 300, desc: "3 Cômodos. Ex: Casebre, gruta." },
    Básica: { valor: 3, custo: 6000, comodos: 6, manutencao: 600, desc: "6 Cômodos. Ex: Casa, caverna." },
    Formidável: { valor: 4, custo: 10000, comodos: 9, manutencao: 1000, desc: "9 Cômodos. Ex: Casarão, nau." },
    Grandiosa: { valor: 5, custo: 15000, comodos: 12, manutencao: 1500, desc: "12 Cômodos. Ex: Forte, galeão." },
    Suprema: { valor: 6, custo: 21000, comodos: 15, manutencao: 2100, desc: "15 Cômodos. Ex: Castelo, cidadela." }
};

const TIPOS = {
    "Centro de Poder": "Residentes recebem +1 PM.",
    Empreendimento: "Pode gerar K$ entre aventuras.",
    Esconderijo: "Residentes recebem +1 em testes de resistência.",
    Fortificação: "+5 Segurança e residentes recebem +1 na Defesa.",
    Móvel: "Deslocamento +1,5m e base pode se mover.",
    Residência: "Residentes recebem +3 PV e benefícios de descanso."
};

const COMODOS = {
    Adega: { desc: "Aumenta o efeito de preparados e poções.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Ala dos criados": {
        desc: "PM temporários no início da aventura.",
        reqPorte: "Formidável",
        reqComodo: null,
        addSeguranca: 0
    },
    Armorial: { desc: "Fornece uma proficiência com arma/armadura.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Biblioteca: { desc: "+1 em Conhecimento.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Calabouço: { desc: "+1 em Intimidação e CD de medo.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Câmara de meditação": { desc: "+1 em Vontade.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Chapelaria: { desc: "Vestir um item adicional.", reqPorte: "Formidável", reqComodo: null, addSeguranca: 0 },
    Cozinha: { desc: "Levar pratos para viagem.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Despensa: { desc: "Capacidade de carga +2.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Domo protetor": {
        desc: "Segurança +2 e proteção ambiental.",
        reqPorte: null,
        reqComodo: "Gabinete místico",
        addSeguranca: 2
    },
    Enfermaria: { desc: "+1 em Cura e testes para estancar.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Estábulo: { desc: "Bônus para animais e montarias.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Estufa: { desc: "+1 na CD de preparados e poções.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Forjaria: { desc: "+1 no dano de uma arma.", reqPorte: null, reqComodo: "Oficina de trabalho", addSeguranca: 0 },
    "Gabinete místico": { desc: "+1 em Misticismo.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Ginásio: { desc: "+1 em Atletismo e dano desarmado.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Guarita: { desc: "Segurança +4.", reqPorte: null, reqComodo: null, addSeguranca: 4 },
    "Casa da guarda": {
        desc: "Segurança +4 e parceiros capangas.",
        reqPorte: "Formidável",
        reqComodo: "Guarita",
        addSeguranca: 4
    },
    "Jardim ornamental": { desc: "+1 em Enganação.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Laboratório arcano": {
        desc: "Reduz custo de uma magia arcana.",
        reqPorte: null,
        reqComodo: "Gabinete místico",
        addSeguranca: 0
    },
    Lavanderia: { desc: "Aumenta bônus de vestuário.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Memorial: {
        desc: "Bônus p/ o próximo personagem em caso de morte.",
        reqPorte: null,
        reqComodo: null,
        addSeguranca: 0
    },
    Observatório: { desc: "Rola dois dados em uma perícia.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Oficina de trabalho": { desc: "+1 em Ofício.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Oratório: { desc: "+1 em Religião.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Pátio de treinamento": { desc: "+1 em ataques com uma arma.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Quarto do capitão": {
        desc: "Segurança +2 e parceiro veterano.",
        reqPorte: null,
        reqComodo: "Casa da guarda",
        addSeguranca: 2
    },
    Sacada: { desc: "+1 em Diplomacia.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Sala de estar": { desc: "Espaço para três mobílias.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Sala de guerra": { desc: "+1 em Guerra e Iniciativa.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Sala de jogos": {
        desc: "+1 em Jogatina e rec. de PM com falhas.",
        reqPorte: null,
        reqComodo: null,
        addSeguranca: 0
    },
    "Sala de mapas": { desc: "+2 em buscas e jornadas.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Sala de perigo": {
        desc: "+2 em testes de treinamento.",
        reqPorte: null,
        reqComodo: "Sistema de segurança",
        addSeguranca: 0
    },
    "Sala do tesouro": { desc: "+5% em rolagens de tesouros.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    "Salão de baile": { desc: "+1 em Nobreza.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Sauna: { desc: "Previne condições de cansaço.", reqPorte: "Formidável", reqComodo: null, addSeguranca: 0 },
    "Sistema de segurança": {
        desc: "Segurança +4 e bônus contra armadilhas.",
        reqPorte: null,
        reqComodo: null,
        addSeguranca: 4
    },
    Suíte: { desc: "+3 PV e descanso confortável.", reqPorte: "Básica", reqComodo: null, addSeguranca: 0 },
    Tabernáculo: { desc: "Reduz custo de magia divina.", reqPorte: null, reqComodo: "Oratório", addSeguranca: 0 },
    Tablado: { desc: "+1 em Atuação.", reqPorte: null, reqComodo: null, addSeguranca: 0 },
    Vergel: { desc: "+1 em Sobrevivência.", reqPorte: null, reqComodo: null, addSeguranca: 0 }
};

const MOBILIAS = {
    "Armadura decorativa": { custo: 2000, desc: "+1 na Defesa", reqComodos: [] },
    "Armário de remédios": { custo: 2000, desc: "+1 PV por dado de cura", reqComodos: ["Enfermaria", "Estufa"] },
    Banheira: { custo: 300, desc: "Rola 2 dados em Fortitude", reqComodos: ["Suíte"] },
    Bar: { custo: 1000, desc: "+1 PM", reqComodos: ["Sala de estar", "Salão de baile", "Sala de jogos"] },
    "Baú reforçado": { custo: 300, desc: "Mais espaço de carga", reqComodos: ["Despensa"] },
    Bigorna: { custo: 500, desc: "Bônus em Ofício ou dano", reqComodos: ["Oficina de trabalho", "Forjaria"] },
    "Colchão de penas exóticas": { custo: 500, desc: "+3 PV", reqComodos: ["Suíte"] },
    "Colmeia de pergaminhos": {
        custo: 2500,
        desc: "Aprende magia arcana",
        reqComodos: ["Biblioteca", "Gabinete místico"]
    },
    "Criatura empalhada": { custo: 1000, desc: "Bônus em dano", reqComodos: [] },
    "Engenho automatizado": { custo: 3000, desc: "Diminui tempo de fabricação", reqComodos: ["Oficina de trabalho"] },
    "Espelho de corpo": {
        custo: 2000,
        desc: "Mais vestuário ou perícias Carisma",
        reqComodos: ["Chapelaria", "Suíte"]
    },
    "Gárgula animada": { custo: 10000, desc: "Segurança +2 e parceiro", reqComodos: ["Exterior"] },
    "Ídolo dourado": { custo: 1200, desc: "Mais bônus em perícia", reqComodos: [] },
    Lareira: { custo: 2500, desc: "+1 CD fogo, redução fogo 2", reqComodos: ["Sala de estar", "Cozinha", "Suíte"] },
    "Lustre de cristal": { custo: 2500, desc: "+1 em efeito de luz", reqComodos: ["Sala de estar", "Salão de baile"] },
    "Mapa-múndi": {
        custo: 1500,
        desc: "Melhora sala de guerra/mapas",
        reqComodos: ["Sala de guerra", "Sala de mapas"]
    },
    "Mesa de reuniões": { custo: 2000, desc: "Troca iniciativa", reqComodos: ["Sala de guerra", "Sala de estar"] },
    "Obra de arte": { custo: 2000, desc: "Cura PM", reqComodos: [] },
    Planetário: { custo: 1500, desc: "Mais um uso do observatório", reqComodos: ["Observatório"] },
    Prataria: { custo: 2000, desc: "Refeições para viagem", reqComodos: ["Cozinha"] },
    "Prateleiras reforçadas": { custo: 2000, desc: "Perícia treinada", reqComodos: ["Biblioteca"] },
    "Quadro de diagramas": { custo: 3000, desc: "Diminui custo de fabricação", reqComodos: ["Oficina de trabalho"] },
    "Relíquia abençoada": {
        custo: 2500,
        desc: "Magia divina ou bônus resistências",
        reqComodos: ["Oratório", "Sala de estar"]
    },
    Retratos: { custo: 1750, desc: "+5 em testes para ajudar", reqComodos: [] },
    "Roleta ahleniense": { custo: 2000, desc: "Rola novamente um teste", reqComodos: ["Sala de jogos"] }
};

module.exports = {
    PORTES,
    TIPOS,
    COMODOS,
    MOBILIAS
};
