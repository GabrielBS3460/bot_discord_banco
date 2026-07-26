const prisma = require("../database.js");

class CatarseRepository {
    async listarAssinantes() {
        return prisma.catarseAssinante.findMany({ orderBy: { criadoEm: "asc" } });
    }

    async buscarAssinantePorEmail(email) {
        return prisma.catarseAssinante.findUnique({ where: { email } });
    }

    async upsertAssinante(data) {
        return prisma.catarseAssinante.upsert({
            where: { id: data.id },
            update: {
                nome: data.nome,
                email: data.email,
                pagamentoMensal: data.pagamentoMensal,
                totalPago: data.totalPago,
                status: data.status,
                dataDeInicio: data.dataDeInicio,
                mesesAssinante: data.mesesAssinante,
            },
            create: {
                id: data.id,
                nome: data.nome,
                email: data.email,
                pagamentoMensal: data.pagamentoMensal,
                totalPago: data.totalPago,
                status: data.status,
                dataDeInicio: data.dataDeInicio,
                mesesAssinante: data.mesesAssinante,
            },
        });
    }

    async listarEmails() {
        return prisma.catarseEmail.findMany({ orderBy: { criadoEm: "asc" } });
    }

    async buscarEmailPorUserId(userId) {
        return prisma.catarseEmail.findFirst({ where: { userId } });
    }

    async criarEmail(data) {
        return prisma.catarseEmail.create({ data });
    }

    async removerEmail(id) {
        return prisma.catarseEmail.delete({ where: { id } });
    }

    async removerEmailsForaDaLista(validEmails) {
        const normalizedValid = new Set(validEmails.map(e => e.toLowerCase().trim()));
        const todos = await prisma.catarseEmail.findMany();
        const aRemover = todos.filter(e => !normalizedValid.has(e.email.toLowerCase().trim()));
        for (const item of aRemover) {
            await prisma.catarseEmail.delete({ where: { id: item.id } });
        }
        return aRemover.length;
    }

    async removerAssinantesForaDaLista(validEmails) {
        const normalizedValid = new Set(validEmails.map(e => e.toLowerCase().trim()));
        const todos = await prisma.catarseAssinante.findMany();
        const aRemover = todos.filter(e => !normalizedValid.has(e.email.toLowerCase().trim()));
        for (const item of aRemover) {
            await prisma.catarseAssinante.delete({ where: { id: item.id } });
        }
        return aRemover.length;
    }
}

module.exports = new CatarseRepository();
