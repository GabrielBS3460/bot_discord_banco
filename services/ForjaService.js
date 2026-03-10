const prisma = require("../database.js");

class ForjaService {
    async executarForja(personagemId, tipo, nomeItem, qtd, custoOuro, custoPontosUnit) {
        const charAtual = await prisma.personagens.findUnique({
            where: { id: personagemId }
        });

        const custoPontosTotal = parseFloat((custoPontosUnit * qtd).toFixed(2));

        if (charAtual.saldo < custoOuro) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        if (charAtual.pontos_forja_atual < custoPontosTotal) {
            throw new Error("PONTOS_INSUFICIENTES");
        }

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: charAtual.id },
                data: {
                    saldo: { decrement: custoOuro },
                    pontos_forja_atual: { decrement: custoPontosTotal }
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: charAtual.id,
                    descricao: `Forjou ${qtd}x ${nomeItem} (${tipo})`,
                    valor: custoOuro,
                    tipo: "GASTO"
                }
            })
        ]);

        return {
            saldoAtualizado: charAtual.saldo - custoOuro,
            pontosAtualizados: charAtual.pontos_forja_atual - custoPontosTotal,
            custoPontosTotal
        };
    }

    async resgatarPontosDiarios(char) {
        if (!char.pontos_forja_max || char.pontos_forja_max <= 0) {
            throw new Error("FORJA_NAO_CONFIGURADA");
        }

        if (char.ultimo_resgate_forja) {
            const agora = new Date();
            const ultimo = new Date(char.ultimo_resgate_forja);

            const mesmoDia =
                agora.getDate() === ultimo.getDate() &&
                agora.getMonth() === ultimo.getMonth() &&
                agora.getFullYear() === ultimo.getFullYear();

            if (mesmoDia) {
                throw new Error("JA_RESGATOU_HOJE");
            }
        }

        const nivelReal = char.nivel_personagem || 3;
        let patamar = 1;
        if (nivelReal >= 5) patamar = 2;
        if (nivelReal >= 11) patamar = 3;
        if (nivelReal >= 17) patamar = 4;

        const ganhoDiario = char.pontos_forja_max;
        const limiteAcumulo = ganhoDiario * (patamar + 3);

        let novoTotal = char.pontos_forja_atual + ganhoDiario;
        if (novoTotal > limiteAcumulo) {
            novoTotal = limiteAcumulo;
        }

        const ganhou = novoTotal - char.pontos_forja_atual;

        if (ganhou <= 0) {
            throw new Error("ESTOQUE_CHEIO", { cause: limiteAcumulo });
        }

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: char.id },
                data: {
                    pontos_forja_atual: novoTotal,
                    ultimo_resgate_forja: new Date()
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Resgate Forja Diário (+${ganhou})`,
                    valor: 0,
                    tipo: "FORJA"
                }
            })
        ]);

        return { ganhou, novoTotal, limiteAcumulo, patamar, ganhoDiario };
    }

    async configurarForja(char, poderesFabricacao) {
        const OFICIOS_VALIDOS = [
            "Ofício Armeiro",
            "Ofício Artesão",
            "Ofício Alquimista",
            "Ofício Cozinheiro",
            "Ofício Alfaiate",
            "Ofício Escriba",
            "Ofício Tatuador"
        ];

        const pericias = char.pericias || [];
        const oficiosTreinados = pericias.filter(p => OFICIOS_VALIDOS.includes(p));
        const quantidadeOficios = oficiosTreinados.length;

        const limiteForja = (poderesFabricacao + 1) * quantidadeOficios * 2;

        await prisma.personagens.update({
            where: { id: char.id },
            data: { pontos_forja_max: limiteForja }
        });

        return {
            oficiosTreinados,
            quantidadeOficios,
            limiteForja
        };
    }
}

module.exports = new ForjaService();
