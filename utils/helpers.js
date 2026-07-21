const prisma = require("../database.js");

async function getPersonagemAtivo(discordId) {
    const usuario = await prisma.usuarios.findUnique({
        where: { discord_id: discordId },
        include: { personagemAtivo: true }
    });
    return usuario?.personagemAtivo;
}

function formatarMoeda(valor) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace("R$", "K$");
}

async function verificarLimiteMestre(mestre) {
    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const personagensDoMestre = await prisma.personagens.findMany({
        where: { usuario_id: mestre.discord_id },
        select: { id: true }
    });
    const idsDosPersonagens = personagensDoMestre.map(p => p.id);

    let missoesMestradas = 0;
    if (idsDosPersonagens.length > 0) {
        missoesMestradas = await prisma.transacao.count({
            where: {
                personagem_id: { in: idsDosPersonagens },
                data: { gte: inicioDoMes },
                categoria: { in: ["MESTRAR_SOLICITADA", "MESTRAR_COLETA", "MESTRAR_CAPTURA"] }
            }
        });
    }

    const missoesQuadroConcluidas = await prisma.missoes.count({
        where: {
            criador_id: mestre.discord_id,
            status: "CONCLUIDA"
        }
    });

    const contagemTotal = missoesMestradas + missoesQuadroConcluidas;

    return {
        limiteAtingido: false,
        contagem: contagemTotal
    };
}

function calcularNivelEPatamar(classes) {
    const nivelTotal = classes.reduce((acc, c) => acc + c.nivel, 0) || 1;
    let patamar = 1;
    if (nivelTotal >= 5) patamar = 2;
    if (nivelTotal >= 11) patamar = 3;
    if (nivelTotal >= 17) patamar = 4;
    return { nivelTotal, patamar };
}

module.exports = {
    getPersonagemAtivo,
    formatarMoeda,
    verificarLimiteMestre,
    calcularNivelEPatamar
};
