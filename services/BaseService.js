const prisma = require("../database.js");
const BaseRepository = require("../repositories/BaseRepository.js");

const { PORTES } = require("../data/baseData.js");

class BaseService {
    async fundarBase(char, nome, tipo, porte, custo) {
        return prisma.$transaction(async tx => {
            await tx.personagens.update({
                where: { id: char.id },
                data: { saldo: { decrement: custo } }
            });

            await tx.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Fundação de Base: ${nome}`,
                    valor: custo,
                    tipo: "GASTO"
                }
            });

            return BaseRepository.criarBase(
                {
                    nome,
                    tipo,
                    porte,
                    seguranca: tipo === "Fortificação" ? 5 : 0,
                    dono_id: char.id
                },
                tx
            );
        });
    }

    async construirComodo(char, base, escolhido, dadosComodo) {
        return prisma.$transaction(async tx => {
            await tx.personagens.update({ where: { id: char.id }, data: { saldo: { decrement: 1000 } } });

            await tx.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Construção: ${escolhido}`,
                    valor: 1000,
                    tipo: "GASTO"
                }
            });

            await BaseRepository.adicionarComodo(base.id, escolhido, tx);

            if (dadosComodo.addSeguranca > 0) {
                await BaseRepository.atualizarSeguranca(base.id, dadosComodo.addSeguranca, tx);
            }
        });
    }

    async instalarMobilia(char, baseId, comodoId, escolhido, custo) {
        return prisma.$transaction(async tx => {
            await tx.personagens.update({ where: { id: char.id }, data: { saldo: { decrement: custo } } });

            await tx.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Mobília: ${escolhido}`,
                    valor: custo,
                    tipo: "GASTO"
                }
            });

            await BaseRepository.adicionarMobilia(baseId, comodoId, escolhido, tx);
        });
    }

    async validarEInstalarMobilia(char, base, escolhido, comodoId) {
        const { MOBILIAS, PORTES } = require("../data/baseData.js");
        const dadosMob = MOBILIAS[escolhido];
        const custo = dadosMob.custo;

        if (char.saldo < custo) throw new Error("SALDO_INSUFICIENTE");

        if (escolhido === "Gárgula animada") {
            const valorPorte = PORTES[base.porte].valor;
            if (valorPorte <= 3) throw new Error("PORTE_INSUFICIENTE");

            const qtdAtual = base.mobilias.filter(m => m.nome_item === "Gárgula animada").length;
            const maxGargulas = valorPorte - 3;
            if (qtdAtual >= maxGargulas) throw new Error("LIMITE_GARGULAS");

            return this._executarTransacaoMobilia(char.id, base.id, null, escolhido, custo, 2);
        }

        const comodoAlvo = base.comodos.find(c => c.id === comodoId);
        if (!comodoAlvo) throw new Error("COMODO_INVALIDO");
        if (comodoAlvo.danificado) throw new Error("COMODO_DANIFICADO");

        if (dadosMob.reqComodos.length > 0 && !dadosMob.reqComodos.includes(comodoAlvo.nome_comodo)) {
            throw new Error("LOCAL_INCOMPATIVEL");
        }

        const ocupacaoAtual = base.mobilias.filter(m => m.comodo_id === comodoId).length;
        const capacidadeMax = comodoAlvo.nome_comodo === "Sala de estar" ? 3 : 1;
        if (ocupacaoAtual >= capacidadeMax) throw new Error("COMODO_LOTADO");

        return this._executarTransacaoMobilia(char.id, base.id, comodoId, escolhido, custo, 0);
    }

    async _executarTransacaoMobilia(personagemId, baseId, comodoId, item, custo, bonusSeg) {
        return prisma.$transaction(async tx => {
            await tx.personagens.update({ where: { id: personagemId }, data: { saldo: { decrement: custo } } });
            await tx.transacao.create({
                data: { personagem_id: personagemId, descricao: `Mobília: ${item}`, valor: custo, tipo: "GASTO" }
            });
            await tx.baseMobilia.create({ data: { base_id: baseId, comodo_id: comodoId, nome_item: item } });
            if (bonusSeg > 0) {
                await tx.base.update({ where: { id: baseId }, data: { seguranca: { increment: bonusSeg } } });
            }
        });
    }

    async adicionarMorador(baseId, personagemId) {
        const jaPossuiBase = await BaseRepository.buscarBasePorPersonagem(personagemId);
        if (jaPossuiBase) throw new Error("JÁ_POSSUI_BASE");

        const residentes = await BaseRepository.buscarResidentes(baseId);
        if (residentes.length >= 4) throw new Error("BASE_CHEIA");

        return BaseRepository.adicionarResidente(baseId, personagemId);
    }

    async expulsarMorador(baseId, personagemId) {
        return BaseRepository.removerResidente(baseId, personagemId);
    }

    async processarManutencaoGeral() {
        const bases = await BaseRepository.buscarTodasParaManutencao();
        const relatorio = { pagas: 0, inadimplentes: 0, degradadas: 0 };

        for (const base of bases) {
            const custo = PORTES[base.porte].manutencao;
            const dono = base.dono;

            if (dono.saldo >= custo) {
                await prisma.$transaction([
                    prisma.personagens.update({
                        where: { id: dono.id },
                        data: { saldo: { decrement: custo } }
                    }),
                    prisma.transacao.create({
                        data: {
                            personagem_id: dono.id,
                            descricao: `Manutenção Base: ${base.nome}`,
                            valor: custo,
                            tipo: "GASTO"
                        }
                    }),
                    prisma.base.update({
                        where: { id: base.id },
                        data: { manutencao_paga: true }
                    })
                ]);
                relatorio.pagas++;
            } else {
                if (base.manutencao_paga === false) {
                    await BaseRepository.danificarComodoAleatorio(base.id);
                    relatorio.degradadas++;
                } else {
                    await BaseRepository.atualizarStatusManutencao(base.id, false);
                    relatorio.inadimplentes++;
                }
            }
        }
        return relatorio;
    }
}

module.exports = new BaseService();
