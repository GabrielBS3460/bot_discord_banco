module.exports = {
    TABELA_RARIDADE: nd => {
        const roll = Math.floor(Math.random() * 100) + 1;

        if (nd <= 4) {
            if (roll <= 90) return { tipo: "DINHEIRO" };
            return { tipo: "SUPERIOR", slots: 1 };
        } else if (nd <= 10) {
            if (roll <= 50) return { tipo: "DINHEIRO" };
            if (roll <= 70) return { tipo: "SUPERIOR", slots: 1 };
            return { tipo: "SUPERIOR", slots: 2 };
        } else if (nd <= 16) {
            if (roll <= 50) return { tipo: "DINHEIRO" };
            if (roll <= 85) return { tipo: "SUPERIOR", slots: 3 };
            if (roll <= 95) return { tipo: "MAGIC", poder: 1 };
            return { tipo: "MAGIC", poder: 2 };
        } else {
            if (roll <= 50) return { tipo: "DINHEIRO" };
            if (roll <= 80) return { tipo: "SUPERIOR", slots: 4 };
            if (roll <= 95) return { tipo: "MAGIC", poder: 1 };
            return { tipo: "MAGIC", poder: 2 };
        }
    },

    CATEGORIAS: [
        { max: 70, tipo: "ARMAS" },
        { max: 115, tipo: "ARMADURAS" },
        { max: 160, tipo: "ESOTERICOS" },
        { max: 200, tipo: "CONSUMIVEIS" }
    ],

    ITENS: {
        ARMAS: [
            "Adaga",
            "Adaga Oposta",
            "Azagaia",
            "Lança",
            "Arco Curto",
            "Besta Leve",
            "Espada Longa",
            "Espada Baronial",
            "Machado de Batalha",
            "Florete",
            "Chicote Estalante",
            "Montante",
            "Machado de Guerra",
            "Arco Longo",
            "Besta Pesada",
            "Pistola",
            "Mosquete",
            "Canhão de Mão",
            "Sifão Cáustico",
            "Katana",
            "Machado Táurico",
            "Manopla de Ataque",
            "Aparador",
            "Corrente de Espinhos",
            "Picareta"
        ],
        ARMADURAS: [
            "Armadura de Couro",
            "Couro Batido",
            "Colete Fora da Lei",
            "Gibão de Peles",
            "Armadura de Ossos",
            "Veste de Teia de Aranha",
            "Brunea",
            "Cota de Moedas",
            "Loriga de Segmentos",
            "Armadura de Quitina",
            "Armadura Completa",
            "Escudo Leve",
            "Escudo Pesado",
            "Escudo de Duelo",
            "Escudo de Couro",
            "Traje de Infiltrador"
        ],
        ESOTERICOS: [
            "Cajado Arcano",
            "Varinha",
            "Medalhão Sagrado",
            "Orbe Cristalino",
            "Luva de Ferro",
            "Bolsa de Pó",
            "Cetro Elemental",
            "Costela de Lich",
            "Dedo de Ente",
            "Tomo Hermético"
        ],
        CONSUMIVEIS: [
            "Bálsamo restaurador",
            "Essência de Mana",
            "Pergaminho (Aleatório)",
            "Bomba de Fumaça",
            "Granada",
            "Pó Azul",
            "Venenos: Peçonha de Serpente",
            "Venenos: Essência de Sszzaas"
        ]
    },

    MELHORIAS: {
        ARMAS: [
            "Certeira (+1 atq)",
            "Pungente (+2 atq)",
            "Cruel (+1 dano)",
            "Atroz (+2 dano)",
            "Equilibrada (+2 manobra)",
            "Harmonizada (-1 PM)",
            "Injeção Alquímica",
            "Maciça (+1 mult)",
            "Mira Telescópica",
            "Precisa (+1 margem)",
            "Farpada (Sangramento)",
            "Fósforo (Ofuscar)",
            "Guarda (+1 def)",
            "Incendiária (Fogo)",
            "Pressurizada (+2 atq/dano mecânica)",
            "Afiada",
            "Banhada a Ouro",
            "Cravejada de Joias",
            "Macabro",
            "Deslumbrante"
        ],
        ARMADURAS: [
            "Ajustada (-1 pen)",
            "Sob Medida (-2 pen)",
            "Delicada (Des na Def)",
            "Espinhosa (Dano garra/escudo)",
            "Polida (+5 def 1ª rodada)",
            "Reforçada (+1 def)",
            "Selada (+1 resist)",
            "Balístico (Dano escudo)",
            "Injetora (Usa poção)",
            "Prudente (Atenua crítica)",
            "Banhada a Ouro",
            "Cravejada de Joias",
            "Macabro",
            "Deslumbrante"
        ],
        ESOTERICOS: [
            "Canalizador (+1 lim PM)",
            "Energético (+1d6 dano)",
            "Harmonizado (-1 PM)",
            "Poderoso (+1 CD)",
            "Vigilante (+2 Def)",
            "Potencializador (+2 lim PM)",
            "Macabro",
            "Deslumbrante"
        ],
        MATERIAIS: ["Adamante", "Mitral", "Aço-Rubi", "Gelo Eterno", "Matéria Vermelha"]
    },

    ENCANTOS: {
        ARMAS: [
            "Ameaçadora (x2 margem)",
            "Anticriatura",
            "Arremesso",
            "Assassina",
            "Caçadora (Ignora camuflagem)",
            "Congelante (+1d6 frio)",
            "Conjuradora",
            "Corrosiva (+1d6 ácido)",
            "Dançarina",
            "Defensora (+2 def)",
            "Destruidora (Construtos)",
            "Dilacerante (+10 crit)",
            "Drenante",
            "Elétrica (+1d6)",
            "Energética (+Atq)",
            "Excruciante (Fraqueza)",
            "Flamejante (+1d6 fogo)",
            "Formidável (+2 atq/dano)",
            "Lancinante (Crit terrível)",
            "Magnífica (+4 atq/dano)",
            "Piedosa",
            "Profana",
            "Sagrada",
            "Sanguinária",
            "Trovejante",
            "Tumular (+1d8 trevas)",
            "Veloz (Atq extra)",
            "Venenosa"
        ],
        ARMADURAS: [
            "Abascanto (Res Magia)",
            "Abençoado (Res Trevas)",
            "Acrobático",
            "Alado (Voo)",
            "Animado (Escudo)",
            "Assustador",
            "Cáustica (Res Ácido)",
            "Defensor (+2 Def)",
            "Escorregadio",
            "Esmagador (Escudo)",
            "Fantasmagórico",
            "Fortificado (Ignora crit)",
            "Gélido (Res Frio)",
            "Guardião (+4 Def)",
            "Hipnótico",
            "Ilusório",
            "Incandescente (Res Fogo)",
            "Invulnerável (RD)",
            "Opaco (Res Energia)",
            "Protetor (+2 Res)",
            "Refletor",
            "Relampejante (Res Eletricidade)",
            "Reluzente (Cegueira)",
            "Sombrio (Furtividade)",
            "Zeloso"
        ]
    },

    DINHEIRO_POR_ND: nd => {
        const d100 = Math.floor(Math.random() * 100) + 1;

        const roll = str => {
            const [qtd, faces] = str.split("d").map(Number);
            let total = 0;
            for (let i = 0; i < qtd; i++) total += Math.floor(Math.random() * faces) + 1;
            return total;
        };

        if (nd <= 4) {
            if (d100 <= 50) return { val: 0 };
            if (d100 <= 70) return { val: roll("1d6") * 10 };
            if (d100 <= 95) return { val: roll("1d6") * 20 };
            return { val: roll("2d3") * 40 };
        } else if (nd <= 10) {
            if (d100 <= 20) return { val: 0 };
            if (d100 <= 60) return { val: roll("2d6") * 10 * nd };
            if (d100 <= 90) return { val: roll("2d6") * 20 * nd };
            return { riqueza: "MENOR", qtd: roll("1d3") };
        } else if (nd <= 16) {
            if (d100 <= 10) return { val: 0 };
            if (d100 <= 60) return { val: roll("2d8") * 20 * nd };
            if (d100 <= 95) return { val: roll("2d10") * 30 * nd };
            return { riqueza: "MEDIA", qtd: roll("1d3") };
        } else {
            if (d100 <= 10) return { val: 0 };
            if (d100 <= 45) return { riqueza: "MEDIA", qtd: roll("1d6") };
            if (d100 <= 80) return { val: roll("3d6") * 1000 };
            return { riqueza: "MAIOR", qtd: 1 };
        }
    },

    RIQUEZAS: {
        MENOR: [
            { val: 100, nome: "Barril de farinha ou Gaiola com galinhas" },
            { val: 150, nome: "Quartzo rosa ou Caixa de tabaco" },
            { val: 300, nome: "Bracelete de ouro ou Estatueta de osso" },
            { val: 400, nome: "Ametista ou Lingote de prata" },
            { val: 1000, nome: "Alexandrita ou Espada cerimonial" }
        ],
        MEDIA: [
            { val: 700, nome: "Pente em forma de dragão ou Harpa de madeira exótica" },
            { val: 900, nome: "Opala negra ou Luva bordada com gemas" },
            { val: 2200, nome: "Esmeralda verde ou Caixinha de música de ouro" },
            { val: 3900, nome: "Anel de prata e safira ou Ídolo de ouro puro" }
        ],
        MAIOR: [
            { val: 11000, nome: "Anel de ouro e rubi ou Conjunto de taças de ouro" },
            { val: 27000, nome: "Coroa de ouro ou Baú de mitral com diamantes" },
            { val: 55000, nome: "Arca repleta de lingotes e pedras preciosas" },
            { val: 130000, nome: "Uma sala forrada de moedas!" }
        ]
    }
};
