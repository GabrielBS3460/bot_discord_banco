const ContratoRepository = require("../repositories/ContratoRepository.js");
const prisma = require("../database.js");

class ContratoService {
    async criarNovoContrato(nome, nd, vagas, criadorId) {
        try {
            return await ContratoRepository.criar({
                nome: nome,
                nd: nd,
                vagas: vagas,
                criador_id: criadorId,
                status: "ABERTA"
            });
        } catch (err) {
            if (err.code === "P2002") {
                throw new Error("CONTRATO_DUPLICADO");
            }
            throw err;
        }
    }

    async sortearEquipe(missao) {
        let selecionadosAtuais = missao.inscricoes.filter(i => i.selecionado).length;
        let vagasRestantes = missao.vagas - selecionadosAtuais;

        if (vagasRestantes <= 0) throw new Error("EQUIPE_CHEIA");

        let candidatos = missao.inscricoes.filter(i => !i.selecionado);
        if (candidatos.length === 0) throw new Error("SEM_CANDIDATOS");

        const idsParaSelecionar = [];

        const indexPrioritario = candidatos.findIndex(insc => insc.personagem.usuario_id === "292663334333841420");

        if (indexPrioritario !== -1 && vagasRestantes > 0) {
            const inscricaoPrioritaria = candidatos[indexPrioritario];

            idsParaSelecionar.push(inscricaoPrioritaria.id);

            candidatos.splice(indexPrioritario, 1);

            vagasRestantes--;
        }

        if (vagasRestantes > 0 && candidatos.length > 0) {
            const sorteados = [...candidatos]
                .sort(() => Math.random() - 0.5)
                .sort((a, b) => {
                    const dataA = a.personagem.ultima_missao ? new Date(a.personagem.ultima_missao).getTime() : 0;
                    const dataB = b.personagem.ultima_missao ? new Date(b.personagem.ultima_missao).getTime() : 0;
                    return dataA - dataB;
                })
                .slice(0, vagasRestantes);

            sorteados.forEach(s => idsParaSelecionar.push(s.id));
        }

        if (idsParaSelecionar.length > 0) {
            await ContratoRepository.selecionarMuitos(idsParaSelecionar);
        }

        return idsParaSelecionar.length;
    }

    async concluirMissao(missaoId, mestreCharId) {
        return prisma.$transaction(async tx => {
            if (mestreCharId) {
                await tx.inscricoes.upsert({
                    where: { missao_id_personagem_id: { missao_id: missaoId, personagem_id: mestreCharId } },
                    update: { selecionado: true },
                    create: { missao_id: missaoId, personagem_id: mestreCharId, selecionado: true }
                });
            }

            await tx.missoes.update({
                where: { id: missaoId },
                data: { status: "CONCLUIDA" }
            });

            const selecionados = await tx.inscricoes.findMany({
                where: { missao_id: missaoId, selecionado: true }
            });

            await tx.personagens.updateMany({
                where: { id: { in: selecionados.map(i => i.personagem_id) } },
                data: { ultima_missao: new Date() }
            });
        });
    }

    async adicionarJogadorManual(missaoId, personagemId) {
        return await ContratoRepository.vincularPersonagem(missaoId, personagemId, true);
    }

    async removerJogadorComPromocao(missaoId, inscricaoId) {
        return prisma.$transaction(async tx => {
            await tx.inscricoes.delete({ where: { id: inscricaoId } });

            const fila = await tx.inscricoes.findMany({
                where: { missao_id: missaoId, selecionado: false },
                include: { personagem: true },
                orderBy: { id: "asc" }
            });

            if (fila.length > 0) {
                let proximoInscrito;

                const idPrioritario = "292663334333841420";
                const indexPrioritario = fila.findIndex(i => i.personagem.usuario_id === idPrioritario);

                if (indexPrioritario !== -1) {
                    proximoInscrito = fila[indexPrioritario];
                } else {
                    proximoInscrito = fila[0];
                }

                await tx.inscricoes.update({
                    where: { id: proximoInscrito.id },
                    data: { selecionado: true }
                });

                return {
                    promovido: true,
                    nomePromovido: proximoInscrito.id,
                    usuarioPrioritario: proximoInscrito.personagem.usuario_id === idPrioritario
                };
            }

            return { promovido: false };
        });
    }

    async inscreverPersonagem(char, missaoNome) {
        const missao = await ContratoRepository.buscarPorNome(missaoNome);

        if (!missao) throw new Error("MISSAO_NAO_ENCONTRADA");

        if (missao.status !== "ABERTA") throw new Error("MISSAO_FECHADA");

        const nivelMin = missao.nd - 2;
        const nivelMax = missao.nd + 2;

        if (char.nivel_personagem < nivelMin || char.nivel_personagem > nivelMax) {
            throw new Error("NIVEL_INCOMPATIVEL", {
                cause: { min: nivelMin, max: nivelMax, atual: char.nivel_personagem }
            });
        }

        try {
            return await ContratoRepository.vincularPersonagem(missao.id, char.id, false);
        } catch (err) {
            if (err.code === "P2002") throw new Error("JA_INSCRITO");
            throw err;
        }
    }

    async processarResgateMissao(char, inscId, nd, pontosGanhos, CUSTO_NIVEL) {
        const ouroGanho = nd * 100;
        const pontosAtuais = parseFloat(char.pontos_missao) || 0;

        let novosPontos = pontosAtuais + pontosGanhos;
        let novoNivel = char.nivel_personagem;
        let niveisGanhos = 0;

        while (CUSTO_NIVEL[novoNivel] && novosPontos >= CUSTO_NIVEL[novoNivel]) {
            novosPontos -= CUSTO_NIVEL[novoNivel];
            novoNivel++;
            niveisGanhos++;
        }

        novosPontos = Math.round(novosPontos * 10) / 10;

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: char.id },
                data: {
                    saldo: { increment: ouroGanho },
                    pontos_missao: novosPontos,
                    nivel_personagem: novoNivel
                }
            }),
            prisma.inscricoes.update({
                where: { id: inscId },
                data: { recompensa_resgatada: true }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Recompensa Missão (ND ${nd})`,
                    valor: ouroGanho,
                    tipo: "GANHO"
                }
            })
        ]);

        return {
            ouroGanho,
            novosPontos,
            novoNivel,
            niveisGanhos
        };
    }
}

module.exports = new ContratoService();
