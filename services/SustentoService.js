const prisma = require("../database.js");

class SustentoService {
    calcularGanhoSustento(resultadoTeste, bonusGanho = 0, semanas = 1) {
        const CD = 15;
        if (resultadoTeste < CD) {
            return {
                sucesso: false,
                excesso: 0,
                ganhoSemanalBase: 0,
                ganhoSemanalTotal: 0,
                ganhoFinalTotal: 0,
                semanas
            };
        }

        const excesso = resultadoTeste - CD;
        const ganhoSemanalBase = 1 + excesso;
        const ganhoSemanalTotal = ganhoSemanalBase + Math.max(0, bonusGanho);
        const ganhoFinalTotal = ganhoSemanalTotal * semanas;

        return {
            sucesso: true,
            excesso,
            ganhoSemanalBase,
            ganhoSemanalTotal,
            ganhoFinalTotal,
            semanas
        };
    }

    async executarSustento(personagemId, resultadoTeste, bonusGanho = 0, semanas = 1, pericia = null) {
        const char = await prisma.personagens.findUnique({
            where: { id: personagemId }
        });

        if (!char) {
            throw new Error("PERSONAGEM_NAO_ENCONTRADO");
        }

        const analise = this.calcularGanhoSustento(resultadoTeste, bonusGanho, semanas);

        if (!analise.sucesso || analise.ganhoFinalTotal <= 0) {
            return {
                char,
                analise,
                saldoAnterior: char.saldo,
                saldoAtualizado: char.saldo
            };
        }

        const descPericia = pericia ? ` (${pericia})` : "";
        const descBonus = bonusGanho > 0 ? ` +${bonusGanho} K$ bônus` : "";
        const descSemanas = semanas > 1 ? ` por ${semanas} semanas` : "";
        const descricaoTransacao = `Sustento: Rolou ${resultadoTeste}${descPericia}${descBonus}${descSemanas}`;

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: char.id },
                data: {
                    saldo: { increment: analise.ganhoFinalTotal }
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: descricaoTransacao,
                    valor: analise.ganhoFinalTotal,
                    tipo: "GANHO",
                    categoria: "SUSTENTO"
                }
            })
        ]);

        return {
            char,
            analise,
            saldoAnterior: char.saldo,
            saldoAtualizado: char.saldo + analise.ganhoFinalTotal
        };
    }
}

module.exports = new SustentoService();
