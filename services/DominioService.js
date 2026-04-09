const prisma = require("../database.js");
const transacaoService = require("../services/TransacaoService.js")

const CLASSES_MISTICAS = [
    "Arcanista", "Necromante", "Magimarcialista", "Bardo",
    "Clérigo", "Druída", "Ermitão", "Usurpador", "Frade" 
];

const PRECO_FUNDACAO = 5000;

class DominioService {
    async fundarDominio(char, nome, terreno, mistico) {
        if (char.tibares < PRECO_FUNDACAO) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        if (mistico && !CLASSES_MISTICAS.includes(char.classe)) {
            throw new Error("CLASSE_INVALIDA_MISTICO");
        }

        const dominioExistente = await prisma.dominio.findUnique({
            where: { personagem_id: char.id }
        });

        if (dominioExistente) {
            throw new Error("JA_POSSUI_DOMINIO");
        }

        const novoDominio = await prisma.$transaction(async (tx) => {
            transacaoService.registrarGasto(char, PRECO_FUNDACAO, "Fundou um dominio");

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
                    acoes_disponiveis: 2,
                    mes_ultimo_turno: new Date().getMonth() + 1 
                }
            });

            return dominio;
        });

        return novoDominio;
    }
    
    async buscarPainel(personagemId) {
        let dominio = await prisma.dominio.findUnique({
            where: { personagem_id: personagemId },
            include: {
                construcoes: true,
                tropas: true
            }
        });

        if (!dominio) return null;

        const mesAtual = new Date().getMonth() + 1;

        if (dominio.mes_ultimo_turno !== mesAtual) {
            
            const acoesTotais = dominio.corte === "Rica" ? 3 : 2;

            dominio = await prisma.dominio.update({
                where: { id: dominio.id },
                data: {
                    acoes_disponiveis: acoesTotais,
                    mes_ultimo_turno: mesAtual
                },
                include: {
                    construcoes: true,
                    tropas: true
                }
            });
        }

        return dominio;
    }

    static POPULARIDADES = ["Odiado", "Impopular", "Tolerado", "Popular", "Adorado"];
    static CORTES = ["Inexistente", "Pobre", "Comum", "Rica"];

    async executarAcaoRegente(dominioId, acao, dadosExtras = {}) {
        const dominio = await prisma.dominio.findUnique({ 
            where: { id: dominioId }, 
            include: { personagem: true } 
        });

        if (dominio.acoes_disponiveis <= 0) throw new Error("SEM_ACOES");

        let updateData = { acoes_disponiveis: { decrement: 1 } };
        let logAcao = "";

        const mudarPop = (qtd) => {
            if (dominio.mistico) return "N/A"; 
            let index = DominioService.POPULARIDADES.indexOf(dominio.popularidade);
            index = Math.max(0, Math.min(4, index + qtd)); 
            return DominioService.POPULARIDADES[index];
        };

        switch (acao) {
            case "Governar":
                const custoGov = 5 * (dominio.nivel + 1);
                if (dominio.tesouro_lo < custoGov) throw new Error(`LO_INSUFICIENTE_${custoGov}`);
                
                updateData.nivel = { increment: 1 };
                updateData.tesouro_lo = { decrement: custoGov };
                logAcao = `👑 **Governar:** Seu domínio prosperou! Subiu para o **Nível ${dominio.nivel + 1}** (Custou ${custoGov} LO).`;
                break;

            case "Extorquir":
                const ganhoLO = Math.floor(Math.random() * 6) + 1 + dominio.nivel; 
                const novaPopExt = mudarPop(-1);
                
                updateData.tesouro_lo = { increment: ganhoLO };
                updateData.popularidade = novaPopExt;
                logAcao = `🗡️ **Extorquir:** Você espremeu o povo e arrecadou **${ganhoLO} LO**. Sua popularidade caiu para **${novaPopExt}**!`;
                break;

            case "Festival":
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                const novaPopFest = mudarPop(1);
                
                updateData.tesouro_lo = { decrement: 1 };
                updateData.popularidade = novaPopFest;
                logAcao = `🎭 **Festival:** O povo celebrou! Custou 1 LO e sua popularidade subiu para **${novaPopFest}**.`;
                break;

            case "Aumentar_Corte":
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                let indexCorte = DominioService.CORTES.indexOf(dominio.corte);
                
                if (indexCorte >= 3) throw new Error("CORTE_MAXIMA");
                const novaCorte = DominioService.CORTES[indexCorte + 1];
                
                updateData.tesouro_lo = { decrement: 1 };
                updateData.corte = novaCorte;
                logAcao = `🏰 **Aumentar Corte:** Você contratou novos servos! Sua corte agora é **${novaCorte}** (Custou 1 LO).`;
                break;

            case "Convocar_Camponeses":
                if (dominio.tesouro_lo < 1) throw new Error("LO_INSUFICIENTE_1");
                const camponesesGerados = Math.floor(Math.random() * 6) + 1; // 1d6
                const novaPopCamp = mudarPop(-1);

                updateData.tesouro_lo = { decrement: 1 };
                updateData.popularidade = novaPopCamp;

                const tropaExiste = await prisma.dominioTropa.findFirst({
                    where: { dominio_id: dominio.id, nome: "Camponeses" }
                });

                if (tropaExiste) {
                    await prisma.dominioTropa.update({
                        where: { id: tropaExiste.id },
                        data: { quantidade: { increment: camponesesGerados } }
                    });
                } else {
                    await prisma.dominioTropa.create({
                        data: { dominio_id: dominio.id, nome: "Camponeses", quantidade: camponesesGerados }
                    });
                }

                logAcao = `🌾 **Convocar Camponeses:** Você armou o povo! **+${camponesesGerados} Camponeses** recrutados. Popularidade caiu para **${novaPopCamp}** (Custou 1 LO).`;
                break;
                
            case "Financas_Compra":
                const custoT$ = dadosExtras.qtd * 1000;
                if (dominio.personagem.saldo < custoT$) throw new Error(`T$_INSUFICIENTE_${custoT$}`);
                
                updateData.tesouro_lo = { increment: dadosExtras.qtd };
                
                await prisma.personagens.update({
                    where: { id: dominio.personagem.id },
                    data: { saldo: { decrement: custoT$ } }
                });
                
                logAcao = `💰 **Finanças:** Você investiu T$ ${custoT$} e injetou **${dadosExtras.qtd} LO** no tesouro do domínio.`;
                break;
                
            case "Financas_Venda":
                if (dominio.tesouro_lo < dadosExtras.qtd) throw new Error(`LO_INSUFICIENTE_${dadosExtras.qtd}`);
                
                const ganhoT$ = dadosExtras.qtd * 1000;
                updateData.tesouro_lo = { decrement: dadosExtras.qtd };
                
                await prisma.personagens.update({
                    where: { id: dominio.personagem.id },
                    data: { saldo: { increment: ganhoT$ } }
                });
                
                logAcao = `💰 **Finanças:** Você sacou **${dadosExtras.qtd} LO** do tesouro, convertendo em T$ ${ganhoT$} para o seu bolso.`;
                break;
        }

        await prisma.dominio.update({
            where: { id: dominio.id },
            data: updateData
        });

        return logAcao;
    }
}

module.exports = new DominioService();