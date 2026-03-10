const AvaliacaoRepository = require("../repositories/AvaliacaoRepository.js");

class MestreService {
    async registrarAvaliacao(avaliadorId, mestreId, linkMissao, notas) {
        const valores = Object.values(notas);
        const media = valores.reduce((a, b) => a + b, 0) / valores.length;

        await AvaliacaoRepository.criar({
            mestre_id: mestreId,
            avaliador_id: avaliadorId,
            link_missao: linkMissao,
            nota_ritmo: notas.ritmo,
            nota_imersao: notas.imersao,
            nota_preparo: notas.preparo,
            nota_conhecimento: notas.conhecimento,
            nota_geral: notas.geral
        });

        return media;
    }

    async gerarRelatorioDesempenho(mestreId) {
        const avaliacoes = await AvaliacaoRepository.buscarTodasPorMestre(mestreId);

        if (avaliacoes.length === 0) return null;

        const qtd = avaliacoes.length;

        const somas = avaliacoes.reduce(
            (acc, av) => {
                acc.ritmo += av.nota_ritmo;
                acc.imersao += av.nota_imersao;
                acc.preparo += av.nota_preparo;
                acc.conhecimento += av.nota_conhecimento;
                acc.geral += av.nota_geral;
                return acc;
            },
            { ritmo: 0, imersao: 0, preparo: 0, conhecimento: 0, geral: 0 }
        );

        const medias = {
            ritmo: somas.ritmo / qtd,
            imersao: somas.imersao / qtd,
            preparo: somas.preparo / qtd,
            conhecimento: somas.conhecimento / qtd,
            geral: somas.geral / qtd,
            qtd
        };

        medias.notaFinal = (medias.ritmo + medias.imersao + medias.preparo + medias.conhecimento + medias.geral) / 5;

        return medias;
    }
}

module.exports = new MestreService();
