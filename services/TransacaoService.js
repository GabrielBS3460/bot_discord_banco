const prisma = require("../database.js");
const TransacaoRepository = require("../repositories/TransacaoRepository.js");

class TransacaoService {
    async obterExtratoFormatado(personagemId, formatarMoeda, limite = 5) {
        const transacoes = await TransacaoRepository.buscarUltimasTransacoes(personagemId, limite);

        if (transacoes.length === 0) {
            return "Nenhuma transação registrada.";
        }

        return transacoes
            .map(t => {
                const sinal = t.tipo === "GASTO" || t.tipo === "COMPRA" ? "-" : "+";
                const dataFormatada = new Date(t.data).toLocaleDateString("pt-BR");

                return `\`${dataFormatada}\` ${sinal} ${formatarMoeda(t.valor)} - *${t.descricao}*`;
            })
            .join("\n");
    }

    async registrarGasto(personagem, valor, motivo) {
        if (personagem.saldo < valor) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        const [personagemAtualizado] = await prisma.$transaction([
            prisma.personagens.update({
                where: { id: personagem.id },
                data: { saldo: { decrement: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: personagem.id,
                    descricao: motivo,
                    valor: valor,
                    tipo: "GASTO"
                }
            })
        ]);

        return personagemAtualizado;
    }

    async transferirEntreJogadores(charRemetente, charDestinatario, valor) {
        if (charRemetente.saldo < valor) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        return prisma.$transaction([
            prisma.personagens.update({
                where: { id: charRemetente.id },
                data: { saldo: { decrement: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: charRemetente.id,
                    descricao: `Transferiu para ${charDestinatario.nome}`,
                    valor: valor,
                    tipo: "GASTO"
                }
            }),
            prisma.personagens.update({
                where: { id: charDestinatario.id },
                data: { saldo: { increment: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: charDestinatario.id,
                    descricao: `Recebeu de ${charRemetente.nome}`,
                    valor: valor,
                    tipo: "RECOMPENSA"
                }
            })
        ]);
    }

    async executarVendaIngrediente(vendedorId, compradorId, itemSelecionado, qtdVenda, precoVenda) {
        const vFinal = await prisma.personagens.findUnique({ where: { id: vendedorId } });
        const cFinal = await prisma.personagens.findUnique({ where: { id: compradorId } });

        const estoqueV = { ...(vFinal.estoque_ingredientes || {}) };

        if (!estoqueV[itemSelecionado] || estoqueV[itemSelecionado] < qtdVenda) {
            throw new Error("ESTOQUE_VENDEDOR_INSUFICIENTE");
        }

        if (cFinal.saldo < precoVenda) {
            throw new Error("SALDO_COMPRADOR_INSUFICIENTE");
        }

        estoqueV[itemSelecionado] -= qtdVenda;
        if (estoqueV[itemSelecionado] <= 0) delete estoqueV[itemSelecionado];

        const estoqueC = { ...(cFinal.estoque_ingredientes || {}) };
        estoqueC[itemSelecionado] = (estoqueC[itemSelecionado] || 0) + qtdVenda;

        await prisma.$transaction([
            prisma.personagens.update({
                where: { id: vFinal.id },
                data: {
                    estoque_ingredientes: estoqueV,
                    saldo: { increment: precoVenda }
                }
            }),
            prisma.personagens.update({
                where: { id: cFinal.id },
                data: {
                    estoque_ingredientes: estoqueC,
                    saldo: { decrement: precoVenda }
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: vFinal.id,
                    descricao: `Vendeu ${qtdVenda}x ${itemSelecionado} para ${cFinal.nome}`,
                    valor: precoVenda,
                    tipo: "RECOMPENSA"
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: cFinal.id,
                    descricao: `Comprou ${qtdVenda}x ${itemSelecionado} de ${vFinal.nome}`,
                    valor: precoVenda,
                    tipo: "GASTO"
                }
            })
        ]);

        return { vendedorAtualizado: vFinal, compradorAtualizado: cFinal };
    }

    async registrarEntregaItem(destinatarioId, nomeItem) {
        return TransacaoRepository.criar({
            personagem_id: destinatarioId,
            descricao: `Recebeu Item: ${nomeItem}`,
            valor: 0,
            tipo: "RECOMPENSA",
            categoria: "ITEM"
        });
    }

    async processarMissa(clerigoId, clerigoNome, charsPagantes, valorTotal, custoIndividual) {
        const operacoes = [];

        operacoes.push(
            prisma.personagens.update({
                where: { id: clerigoId },
                data: { saldo: { increment: valorTotal } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: clerigoId,
                    descricao: `Realizou Missa`,
                    valor: valorTotal,
                    tipo: "VENDA"
                }
            })
        );

        for (const fiel of charsPagantes) {
            operacoes.push(
                prisma.personagens.update({
                    where: { id: fiel.id },
                    data: { saldo: { decrement: custoIndividual } }
                }),
                prisma.transacao.create({
                    data: {
                        personagem_id: fiel.id,
                        descricao: `Pagou Missa para ${clerigoNome}`,
                        valor: custoIndividual,
                        tipo: "GASTO"
                    }
                })
            );
        }

        return prisma.$transaction(operacoes);
    }

    async registrarVendaNpc(personagemId, valor) {
        return prisma.$transaction([
            prisma.personagens.update({
                where: { id: personagemId },
                data: { saldo: { increment: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: personagemId,
                    descricao: `Venda para NPC`,
                    valor: valor,
                    tipo: "GANHO"
                }
            })
        ]);
    }

    async executarVendaItemRP(vendedorId, compradorId, vendedorNome, compradorNome, item, valor) {
        const cFinal = await prisma.personagens.findUnique({ where: { id: compradorId } });

        if (cFinal.saldo < valor) {
            throw new Error("SALDO_COMPRADOR_INSUFICIENTE");
        }

        return prisma.$transaction([
            prisma.personagens.update({
                where: { id: compradorId },
                data: { saldo: { decrement: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: compradorId,
                    descricao: `Comprou ${item} de ${vendedorNome}`,
                    valor: valor,
                    tipo: "COMPRA"
                }
            }),
            prisma.personagens.update({
                where: { id: vendedorId },
                data: { saldo: { increment: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: vendedorId,
                    descricao: `Vendeu ${item} para ${compradorNome}`,
                    valor: valor,
                    tipo: "VENDA"
                }
            })
        ]);
    }

    async registrarLootMestre(personagemId, valor, mestreNome, motivo) {
        return prisma.$transaction([
            prisma.personagens.update({
                where: { id: personagemId },
                data: {
                    saldo: { increment: valor }
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: personagemId,
                    descricao: `Loot: ${motivo} (Mestre: ${mestreNome})`,
                    valor: valor,
                    tipo: "RECOMPENSA"
                }
            })
        ]);
    }

    async processarDropRecompensa(personagemId, valor, nd) {
        if (!valor || valor <= 0) return null;

        return prisma.$transaction([
            prisma.personagens.update({
                where: { id: personagemId },
                data: { saldo: { increment: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: personagemId,
                    descricao: `Drop ND ${nd}`,
                    valor: valor,
                    tipo: "GANHO"
                }
            })
        ]);
    }

    async registrarPungaDinheiro(personagemId, valor, nd) {
        if (valor <= 0) return null;

        return prisma.$transaction(async tx => {
            const atualizado = await tx.personagens.update({
                where: { id: personagemId },
                data: { saldo: { increment: valor } }
            });

            await tx.transacao.create({
                data: {
                    personagem_id: personagemId,
                    descricao: `Punga (Alvo ND ${nd})`,
                    valor: valor,
                    tipo: "GANHO"
                }
            });

            return atualizado;
        });
    }

    async modificarSaldoAdministrativo(personagemId, valor, motivo) {
        return prisma.$transaction(async tx => {
            const personagemAtualizado = await tx.personagens.update({
                where: { id: personagemId },
                data: {
                    saldo: { increment: valor }
                }
            });

            await tx.transacao.create({
                data: {
                    personagem_id: personagemId,
                    descricao: `[ADMIN] ${motivo}`,
                    valor: valor,
                    tipo: valor >= 0 ? "RECOMPENSA" : "GASTO"
                }
            });

            return personagemAtualizado;
        });
    }
}

module.exports = new TransacaoService();
