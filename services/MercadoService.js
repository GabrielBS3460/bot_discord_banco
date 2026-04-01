const MercadoRepository = require("../repositories/MercadoRepository.js");
const ItensRepository = require("../repositories/ItensRepository.js");
const PersonagemRepository = require("../repositories/PersonagemRepository.js");
const TransacaoService = require("./TransacaoService.js");

class MercadoService {
    async comprarItem(compradorId, anuncioId) {
        const anuncio = await MercadoRepository.buscarAnuncioPorId(anuncioId);
        if (!anuncio) throw new Error("ANUNCIO_NAO_ENCONTRADO");

        const comprador = await PersonagemRepository.obterFichaCompleta(compradorId);
        const vendedor = await PersonagemRepository.obterFichaCompleta(anuncio.vendedor_id);

        if (!comprador) throw new Error("COMPRADOR_NAO_ENCONTRADO");
        if (!vendedor) throw new Error("VENDEDOR_NAO_ENCONTRADO");

        if (comprador.id === vendedor.id) throw new Error("COMPRA_PROPRIA");

        if (comprador.saldo < anuncio.preco) {
            const erro = new Error("SALDO_INSUFICIENTE");
            erro.saldoAtual = comprador.saldo;
            throw erro;
        }

        await PersonagemRepository.atualizar(comprador.id, { saldo: comprador.saldo - anuncio.preco });
        await PersonagemRepository.atualizar(vendedor.id, { saldo: vendedor.saldo + anuncio.preco });

        await ItensRepository.adicionarItem(
            comprador.id,
            anuncio.item_nome,
            anuncio.tipo,
            anuncio.quantidade,
            anuncio.descricao
        );

        await MercadoRepository.removerAnuncio(anuncio.id);

        return { anuncio, comprador, vendedor };
    }

    async cancelarAnuncio(vendedorId, anuncioId) {
        const anuncio = await MercadoRepository.buscarAnuncioPorId(anuncioId);
        if (!anuncio) throw new Error("ANUNCIO_NAO_ENCONTRADO");

        if (anuncio.vendedor_id !== vendedorId) throw new Error("NAO_AUTORIZADO");

        await ItensRepository.adicionarItem(
            vendedorId,
            anuncio.item_nome,
            anuncio.tipo,
            anuncio.quantidade,
            anuncio.descricao
        );

        await MercadoRepository.removerAnuncio(anuncio.id);

        return anuncio;
    }
}

module.exports = new MercadoService();
