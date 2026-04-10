const MercadoRepository = require("../repositories/MercadoRepository.js");
const ItensRepository = require("../repositories/ItensRepository.js");
const PersonagemRepository = require("../repositories/PersonagemRepository.js");
const TransacaoRepository = require("../repositories/TransacaoRepository.js");
const prisma = require("../../database.js");

class MercadoService {
    async comprarItem(compradorId, anuncioId, qtdCompra) {
        const anuncio = await MercadoRepository.buscarAnuncioPorId(anuncioId);
        if (!anuncio) throw new Error("ANUNCIO_NAO_ENCONTRADO");

        const quantidadeComprada = qtdCompra || anuncio.quantidade;

        if (quantidadeComprada <= 0 || quantidadeComprada > anuncio.quantidade) {
            throw new Error("QUANTIDADE_INVALIDA");
        }

        const comprador = await PersonagemRepository.obterFichaCompleta(compradorId);
        const vendedor = await PersonagemRepository.obterFichaCompleta(anuncio.vendedor_id);

        if (!comprador) throw new Error("COMPRADOR_NAO_ENCONTRADO");
        if (!vendedor) throw new Error("VENDEDOR_NAO_ENCONTRADO");
        if (comprador.id === vendedor.id) throw new Error("COMPRA_PROPRIA");

        const precoUnitario = anuncio.preco / anuncio.quantidade;
        const custoTotal = precoUnitario * quantidadeComprada;

        if (comprador.saldo < custoTotal) {
            const erro = new Error("SALDO_INSUFICIENTE");
            erro.saldoAtual = comprador.saldo;
            throw erro;
        }

        await PersonagemRepository.atualizar(comprador.id, { saldo: comprador.saldo - custoTotal });
        await PersonagemRepository.atualizar(vendedor.id, { saldo: vendedor.saldo + custoTotal });

        try {
            await TransacaoRepository.criar({
                personagem_id: comprador.id,
                descricao: `Compra no Mercado (${quantidadeComprada}x ${anuncio.item_nome})`,
                valor: custoTotal,
                tipo: "GASTO"
            });

            await TransacaoRepository.criar({
                personagem_id: vendedor.id,
                descricao: `Venda no Mercado (${quantidadeComprada}x ${anuncio.item_nome})`,
                valor: custoTotal,
                tipo: "RECEITA"
            });
        } catch (err) {
            console.log("Erro ao registrar extrato do mercado:", err);
        }

        await ItensRepository.adicionarItem(
            comprador.id,
            anuncio.item_nome,
            anuncio.tipo,
            quantidadeComprada,
            anuncio.descricao
        );

        if (quantidadeComprada === anuncio.quantidade) {
            await MercadoRepository.removerAnuncio(anuncio.id);
        } else {
            await prisma.mercado.update({
                where: { id: anuncio.id },
                data: {
                    quantidade: anuncio.quantidade - quantidadeComprada,
                    preco: anuncio.preco - custoTotal
                }
            });
        }

        return { anuncio, comprador, vendedor, custoTotal };
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
