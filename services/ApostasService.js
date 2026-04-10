const prisma = require("../database.js");
const ApostaRepository = require("../repositories/ApostaRepository.js");
const SorteioRepository = require("../repositories/SorteioRepository.js");

class ApostaService {
    async registrarApostaBicho(char, dadosAposta) {
        const { valor, tipo, numero, posicao } = dadosAposta;

        if (char.saldo < valor) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        return prisma.$transaction(async tx => {
            await tx.personagens.update({
                where: { id: char.id },
                data: { saldo: { decrement: valor } }
            });

            await ApostaRepository.criarApostaBicho(
                {
                    personagem_id: char.id,
                    tipo,
                    numero,
                    posicao,
                    valor,
                    status: "PENDENTE"
                },
                tx
            );

            await tx.transacao.create({
                data: {
                    personagem_id: char.id,
                    descricao: `Jogo do Bicho: ${tipo} ${numero}`,
                    valor: valor,
                    tipo: "GASTO"
                }
            });

            return true;
        });
    }

    async realizarSorteio(resultados) {
        const apostas = await SorteioRepository.buscarApostasPendentes();
        const ganhadores = [];

        await prisma.$transaction(
            async tx => {
                const promessasDeBanco = [];

                for (const aposta of apostas) {
                    let ganhou = false;
                    let multiplicador = this._obterMultiplicador(aposta);

                    for (let i = 0; i < resultados.length; i++) {
                        const res = resultados[i];
                        const pos = (i + 1).toString();

                        if (aposta.posicao !== "TODAS" && aposta.posicao !== pos) continue;

                        if (aposta.tipo === "DEZENA" && res.endsWith(aposta.numero)) ganhou = true;
                        if (aposta.tipo === "CENTENA" && res.endsWith(aposta.numero)) ganhou = true;
                        if (aposta.tipo === "MILHAR" && res === aposta.numero) ganhou = true;

                        if (ganhou) break;
                    }

                    if (ganhou) {
                        const premio = aposta.valor * multiplicador;
                        ganhadores.push({ nome: aposta.personagem.nome, valor: premio });

                        promessasDeBanco.push(
                            tx.personagens.update({
                                where: { id: aposta.personagem_id },
                                data: { saldo: { increment: premio } }
                            })
                        );

                        promessasDeBanco.push(
                            tx.transacao.create({
                                data: {
                                    personagem_id: aposta.personagem_id,
                                    descricao: `Prêmio Bicho (${aposta.numero})`,
                                    valor: premio,
                                    tipo: "GANHO"
                                }
                            })
                        );

                        promessasDeBanco.push(
                            tx.apostasBicho.update({ where: { id: aposta.id }, data: { status: "GANHOU" } })
                        );
                    } else {
                        promessasDeBanco.push(
                            tx.apostasBicho.update({ where: { id: aposta.id }, data: { status: "PERDEU" } })
                        );
                    }
                }

                await Promise.all(promessasDeBanco);

                await SorteioRepository.registrarSorteio(resultados, tx);
            },
            {
                maxWait: 5000,
                timeout: 20000
            }
        );

        return ganhadores;
    }

    _obterMultiplicador(aposta) {
        let mult = 0;
        if (aposta.tipo === "DEZENA") mult = 60;
        if (aposta.tipo === "CENTENA") mult = 600;
        if (aposta.tipo === "MILHAR") mult = 4000;

        return aposta.posicao === "TODAS" ? mult / 5 : mult;
    }
}

module.exports = new ApostaService();
