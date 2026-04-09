const prisma = require("../database.js");

const CLASSES_MISTICAS = [
    "Arcanista", "Necromante", "Magimarcialista", "Bardo",
    "Clérigo", "Druída", "Ermitão", "Usurpador", "Frade" 
];

const PRECO_FUNDACAO = 5000;

class DominioService {
    async fundarDominio(char, nome, terreno, mistico) {
        if (char.tibares < PRECO_FUNDACAO) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        if (mistico && !CLASSES_MISTICAS.includes(char.classe)) {
            throw new Error("CLASSE_INVALIDA_MISTICO");
        }

        const dominioExistente = await prisma.dominio.findUnique({
            where: { personagem_id: char.id }
        });

        if (dominioExistente) {
            throw new Error("JA_POSSUI_DOMINIO");
        }

        const novoDominio = await prisma.$transaction(async (tx) => {
            await tx.personagem.update({
                where: { id: char.id },
                data: { tibares: { decrement: PRECO_FUNDACAO } }
            });

            const dominio = await tx.dominio.create({
                data: {
                    personagem_id: char.id,
                    nome: nome,
                    terreno: terreno,
                    mistico: mistico,
                    nivel: 1,
                    tesouro_lo: 0,
                    corte: "Inexistente",
                    popularidade: mistico ? "N/A" : "Tolerado", 
                    acoes_disponiveis: 2,
                    mes_ultimo_turno: new Date().getMonth() + 1 
                }
            });

            return dominio;
        });

        return novoDominio;
    }
    
    async buscarPainel(personagemId) {
        let dominio = await prisma.dominio.findUnique({
            where: { personagem_id: personagemId },
            include: {
                construcoes: true,
                tropas: true
            }
        });

        if (!dominio) return null;

        const mesAtual = new Date().getMonth() + 1;

        if (dominio.mes_ultimo_turno !== mesAtual) {
            
            const acoesTotais = dominio.corte === "Rica" ? 3 : 2;

            dominio = await prisma.dominio.update({
                where: { id: dominio.id },
                data: {
                    acoes_disponiveis: acoesTotais,
                    mes_ultimo_turno: mesAtual
                },
                include: {
                    construcoes: true,
                    tropas: true
                }
            });
        }

        return dominio;
    }
}

module.exports = new DominioService();