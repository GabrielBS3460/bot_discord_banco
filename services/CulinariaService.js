const PersonagemRepository = require("../repositories/PersonagemRepository.js");
const prisma = require("../database.js");

class CulinariaService {
    verificarPericia(personagem) {
        const listaPericias = personagem.pericias || [];
        if (!listaPericias.includes("Ofício Cozinheiro")) {
            throw new Error("SEM_PERICIA");
        }
    }

    calcularLimiteReceitas(personagem, temAsDaCozinha) {
        let limite = Math.max(1, personagem.inteligencia + 1);

        if (temAsDaCozinha) {
            let bonusPoder = 3;
            const nivel = personagem.nivel_personagem || 1;

            if (nivel >= 11) bonusPoder += 3;
            if (nivel >= 17) bonusPoder += 3;

            limite += bonusPoder;
        }

        return limite;
    }

    async aprenderReceita(personagemId, receita, conhecidas, limite) {
        if (conhecidas.length >= limite) {
            throw new Error("LIMITE_ATINGIDO");
        }

        if (conhecidas.includes(receita)) {
            throw new Error("RECEITA_JA_CONHECIDA");
        }

        const novasConhecidas = [...conhecidas, receita];

        return PersonagemRepository.atualizar(personagemId, {
            receitas_conhecidas: novasConhecidas
        });
    }

    analisarIngredientes(receitasSelecionadas, estoque, pontosForja, DB_CULINARIA) {
        let ingredientesAgregados = {};
        let efeitosPadrao = [];

        receitasSelecionadas.forEach(nome => {
            const r = DB_CULINARIA.RECEITAS[nome];
            efeitosPadrao.push(`• ${r.desc}`);
            for (const [ing, qtd] of Object.entries(r.ing)) {
                ingredientesAgregados[ing] = (ingredientesAgregados[ing] || 0) + qtd;
            }
        });

        let temIngredientes = true;
        let faltantes = [];

        for (const [ing, qtdNecessaria] of Object.entries(ingredientesAgregados)) {
            if (!estoque[ing] || estoque[ing] < qtdNecessaria) {
                temIngredientes = false;
                faltantes.push(`${ing} (${estoque[ing] || 0}/${qtdNecessaria})`);
            }
        }

        const numReceitas = receitasSelecionadas.length;
        const custoBasePts = numReceitas * 1.0;
        const custoEspecialPts = numReceitas * 2.0;

        const temEspeciarias = (estoque["Especiarias"] || 0) >= 1;
        const podeEspecial = temEspeciarias && pontosForja >= custoEspecialPts;

        return {
            temIngredientes,
            faltantes,
            custoBasePts,
            custoEspecialPts,
            podeEspecial,
            efeitosPadrao,
            ingredientesAgregados
        };
    }

    async finalizarCozimento(personagem, ingredientesAgregados, usarEspeciarias, custoPts, nomePratoLog) {
        const estoque = { ...(personagem.estoque_ingredientes || {}) };
        for (const [ing, qtdNecessaria] of Object.entries(ingredientesAgregados)) {
            estoque[ing] -= qtdNecessaria;
            if (estoque[ing] <= 0) delete estoque[ing];
        }

        if (usarEspeciarias) {
            estoque["Especiarias"] -= 1;
            if (estoque["Especiarias"] <= 0) delete estoque["Especiarias"];
        }

        const descLog = usarEspeciarias ? `Cozinhou ${nomePratoLog} x5 (Especial)` : `Cozinhou ${nomePratoLog} x5`;

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: personagem.id },
                data: {
                    estoque_ingredientes: estoque,
                    pontos_forja_atual: { decrement: custoPts }
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: personagem.id,
                    descricao: descLog,
                    valor: 0,
                    tipo: "GASTO"
                }
            })
        ]);

        return estoque;
    }

    async atualizarFeirinhaSeNecessario(personagem, DB_CULINARIA) {
        const agora = new Date();
        const ultimaGeracao = personagem.feira_data_geracao ? new Date(personagem.feira_data_geracao) : new Date(0);
        const diffDias = (agora - ultimaGeracao) / (1000 * 60 * 60 * 24);
        let itensLoja = personagem.feira_itens || [];

        if (diffDias >= 7 || itensLoja.length === 0) {
            const todosIngredientes = Object.keys(DB_CULINARIA.INGREDIENTES);
            const sorteados = [];

            for (let i = 0; i < 15; i++) {
                const nome = todosIngredientes[Math.floor(Math.random() * todosIngredientes.length)];
                sorteados.push({
                    nome: nome,
                    preco: DB_CULINARIA.INGREDIENTES[nome]
                });
            }

            itensLoja = sorteados;

            await PersonagemRepository.atualizar(personagem.id, {
                feira_itens: itensLoja,
                feira_data_geracao: agora
            });

            return { itensLoja, diffDias: 0 };
        }

        return { itensLoja, diffDias };
    }

    async comprarIngredienteNaFeira(charAtual, index, nome, preco) {
        const listaAtual = [...(charAtual.feira_itens || [])];

        if (!listaAtual[index] || listaAtual[index].nome !== nome) {
            throw new Error("ITEM_INVALIDO");
        }

        if (charAtual.saldo < preco) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        const novoEstoque = { ...(charAtual.estoque_ingredientes || {}) };
        novoEstoque[nome] = (novoEstoque[nome] || 0) + 1;

        listaAtual.splice(index, 1);

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: charAtual.id },
                data: {
                    saldo: { decrement: preco },
                    estoque_ingredientes: novoEstoque,
                    feira_itens: listaAtual
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: charAtual.id,
                    descricao: `Comprou ${nome}`,
                    valor: preco,
                    tipo: "GASTO"
                }
            })
        ]);

        return { novoEstoque, listaAtual, saldoAtualizado: charAtual.saldo - preco };
    }
}

module.exports = new CulinariaService();
