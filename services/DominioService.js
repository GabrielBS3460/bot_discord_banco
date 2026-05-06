const prisma = require("../database.js");
const CATALOGO_CONSTRUCOES = require("../data/construcoesData.js");
const CATALOGO_TROPAS = require("../data/unidadesMilitaresData.js");
const {
    TERRENOS,
    IMPOSTOS,
    MANUTENCAO_CORTE,
    MODIFICADORES_POPULARIDADE,
    CONSELHEIROS
} = require("../data/dominiosData.js");

const PRECO_FUNDACAO = 5000;

class DominioService {
    // ==========================================
    // UTILITÁRIOS
    // ==========================================

    rolarDado(dado) {
        if (!dado || typeof dado !== "string") return 0;
        const [qtd, faces] = dado.split("d").map(Number);
        let total = 0;
        for (let i = 0; i < (qtd || 1); i++) {
            total += Math.floor(Math.random() * (faces || 1)) + 1;
        }
        if (dado.includes("+")) total += parseInt(dado.split("+")[1]);
        if (dado.includes("-")) total -= parseInt(dado.split("-")[1]);
        return total;
    }

    mudarPopularidade(dominio, qtd) {
        if (dominio.mistico) return "N/A";
        const pops = ["Odiado", "Impopular", "Tolerado", "Popular", "Adorado"];
        let index = pops.indexOf(dominio.popularidade);
        index = Math.max(0, Math.min(4, index + qtd));
        return pops[index];
    }

    calcularBonusDominio(dominio) {
        let bonus = MODIFICADORES_POPULARIDADE[dominio.popularidade] || 0;
        if (dominio.corte === "Inexistente") bonus -= 2;
        return bonus;
    }

    // ==========================================
    // CORE DO SISTEMA
    // ==========================================

    async fundarDominio(char, nome, terreno, mistico, bonusNobrezaManual = 0) {
        const saldoChar = Number(char.saldo);
        if (saldoChar < PRECO_FUNDACAO) {
            throw new Error(`SALDO_INSUFICIENTE_${PRECO_FUNDACAO}`);
        }

        const dominioExistente = await prisma.dominio.findUnique({
            where: { personagem_id: char.id }
        });

        if (dominioExistente) {
            throw new Error("JA_POSSUI_DOMINIO");
        }

        const rolagem = Math.floor(Math.random() * 20) + 1;
        const total = rolagem + bonusNobrezaManual;

        if (total < 20) {
            await prisma.personagens.update({
                where: { id: char.id },
                data: { saldo: { decrement: PRECO_FUNDACAO } }
            });
            throw new Error(`FALHA_TESTE_FUNDACAO_${total}_CD20`);
        }

        const novoDominio = await prisma.$transaction(async tx => {
            await tx.personagens.update({
                where: { id: char.id },
                data: { saldo: { decrement: PRECO_FUNDACAO } }
            });

            const dominio = await tx.dominio.create({
                data: {
                    personagem_id: char.id,
                    nome: nome,
                    terreno: terreno,
                    mistico: mistico,
                    nivel: 1,
                    tesouro_lo: 0,
                    corte: "Inexistente",
                    popularidade: mistico ? "N/A" : "Tolerado",
                    imposto_atual: "Médio",
                    acoes_disponiveis: 2,
                    mes_ultimo_turno: new Date().getMonth() + 1
                },
                include: { construcoes: true, tropas: true, personagem: true }
            });

            return dominio;
        });

        return novoDominio;
    }

    async buscarPainel(personagemId) {
        let dominio = await prisma.dominio.findUnique({
            where: { personagem_id: personagemId },
            include: { construcoes: true, tropas: true, personagem: true }
        });

        if (!dominio) return { dominio: null, relatorioTurno: null };

        const mesAtual = new Date().getMonth() + 1;
        let relatorioTurno = "";

        if (dominio.mes_ultimo_turno !== mesAtual) {
            let logEvento = "🕊️ Mês pacífico nas suas terras.";

            // --- ETAPA DOIS: IMPOSTOS E MANUTENÇÃO ---
            let ganhosLO = 0;
            let logsFinanceiros = [];

            if (dominio.mistico) {
                ganhosLO = dominio.nivel;
                logsFinanceiros.push(`✨ Domínio Místico rendeu **${ganhosLO} LO**.`);
            } else {
                const tabelaImposto = IMPOSTOS[dominio.nivel];
                const tipoImposto = dominio.imposto_atual
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                const dadoImposto = tabelaImposto[tipoImposto] || "1";

                ganhosLO = isNaN(dadoImposto) ? this.rolarDado(dadoImposto) : parseInt(dadoImposto);
                logsFinanceiros.push(`💰 Impostos (${dominio.imposto_atual}) renderam **${ganhosLO} LO**.`);

                for (const c of dominio.construcoes) {
                    if (c.nome === "Fazenda") {
                        let fazendaDado = dominio.construcoes.some(m => m.nome === "Moinho") ? "1d8-2" : "1d6-2";
                        let ganhoFaz = this.rolarDado(fazendaDado);
                        if (dominio.construcoes.some(sel => sel.nome === "Celeiro")) ganhoFaz = Math.max(0, ganhoFaz);
                        ganhosLO += ganhoFaz;
                        logsFinanceiros.push(`🌾 Fazenda: **${ganhoFaz} LO**.`);
                    }
                    if (c.nome === "Feira") {
                        let ganhoFeira = dominio.construcoes.some(m => m.nome === "Mercado")
                            ? this.rolarDado("1d8")
                            : this.rolarDado("1d4");
                        ganhosLO += ganhoFeira;
                        logsFinanceiros.push(`🛒 Feira/Mercado: **${ganhoFeira} LO**.`);
                    }
                    if (c.nome === "Porto") {
                        let ganhoPorto = this.rolarDado("1d6");
                        ganhosLO += ganhoPorto;
                        logsFinanceiros.push(`⚓ Porto: **${ganhoPorto} LO**.`);
                    }
                }
            }

            const custoCorte = MANUTENCAO_CORTE[dominio.corte] || 0;
            let custoTropas = 0;
            for (const t of dominio.tropas) {
                const dataTropa = CATALOGO_TROPAS[t.nome];
                if (dataTropa) custoTropas += dataTropa.manutencao * t.quantidade;
            }

            const custoTotal = custoCorte + custoTropas;
            let tesouroFinal = dominio.tesouro_lo + ganhosLO - custoTotal;

            let popNova = dominio.popularidade;
            if (dominio.imposto_atual === "Baixo") popNova = this.mudarPopularidade(dominio, 1);
            if (dominio.imposto_atual === "Alto") popNova = this.mudarPopularidade(dominio, -1);

            let acoesNovas = dominio.corte === "Rica" ? 3 : 2;

            dominio = await prisma.dominio.update({
                where: { id: dominio.id },
                data: {
                    tesouro_lo: Math.max(0, tesouroFinal),
                    popularidade: popNova,
                    acoes_disponiveis: acoesNovas,
                    mes_ultimo_turno: mesAtual
                },
                include: { construcoes: true, tropas: true, personagem: true }
            });

            relatorioTurno =
                `📆 **O Mês Virou! Relatório de Domínio:**\n\n` +
                `**Evento:** ${logEvento}\n` +
                `**Financeiro:**\n${logsFinanceiros.join("\n")}\n` +
                `📉 Manutenção: **-${custoTotal} LO** (Corte: ${custoCorte}, Tropas: ${custoTropas})\n` +
                `**Popularidade:** Agora está **${popNova}**.\n` +
                `**Tesouro Atual:** ${dominio.tesouro_lo} LO.`;
        }

        return { dominio, relatorioTurno };
    }

    async construir(dominioId, charId, nomeConstrucao, bonusManual = 0) {
        const dominio = await prisma.dominio.findUnique({
            where: { id: dominioId },
            include: { construcoes: true }
        });

        if (dominio.acoes_disponiveis <= 0) throw new Error("SEM_ACOES");

        const obra = CATALOGO_CONSTRUCOES[nomeConstrucao];
        if (!obra) throw new Error("CONSTRUCAO_NAO_ENCONTRADA");

        if (dominio.construcoes.length >= dominio.nivel * 3) throw new Error("LIMITE_CONSTRUCOES");
        if (dominio.tesouro_lo < obra.custo) throw new Error(`LO_INSUFICIENTE_${obra.custo}`);

        if (obra.reqTerreno) {
            const terrenosValidos = Array.isArray(obra.reqTerreno) ? obra.reqTerreno : [obra.reqTerreno];
            const temPovoado = dominio.construcoes.some(c => c.nome === "Povoado Afastado");
            if (!terrenosValidos.includes(dominio.terreno) && !temPovoado) {
                throw new Error(`TERRENO_INVALIDO_${terrenosValidos.join("_")}`);
            }
        }

        if (obra.req) {
            const reqs = Array.isArray(obra.req) ? obra.req : [obra.req];
            for (const r of reqs) {
                if (!dominio.construcoes.some(c => c.nome === r)) throw new Error(`REQUISITO_FALTANTE_${r}`);
            }
        }

        const cd = 20 + dominio.nivel;
        const bonusDominio = this.calcularBonusDominio(dominio, obra.tipo);

        let bonusConselheiro = 0;
        const conselheiros = Array.isArray(dominio.conselheiros) ? dominio.conselheiros : [];
        for (const cons of conselheiros) {
            if (CONSELHEIROS[cons] === obra.tipo) {
                bonusConselheiro = 5;
                break;
            }
        }

        const rolagem = Math.floor(Math.random() * 20) + 1;
        const total = rolagem + bonusManual + bonusDominio + bonusConselheiro;

        if (total < cd) {
            await prisma.dominio.update({
                where: { id: dominioId },
                data: {
                    tesouro_lo: { decrement: obra.custo },
                    acoes_disponiveis: { decrement: 1 }
                }
            });
            throw new Error(`FALHA_CONSTRUCAO_${total}_CD${cd}`);
        }

        const log = `🏗️ **${nomeConstrucao}** concluída! (Rolagem: ${rolagem} + Bônus(Perícia:${bonusManual}, Domínio:${bonusDominio}, Conselheiro:${bonusConselheiro}) = ${total} vs CD ${cd})`;

        const dominioAtualizado = await prisma.$transaction(async tx => {
            await tx.dominioConstrucao.create({
                data: {
                    dominio_id: dominioId,
                    nome: nomeConstrucao,
                    tipo: obra.tipo,
                    beneficio: obra.beneficio
                }
            });
            return await tx.dominio.update({
                where: { id: dominioId },
                data: {
                    tesouro_lo: { decrement: obra.custo },
                    acoes_disponiveis: { decrement: 1 }
                },
                include: { construcoes: true, tropas: true, personagem: true }
            });
        });

        return { log, dominio: dominioAtualizado };
    }

    async executarAcaoRegente(dominioId, acao, dadosExtras = {}) {
        const dominio = await prisma.dominio.findUnique({
            where: { id: dominioId },
            include: { personagem: true, construcoes: true, tropas: true }
        });

        if (dominio.acoes_disponiveis <= 0 && acao !== "Alterar_Imposto") throw new Error("SEM_ACOES");

        let updateData = {};
        if (acao !== "Alterar_Imposto") {
            updateData.acoes_disponiveis = { decrement: 1 };
        }
        let logAcao = "";

        const bonusManual = dadosExtras.bonusManual || 0;
        const periciaAcao = acao === "Festival" ? "Atuação" : acao === "Extorquir" ? "Intimidação" : "Nobreza";
        const bonusDominio = this.calcularBonusDominio(dominio, periciaAcao);

        let bonusConselheiro = 0;
        const conselheiros = Array.isArray(dominio.conselheiros) ? dominio.conselheiros : [];
        for (const cons of conselheiros) {
            if (CONSELHEIROS[cons] === periciaAcao) {
                bonusConselheiro = 5;
                break;
            }
        }

        const cd = 20 + (acao === "Governar" ? (dominio.nivel + 1) * 2 : dominio.nivel);
        const rolagem = Math.floor(Math.random() * 20) + 1;
        const total = rolagem + bonusManual + bonusDominio + bonusConselheiro;

        switch (acao) {
            case "Governar": {
                const custoLO = 5 * (dominio.nivel + 1);
                if (dominio.tesouro_lo < custoLO) throw new Error(`LO_INSUFICIENTE_${custoLO}`);
                const dataTerreno = TERRENOS[dominio.terreno] || { nivelMax: 1 };
                if (dominio.nivel >= dataTerreno.nivelMax) throw new Error("LIMITE_TERRENO_ATINGIDO");

                if (total < cd) {
                    const dErr = await prisma.dominio.update({
                        where: { id: dominioId },
                        data: { tesouro_lo: { decrement: custoLO }, acoes_disponiveis: { decrement: 1 } },
                        include: { construcoes: true, tropas: true, personagem: true }
                    });
                    throw { message: `FALHA_GOVERNAR_${total}_CD${cd}`, dominio: dErr };
                }

                updateData.nivel = { increment: 1 };
                updateData.tesouro_lo = { decrement: custoLO };
                logAcao = `👑 **Governar:** Domínio subiu para **Nível ${dominio.nivel + 1}**! (Rolou ${total} vs CD ${cd})`;
                break;
            }
            case "Extorquir": {
                if (total < cd) {
                    updateData.popularidade = this.mudarPopularidade(dominio, -1);
                    const dErr = await prisma.dominio.update({
                        where: { id: dominioId },
                        data: { popularidade: updateData.popularidade, acoes_disponiveis: { decrement: 1 } },
                        include: { construcoes: true, tropas: true, personagem: true }
                    });
                    throw { message: `FALHA_EXTORQUIR_${total}_CD${cd}`, dominio: dErr };
                }
                const ganhoLO = this.rolarDado("1d6") + dominio.nivel;
                updateData.tesouro_lo = { increment: ganhoLO };
                updateData.popularidade = this.mudarPopularidade(dominio, -1);
                logAcao = `🗡️ **Extorquir:** Você arrecadou **${ganhoLO} LO**, mas o povo não gostou. Popularidade: **${updateData.popularidade}**. (Rolou ${total} vs CD ${cd})`;
                break;
            }
            case "Festival": {
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                if (total < cd) {
                    const dErr = await prisma.dominio.update({
                        where: { id: dominioId },
                        data: { tesouro_lo: { decrement: 1 }, acoes_disponiveis: { decrement: 1 } },
                        include: { construcoes: true, tropas: true, personagem: true }
                    });
                    throw { message: `FALHA_FESTIVAL_${total}_CD${cd}`, dominio: dErr };
                }
                updateData.tesouro_lo = { decrement: 1 };
                updateData.popularidade = this.mudarPopularidade(dominio, 1);
                logAcao = `🎉 **Festival:** O povo celebrou! Popularidade aumentou para **${updateData.popularidade}**. (Rolou ${total} vs CD ${cd})`;
                break;
            }
            case "Convocar_Camponeses": {
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                const ganhoCamp = this.rolarDado("1d6");
                updateData.tesouro_lo = { decrement: 1 };
                updateData.popularidade = this.mudarPopularidade(dominio, -1);

                const tropaExistente = await prisma.dominioTropa.findFirst({
                    where: { dominio_id: dominioId, nome: "Camponeses" }
                });
                if (tropaExistente) {
                    await prisma.dominioTropa.update({
                        where: { id: tropaExistente.id },
                        data: { quantidade: { increment: ganhoCamp } }
                    });
                } else {
                    await prisma.dominioTropa.create({
                        data: { dominio_id: dominioId, nome: "Camponeses", quantidade: ganhoCamp }
                    });
                }
                logAcao = `🌾 **Convocar Camponeses:** Você armou o povo! **+${ganhoCamp} Camponeses**. Popularidade caiu para **${updateData.popularidade}**.`;
                break;
            }
            case "Financas_Compra": {
                if (total < 20) throw new Error(`FALHA_FINANCAS_${total}_CD20`);
                const custoT$ = dadosExtras.qtd * 1000;
                if (Number(dominio.personagem.saldo) < custoT$) throw new Error(`T$_INSUFICIENTE_${custoT$}`);
                await prisma.personagens.update({
                    where: { id: dominio.personagem.id },
                    data: { saldo: { decrement: custoT$ } }
                });
                updateData.tesouro_lo = { increment: dadosExtras.qtd };
                logAcao = `💰 **Finanças:** Você investiu T$ ${custoT$} e recebeu **${dadosExtras.qtd} LO**. (Rolou ${total} vs CD 20)`;
                break;
            }
            case "Financas_Venda": {
                if (total < 20) throw new Error(`FALHA_FINANCAS_${total}_CD20`);
                if (dominio.tesouro_lo < dadosExtras.qtd) throw new Error(`LO_INSUFICIENTE_${dadosExtras.qtd}`);
                const ganhoT$ = dadosExtras.qtd * 1000;
                await prisma.personagens.update({
                    where: { id: dominio.personagem.id },
                    data: { saldo: { increment: ganhoT$ } }
                });
                updateData.tesouro_lo = { decrement: dadosExtras.qtd };
                logAcao = `💰 **Finanças:** Você sacou **${dadosExtras.qtd} LO** e recebeu T$ ${ganhoT$}. (Rolou ${total} vs CD 20)`;
                break;
            }
            case "Aumentar_Corte": {
                if (total < 20) throw new Error(`FALHA_CORTE_${total}_CD20`);
                const cortes = ["Inexistente", "Pobre", "Comum", "Rica"];
                let idx = cortes.indexOf(dominio.corte);
                if (idx >= 3) throw new Error("CORTE_MAXIMA");
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                updateData.tesouro_lo = { decrement: 1 };
                updateData.corte = cortes[idx + 1];
                logAcao = `🏰 **Aumentar Corte:** Sua corte agora é **${updateData.corte}**. (Rolou ${total} vs CD 20)`;
                break;
            }
            case "Alterar_Imposto": {
                const novoImposto = dadosExtras.tipo;
                if (!["Baixo", "Médio", "Alto"].includes(novoImposto)) throw new Error("TIPO_IMPOSTO_INVALIDO");
                updateData.imposto_atual = novoImposto;
                logAcao = `📢 **Decreto Real:** A política de impostos foi alterada para **${novoImposto}**.`;
                break;
            }
        }

        const dominioAtualizado = await prisma.dominio.update({
            where: { id: dominioId },
            data: updateData,
            include: { construcoes: true, tropas: true, personagem: true }
        });

        return { log: logAcao, dominio: dominioAtualizado };
    }

    async recrutar(dominioId, nomeTropa, quantidade) {
        const dominio = await prisma.dominio.findUnique({
            where: { id: dominioId },
            include: { construcoes: true }
        });

        if (dominio.acoes_disponiveis <= 0) throw new Error("SEM_ACOES");
        if (quantidade > dominio.nivel) throw new Error(`LIMITE_RECRUTAMENTO_${dominio.nivel}`);

        const tropaData = CATALOGO_TROPAS[nomeTropa];
        if (!tropaData) throw new Error("TROPA_NAO_ENCONTRADA");

        const custoTotal = tropaData.custo * quantidade;
        if (dominio.tesouro_lo < custoTotal) throw new Error(`LO_INSUFICIENTE_${custoTotal}`);

        if (tropaData.req) {
            if (!dominio.construcoes.some(c => c.nome.toLowerCase() === tropaData.req.toLowerCase())) {
                throw new Error(`REQUISITO_FALTANTE_${tropaData.req}`);
            }
        }

        const tropaExistente = await prisma.dominioTropa.findFirst({
            where: { dominio_id: dominioId, nome: nomeTropa }
        });

        const dominioAtualizado = await prisma.$transaction(async tx => {
            await tx.dominio.update({
                where: { id: dominioId },
                data: { tesouro_lo: { decrement: custoTotal }, acoes_disponiveis: { decrement: 1 } }
            });
            if (tropaExistente) {
                await tx.dominioTropa.update({
                    where: { id: tropaExistente.id },
                    data: { quantidade: { increment: quantidade } }
                });
            } else {
                await tx.dominioTropa.create({
                    data: { dominio_id: dominioId, nome: nomeTropa, quantidade: quantidade }
                });
            }
            return await tx.dominio.findUnique({
                where: { id: dominioId },
                include: { construcoes: true, tropas: true, personagem: true }
            });
        });

        return { log: `⚔️ **${quantidade}x ${nomeTropa}** recrutados com sucesso!`, dominio: dominioAtualizado };
    }
}

module.exports = new DominioService();
