const PersonagemRepository = require("../repositories/PersonagemRepository.js");
const UsuarioRepository = require("../repositories/UsuarioRepository.js");
const prisma = require("../database.js");

class PersonagemService {
    calcularDadosBase(personagem) {
        const nivelReal = personagem.nivel_personagem || 3;
        let patamar = 1;
        if (nivelReal >= 5) patamar = 2;
        if (nivelReal >= 11) patamar = 3;
        if (nivelReal >= 17) patamar = 4;
        return { nivelReal, patamar };
    }

    async processarDescanso(char, tipoCustomId, bonusVida, bonusMana) {
        const { nivelReal } = this.calcularDadosBase(char);

        let multiplicador = 1;
        let nomeTipo = "Normal";

        if (tipoCustomId === "desc_ruim") {
            multiplicador = 0.5;
            nomeTipo = "Ruim";
        } else if (tipoCustomId === "desc_conf") {
            multiplicador = 2;
            nomeTipo = "Confortável";
        } else if (tipoCustomId === "desc_lux") {
            multiplicador = 3;
            nomeTipo = "Luxuoso";
        }

        const recBase = Math.floor(nivelReal * multiplicador) || 1;

        const novaVida = Math.min(char.vida_max, char.vida_atual + recBase + bonusVida);
        const novaMana = Math.min(char.mana_max, char.mana_atual + recBase + bonusMana);

        const curouVida = novaVida - char.vida_atual;
        const curouMana = novaMana - char.mana_atual;

        const charAtualizado = await PersonagemRepository.atualizar(char.id, {
            vida_atual: novaVida,
            mana_atual: novaMana,
            ultimo_descanso: new Date()
        });

        await PersonagemRepository.registrarLogDescanso(char.id, curouVida, curouMana, nomeTipo);

        return { charAtualizado, curouVida, curouMana };
    }

    verificarPodeDescansar(char) {
        if (!char.ultimo_descanso) return true;
        const agora = new Date();
        const ultimo = new Date(char.ultimo_descanso);
        const mesmoDia =
            agora.getDate() === ultimo.getDate() &&
            agora.getMonth() === ultimo.getMonth() &&
            agora.getFullYear() === ultimo.getFullYear();
        return !mesmoDia;
    }

    async criarNovoPersonagem(discordId, nome) {
        await UsuarioRepository.upsert(discordId);

        const contagem = await PersonagemRepository.contarPorUsuario(discordId);
        if (contagem >= 3) {
            throw new Error("LIMITE_PERSONAGENS");
        }

        try {
            const novoPersonagem = await PersonagemRepository.criar({
                nome: nome,
                usuario_id: discordId,
                saldo: 0
            });

            let ativadoAutomaticamente = false;

            if (contagem === 0) {
                await UsuarioRepository.atualizarPersonagemAtivo(discordId, novoPersonagem.id);
                ativadoAutomaticamente = true;
            }

            return { novoPersonagem, ativadoAutomaticamente };
        } catch (err) {
            if (err.code === "P2002") throw new Error("NOME_DUPLICADO");
            throw err;
        }
    }

    async listarPersonagens(discordId, formatarMoeda) {
        const personagens = await PersonagemRepository.buscarTodosDoJogador(discordId);
        if (personagens.length === 0) throw new Error("NENHUM_PERSONAGEM");

        const usuario = await UsuarioRepository.buscarPorId(discordId);
        const ativoId = usuario?.personagem_ativo_id;

        return personagens
            .map(p => {
                const ativo = p.id === ativoId ? " (⭐ Ativo)" : "";
                return `• **${p.nome}**${ativo} - Saldo: ${formatarMoeda(p.saldo)}`;
            })
            .join("\n");
    }

    async trocarPersonagemAtivo(discordId, nomeAlvo) {
        const personagem = await PersonagemRepository.buscarPorNomeEJogador(nomeAlvo, discordId);
        if (!personagem) throw new Error("PERSONAGEM_NAO_ENCONTRADO");

        await UsuarioRepository.atualizarPersonagemAtivo(discordId, personagem.id);
        return personagem;
    }

    async prepararApagar(discordId, nomeAlvo) {
        const personagem = await PersonagemRepository.buscarPorNomeEJogador(nomeAlvo, discordId);
        if (!personagem) throw new Error("PERSONAGEM_NAO_ENCONTRADO");
        return personagem;
    }

    async confirmarApagar(discordId, personagemId) {
        const usuario = await UsuarioRepository.buscarPorId(discordId);

        if (usuario?.personagem_ativo_id === personagemId) {
            await UsuarioRepository.atualizarPersonagemAtivo(discordId, null);
        }

        await PersonagemRepository.apagarPersonagemCompleto(personagemId);
    }

    async adminCriarPersonagem(alvoId, nome) {
        return prisma.$transaction(async tx => {
            await tx.usuarios.upsert({
                where: { discord_id: alvoId },
                update: {},
                create: { discord_id: alvoId }
            });

            const contagem = await tx.personagens.count({
                where: { usuario_id: alvoId }
            });

            if (contagem >= 3) {
                throw new Error("LIMITE_EXCEDIDO");
            }

            const novoPersonagem = await tx.personagens.create({
                data: {
                    nome: nome,
                    usuario_id: alvoId,
                    saldo: 0
                }
            });

            let statusMsg = "Personagem criado com sucesso.";

            if (contagem === 0) {
                await tx.usuarios.update({
                    where: { discord_id: alvoId },
                    data: { personagem_ativo_id: novoPersonagem.id }
                });
                statusMsg = "Criado e definido como **ATIVO** automaticamente.";
            }

            return { novoPersonagem, statusMsg };
        });
    }

    async adminTrocarPersonagemAtivo(alvoId, nomePersonagem) {
        const personagemAlvo = await prisma.personagens.findFirst({
            where: {
                nome: { equals: nomePersonagem, mode: "insensitive" },
                usuario_id: alvoId
            }
        });

        if (!personagemAlvo) {
            throw new Error("PERSONAGEM_NAO_ENCONTRADO");
        }

        await prisma.usuarios.update({
            where: { discord_id: alvoId },
            data: { personagem_ativo_id: personagemAlvo.id }
        });

        return personagemAlvo;
    }
}

module.exports = new PersonagemService();
