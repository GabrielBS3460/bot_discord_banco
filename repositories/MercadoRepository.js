const prisma = require("../database.js");

class MercadoRepository {
    async criarAnuncio(vendedorId, vendedorNome, itemNome, tipo, quantidade, descricao, preco) {
        return prisma.mercado.create({
            data: {
                vendedor_id: vendedorId,
                vendedor_nome: vendedorNome,
                item_nome: itemNome,
                tipo: tipo,
                quantidade: quantidade,
                descricao: descricao,
                preco: preco
            }
        });
    }

    async buscarAnuncios() {
        return prisma.mercado.findMany({
            orderBy: { criado_em: "desc" }
        });
    }

    async buscarAnuncioPorId(id) {
        return prisma.mercado.findUnique({
            where: { id: id }
        });
    }

    async buscarAnunciosPorVendedor(vendedorId) {
        return prisma.mercado.findMany({
            where: { vendedor_id: vendedorId },
            orderBy: { criado_em: "desc" }
        });
    }

    async removerAnuncio(id) {
        return prisma.mercado.delete({
            where: { id: id }
        });
    }
}

module.exports = new MercadoRepository();
