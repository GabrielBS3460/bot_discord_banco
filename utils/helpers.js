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
    let limite = 0;
    switch (mestre.nivel_narrador) {
        case 1:
            limite = 0;
            break;
        case 2:
            limite = 2;
            break;
        case 3:
            limite = 4;
            break;
        case 4:
            limite = 4;
            break;
        default:
            if (mestre.nivel_narrador > 3) limite = Math.pow(2, mestre.nivel_narrador - 1);
            break;
    }

    if (limite === 0) return { limiteAtingido: true, limite: 0, contagem: 0 };

    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const personagensDoMestre = await prisma.personagens.findMany({
        where: { usuario_id: mestre.discord_id },
        select: { id: true }
    });
    const idsDosPersonagens = personagensDoMestre.map(p => p.id);

    const missoesMestradas = await prisma.transacao.count({
        where: {
            personagem_id: { in: idsDosPersonagens },
            data: { gte: inicioDoMes },
            categoria: { in: ["MESTRAR_SOLICITADA", "MESTRAR_COLETA", "MESTRAR_CAPTURA"] }
        }
    });

    return { limiteAtingido: missoesMestradas >= limite, limite, contagem: missoesMestradas };
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
