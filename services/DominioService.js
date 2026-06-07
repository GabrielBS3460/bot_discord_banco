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

    async fundarDominio(char, nome, terreno, mistico, tem_agua = false, tem_elemento_mistico = false, bonusNobrezaManual = 0) {
        const saldoChar = Number(char.saldo);
        if (saldoChar < PRECO_FUNDACAO) throw new Error(`SALDO_INSUFICIENTE_${PRECO_FUNDACAO}`);

        const dominioExistente = await prisma.dominio.findUnique({ where: { personagem_id: char.id } });
        if (dominioExistente) throw new Error("JA_POSSUI_DOMINIO");

        const rolagem = Math.floor(Math.random() * 20) + 1;
        const total = rolagem + bonusNobrezaManual;
        if (total < 20) {
            await prisma.personagens.update({ where: { id: char.id }, data: { saldo: { decrement: PRECO_FUNDACAO } } });
            throw new Error(`FALHA_TESTE_FUNDACAO_${total}_CD20`);
        }

        return await prisma.$transaction(async tx => {
            await tx.personagens.update({ where: { id: char.id }, data: { saldo: { decrement: PRECO_FUNDACAO } } });
            return await tx.dominio.create({
                data: {
                    personagem_id: char.id,
                    nome,
                    terreno,
                    tem_agua,
                    tem_elemento_mistico,
                    mistico,
                    nivel: 1,
                    tesouro_lo: 0,
                    corte: "Inexistente",
                    popularidade: mistico ? "N/A" : "Tolerado",
                    imposto_atual: "Médio",
                    acoes_disponiveis: 1, // A fundação consome 1 ação do primeiro mês
                    mes_ultimo_turno: new Date().getMonth() + 1
                },
                include: { construcoes: true, tropas: true, personagem: true }
            });
        });
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
            let ganhosLO = 0;
            let logsFinanceiros = [];
            let popNova = dominio.popularidade;
            let revoltState = dominio.em_revolta;

            // Fim da Revolta?
            if (revoltState && popNova !== "Odiado") {
                revoltState = false;
                logEvento = "✅ **Paz Restaurada:** A revolta popular chegou ao fim!";
            }

            if (revoltState) {
                logEvento = "🔥 **Revolta Popular:** O povo está em fúria! Impostos não foram pagos e houve destruição.";
                ganhosLO = 0;
                logsFinanceiros.push("🚫 **Sem Impostos:** A revolta impediu a arrecadação.");
                
                if (dominio.construcoes.length > 0) {
                    const idxDestruir = Math.floor(Math.random() * dominio.construcoes.length);
                    const predioDestruido = dominio.construcoes[idxDestruir];
                    await prisma.dominioConstrucao.delete({ where: { id: predioDestruido.id } });
                    logsFinanceiros.push(`🏚️ **Destruição:** A construção **${predioDestruido.nome}** foi destruída pelos revoltosos.`);
                    // Atualiza a lista local para o restante do processamento se necessário
                    dominio.construcoes.splice(idxDestruir, 1);
                }
            } else {
                if (dominio.mistico) {
                    ganhosLO = dominio.nivel;
                    logsFinanceiros.push(`✨ Domínio Místico rendeu **${ganhosLO} LO**.`);
                } else {
                    const tabelaImposto = IMPOSTOS[dominio.nivel];
                    const tipoImposto = dominio.imposto_atual.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
                            let ganhoFeira = dominio.construcoes.some(m => m.nome === "Mercado") ? this.rolarDado("1d8") : this.rolarDado("1d4");
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
            }

            const custoCorte = MANUTENCAO_CORTE[dominio.corte] || 0;
            let custoTropas = 0;
            for (const t of dominio.tropas) {
                const dataTropa = CATALOGO_TROPAS[t.nome];
                if (dataTropa) custoTropas += dataTropa.manutencao * t.quantidade;
            }

            const custoTotal = custoCorte + custoTropas;
            let tesouroFinal = dominio.tesouro_lo + ganhosLO - custoTotal;
            
            if (!revoltState) {
                if (dominio.imposto_atual === "Baixo") popNova = this.mudarPopularidade(dominio, 1);
                if (dominio.imposto_atual === "Alto") popNova = this.mudarPopularidade(dominio, -1);
            }

            dominio = await prisma.dominio.update({
                where: { id: dominio.id },
                data: {
                    tesouro_lo: Math.max(0, tesouroFinal),
                    popularidade: popNova,
                    em_revolta: revoltState,
                    acoes_disponiveis: (dominio.corte === "Rica") ? 3 : 2,
                    mes_ultimo_turno: mesAtual
                },
                include: { construcoes: true, tropas: true, personagem: true }
            });

            relatorioTurno = `📆 **O Mês Virou! Relatório de Domínio:**\n\n**Evento:** ${logEvento}\n**Financeiro:**\n${logsFinanceiros.join("\n")}\n📉 Manutenção: **-${custoTotal} LO** (Corte: ${custoCorte}, Tropas: ${custoTropas})\n**Popularidade:** Agora está **${popNova}**.\n**Tesouro Atual:** ${dominio.tesouro_lo} LO.`;
        }
        return { dominio, relatorioTurno };
    }

    async construir(dominioId, charId, nomeConstrucao, bonusManual = 0) {
        const dominio = await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true } });
        if (dominio.acoes_disponiveis <= 0) throw new Error("SEM_ACOES");

        const obra = CATALOGO_CONSTRUCOES[nomeConstrucao];
        if (!obra) throw new Error("CONSTRUCAO_NAO_ENCONTRADA");
        if (dominio.construcoes.length >= dominio.nivel * 3) throw new Error("LIMITE_CONSTRUCOES");
        if (dominio.tesouro_lo < obra.custo) throw new Error(`LO_INSUFICIENTE_${obra.custo}`);

        if (obra.reqTerreno) {
            const terrenosValidos = Array.isArray(obra.reqTerreno) ? obra.reqTerreno : [obra.reqTerreno];
            const temPovoado = dominio.construcoes.some(c => c.nome === "Povoado Afastado");
            let terrainMatch = terrenosValidos.includes(dominio.terreno);
            if (!terrainMatch && terrenosValidos.includes("Rio ou mar") && dominio.tem_agua) terrainMatch = true;
            if (!terrainMatch && terrenosValidos.includes("Elemento místico") && dominio.tem_elemento_mistico) terrainMatch = true;
            if (!terrainMatch && !temPovoado) throw new Error(`TERRENO_INVALIDO_${terrenosValidos.join("_")}`);
        }

        if (obra.req) {
            const reqs = Array.isArray(obra.req) ? obra.req : [obra.req];
            for (const r of reqs) {
                if (!dominio.construcoes.some(c => c.nome === r)) throw new Error(`REQUISITO_FALTANTE_${r}`);
            }
        }

        const cd = 20 + dominio.nivel;
        let bonusConselheiro = 0;
        for (const cons of (dominio.conselheiros || [])) {
            if (CONSELHEIROS[cons] === obra.tipo) { bonusConselheiro = 5; break; }
        }

        const rolagem = Math.floor(Math.random() * 20) + 1;
        const total = rolagem + bonusManual + this.calcularBonusDominio(dominio) + bonusConselheiro;

        if (total < cd) {
            const domErr = await prisma.dominio.update({
                where: { id: dominioId },
                data: { tesouro_lo: { decrement: obra.custo }, acoes_disponiveis: { decrement: 1 } },
                include: { construcoes: true, tropas: true, personagem: true }
            });
            throw { message: `FALHA_CONSTRUCAO_${total}_CD${cd}`, dominio: domErr };
        }

        const log = `🏗️ **${nomeConstrucao}** concluída! (Rolagem: ${rolagem} + Bônus: ${total-rolagem} = ${total} vs CD ${cd})`;
        const dominioAtualizado = await prisma.$transaction(async tx => {
            await tx.dominioConstrucao.create({ data: { dominio_id: dominioId, nome: nomeConstrucao, tipo: obra.tipo, beneficio: obra.beneficio } });
            
            // Bônus passivos imediatos na ficha
            if (nomeConstrucao === "Adega") await tx.personagens.update({ where: { id: charId }, data: { mana_max: { increment: 3 }, mana_atual: { increment: 3 } } });
            if (nomeConstrucao === "Quarto Luxuoso") await tx.personagens.update({ where: { id: charId }, data: { vida_max: { increment: 5 }, vida_atual: { increment: 5 } } });

            return await tx.dominio.update({
                where: { id: dominioId },
                data: { tesouro_lo: Math.max(0, dominio.tesouro_lo - obra.custo), acoes_disponiveis: { decrement: 1 } },
                include: { construcoes: true, tropas: true, personagem: true }
            });
        });
        return { log, dominio: dominioAtualizado };
    }

    async executarAcaoRegente(dominioId, acao, dadosExtras = {}) {
        const dominio = await prisma.dominio.findUnique({ where: { id: dominioId }, include: { personagem: true, construcoes: true, tropas: true } });
        if (dominio.acoes_disponiveis <= 0 && acao !== "Alterar_Imposto") throw new Error("SEM_ACOES");

        let updateData = {};
        if (acao !== "Alterar_Imposto") updateData.acoes_disponiveis = { decrement: 1 };
        
        let logAcao = "";
        const bonusManual = dadosExtras.bonusManual || 0;
        const periciaAcao = acao === "Festival" ? "Atuação" : acao === "Extorquir" ? "Intimidação" : "Nobreza";
        const cd = 20 + (acao === "Governar" ? (dominio.nivel + 1) * 2 : dominio.nivel);
        
        let bonusConselheiro = 0;
        const conselheirosAtuais = Array.isArray(dominio.conselheiros) ? dominio.conselheiros : JSON.parse(dominio.conselheiros || "[]");
        for (const cons of conselheirosAtuais) {
            if (CONSELHEIROS[cons] === periciaAcao) { bonusConselheiro = 5; break; }
        }
        const rolagem = Math.floor(Math.random() * 20) + 1;
        const total = rolagem + bonusManual + this.calcularBonusDominio(dominio) + bonusConselheiro;

        switch (acao) {
            case "Governar": {
                const custoLO = 5 * (dominio.nivel + 1);
                if (dominio.tesouro_lo < custoLO) throw new Error(`LO_INSUFICIENTE_${custoLO}`);
                const dataTerreno = TERRENOS[dominio.terreno] || { nivelMax: 1 };
                if (dominio.nivel >= (dataTerreno.nivelMax + (dominio.tem_agua ? 1 : 0))) throw new Error("LIMITE_TERRENO_ATINGIDO");
                
                if (total < cd) {
                    await prisma.dominio.update({ where: { id: dominioId }, data: { tesouro_lo: { decrement: custoLO }, acoes_disponiveis: { decrement: 1 } } });
                    throw { message: `FALHA_GOVERNAR_${total}_CD${cd}`, dominio: await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true, tropas: true, personagem: true } }) };
                }
                updateData.nivel = { increment: 1 }; updateData.tesouro_lo = { decrement: custoLO };
                logAcao = `👑 **Governar:** Domínio subiu para **Nível ${dominio.nivel + 1}**! (Rolou ${total} vs CD ${cd})`;
                break;
            }
            case "Extorquir": {
                if (dominio.popularidade === "Odiado") {
                    // REVOLTA POPULAR
                    await prisma.dominio.update({
                        where: { id: dominioId },
                        data: {
                            tesouro_lo: 0,
                            nivel: Math.max(1, dominio.nivel - 1),
                            acoes_disponiveis: 0,
                            em_revolta: true
                        }
                    });
                    throw new Error("REVOLTA_POPULAR");
                }

                if (total < cd) {
                    const pop = this.mudarPopularidade(dominio, -1);
                    await prisma.dominio.update({ where: { id: dominioId }, data: { popularidade: pop, acoes_disponiveis: { decrement: 1 } } });
                    throw { message: `FALHA_EXTORQUIR_${total}_CD${cd}`, dominio: await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true, tropas: true, personagem: true } }) };
                }
                const ganhoLO = this.rolarDado("1d6") + dominio.nivel;
                updateData.tesouro_lo = { increment: ganhoLO }; updateData.popularidade = this.mudarPopularidade(dominio, -1);
                logAcao = `🗡️ **Extorquir:** Você arrecadou **${ganhoLO} LO**. (Rolou ${total} vs CD ${cd})`;
                break;
            }
            case "Festival": {
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                if (total < cd) {
                    await prisma.dominio.update({ where: { id: dominioId }, data: { tesouro_lo: { decrement: 1 }, acoes_disponiveis: { decrement: 1 } } });
                    throw { message: `FALHA_FESTIVAL_${total}_CD${cd}`, dominio: await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true, tropas: true, personagem: true } }) };
                }
                updateData.tesouro_lo = { decrement: 1 }; updateData.popularidade = this.mudarPopularidade(dominio, 1);
                logAcao = `🎉 **Festival:** O povo celebrou! (Rolou ${total} vs CD ${cd})`;
                break;
            }
            case "Convocar_Camponeses": {
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                const ganho = this.rolarDado("1d6");
                updateData.tesouro_lo = { decrement: 1 }; updateData.popularidade = this.mudarPopularidade(dominio, -1);
                const ex = await prisma.dominioTropa.findFirst({ where: { dominio_id: dominioId, nome: "Camponeses" } });
                if (ex) await prisma.dominioTropa.update({ where: { id: ex.id }, data: { quantidade: { increment: ganho } } });
                else await prisma.dominioTropa.create({ data: { dominio_id: dominioId, nome: "Camponeses", quantidade: ganho } });
                logAcao = `🌾 **Convocar Camponeses:** **+${ganho} Camponeses**. Popularidade caiu.`;
                break;
            }
            case "Financas_Compra": {
                const qtd = Number(dadosExtras.qtd);
                if (isNaN(qtd) || qtd <= 0) throw new Error("QUANTIDADE_INVALIDA");

                const custo = qtd * 1000;
                if (Number(dominio.personagem.saldo) < custo) throw new Error(`T$_INSUFICIENTE_${custo}`);
                
                if (total < 20) {
                    await prisma.dominio.update({ where: { id: dominioId }, data: { acoes_disponiveis: { decrement: 1 } } });
                    throw { message: `FALHA_FINANCAS_${total}_CD20`, dominio: await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true, tropas: true, personagem: true } }) };
                }
                
                await prisma.personagens.update({ where: { id: dominio.personagem.id }, data: { saldo: { decrement: custo } } });
                updateData.tesouro_lo = { increment: qtd };
                logAcao = `💰 **Finanças:** Investiu T$ ${custo} por **${qtd} LO**. (Rolou ${total} vs CD 20)`;
                break;
            }
            case "Financas_Venda": {
                const qtd = Number(dadosExtras.qtd);
                if (isNaN(qtd) || qtd <= 0) throw new Error("QUANTIDADE_INVALIDA");

                if (dominio.tesouro_lo < qtd) throw new Error(`LO_INSUFICIENTE_${qtd}`);
                
                if (total < 20) {
                    await prisma.dominio.update({ where: { id: dominioId }, data: { acoes_disponiveis: { decrement: 1 } } });
                    throw { message: `FALHA_FINANCAS_${total}_CD20`, dominio: await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true, tropas: true, personagem: true } }) };
                }
                
                const ganho = qtd * 1000;
                await prisma.personagens.update({ where: { id: dominio.personagem.id }, data: { saldo: { increment: ganho } } });
                updateData.tesouro_lo = { decrement: qtd };
                logAcao = `💰 **Finanças:** Sacou **${qtd} LO** por T$ ${ganho}. (Rolou ${total} vs CD 20)`;
                break;
            }
            case "Aumentar_Corte": {
                const cortes = ["Inexistente", "Pobre", "Comum", "Rica"];
                let idx = cortes.indexOf(dominio.corte);
                if (idx >= 3) throw new Error("CORTE_MAXIMA");
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");

                if (total < 20) {
                    await prisma.dominio.update({ where: { id: dominioId }, data: { tesouro_lo: { decrement: 1 }, acoes_disponiveis: { decrement: 1 } } });
                    throw { message: `FALHA_CORTE_${total}_CD20`, dominio: await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true, tropas: true, personagem: true } }) };
                }

                updateData.tesouro_lo = { decrement: 1 }; updateData.corte = cortes[idx + 1];
                logAcao = `🏰 **Aumentar Corte:** Sua corte agora é **${updateData.corte}**. (Rolou ${total} vs CD 20)`;
                break;
            }
            case "Alterar_Imposto": {
                if (!["Baixo", "Médio", "Alto"].includes(dadosExtras.tipo)) throw new Error("TIPO_IMPOSTO_INVALIDO");
                updateData.imposto_atual = dadosExtras.tipo;
                logAcao = `📢 **Decreto Real:** Impostos alterados para **${dadosExtras.tipo}**.`;
                break;
            }
        }
        if (updateData.tesouro_lo && typeof updateData.tesouro_lo.decrement === "number") {
             // Garantir que não fica negativo se estivermos decrementando
             const novoValor = Math.max(0, dominio.tesouro_lo - updateData.tesouro_lo.decrement);
             updateData.tesouro_lo = novoValor;
        } else if (updateData.tesouro_lo && typeof updateData.tesouro_lo.increment === "number") {
             const novoValor = dominio.tesouro_lo + updateData.tesouro_lo.increment;
             updateData.tesouro_lo = novoValor;
        }

        const domAtu = await prisma.dominio.update({ where: { id: dominioId }, data: updateData, include: { construcoes: true, tropas: true, personagem: true } });
        return { log: logAcao, dominio: domAtu };
    }

    async contratarConselheiro(dominioId, titulo) {
        const dominio = await prisma.dominio.findUnique({ where: { id: dominioId } });
        if (!dominio) throw new Error("DOMINIO_NAO_ENCONTRADO");
        
        const cargo = CONSELHEIROS[titulo];
        if (!cargo) throw new Error("CARGO_INVALIDO");

        const limiteConselheiros = {
            "Inexistente": 0,
            "Pobre": 1,
            "Comum": 3,
            "Rica": 9
        };

        let conselheiros = Array.isArray(dominio.conselheiros) ? dominio.conselheiros : JSON.parse(dominio.conselheiros || "[]");
        if (conselheiros.includes(titulo)) throw new Error("JA_POSSUI_CONSELHEIRO");
        if (conselheiros.length >= limiteConselheiros[dominio.corte]) throw new Error("LIMITE_CORTE_CONSELHO");
        
        conselheiros.push(titulo);
        
        return await prisma.dominio.update({
            where: { id: dominioId },
            data: { conselheiros: conselheiros },
            include: { construcoes: true, tropas: true, personagem: true }
        });
    }

    async recrutar(dominioId, nomeTropa, quantidade) {
        const dominio = await prisma.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true } });
        if (dominio.acoes_disponiveis <= 0) throw new Error("SEM_ACOES");
        if (quantidade <= 0) throw new Error("QUANTIDADE_INVALIDA");
        if (quantidade > dominio.nivel) throw new Error(`LIMITE_RECRUTAMENTO_${dominio.nivel}`);
        const data = CATALOGO_TROPAS[nomeTropa];
        if (!data) throw new Error("TROPA_NAO_ENCONTRADA");
        const custo = data.custo * quantidade;
        if (dominio.tesouro_lo < custo) throw new Error(`LO_INSUFICIENTE_${custo}`);
        if (data.req && !dominio.construcoes.some(c => c.nome.toLowerCase() === data.req.toLowerCase())) throw new Error(`REQUISITO_FALTANTE_${data.req}`);

        const ex = await prisma.dominioTropa.findFirst({ where: { dominio_id: dominioId, nome: nomeTropa } });
        const domAtu = await prisma.$transaction(async tx => {
            await tx.dominio.update({ where: { id: dominioId }, data: { tesouro_lo: Math.max(0, dominio.tesouro_lo - custo), acoes_disponiveis: { decrement: 1 } } });
            if (ex) await tx.dominioTropa.update({ where: { id: ex.id }, data: { quantidade: { increment: quantidade } } });
            else await tx.dominioTropa.create({ data: { dominio_id: dominioId, nome: nomeTropa, quantidade } });
            return await tx.dominio.findUnique({ where: { id: dominioId }, include: { construcoes: true, tropas: true, personagem: true } });
        });
        return { log: `⚔️ **${quantidade}x ${nomeTropa}** recrutados!`, dominio: domAtu };
    }
}

module.exports = new DominioService();
