const CATEGORIAS = {
    economia: {
        emoji: "💰",
        titulo: "Administração de Economia",
        comandos: [
            {
                cmd: "/modificar-saldo",
                desc: "Adiciona ou remove saldo de um jogador.",
                syntax: "/modificar-saldo jogador:@usuario valor:<valor> motivo:[motivo opcional]"
            },
            {
                cmd: "/admin-extrato",
                desc: "Consulta as últimas 10 transações de um jogador silenciosamente.",
                syntax: "/admin-extrato jogador:@usuario"
            }
        ]
    },
    personagem: {
        emoji: "👤",
        titulo: "Administração de Personagens",
        comandos: [
            {
                cmd: "/admin-criar",
                desc: "Cria um personagem para um jogador manualmente.",
                syntax: "/admin-criar jogador:@usuario nome:<nome>"
            },
            {
                cmd: "/admin-trocar",
                desc: "Força a troca do personagem ativo de um jogador.",
                syntax: "/admin-trocar jogador:@usuario nome:<nome>"
            }
        ]
    },
    contratos: {
        emoji: "📜",
        titulo: "Administração de Contratos e Mestres",
        comandos: [
            {
                cmd: "/conferirnota",
                desc: "Mostra a avaliação média e as notas detalhadas de um mestre.",
                syntax: "/conferirnota mestre:@usuario"
            }
        ]
    },
    sistema: {
        emoji: "⚙️",
        titulo: "Ferramentas do Sistema",
        comandos: [
            {
                cmd: "/sortearbicho",
                desc: "Realiza o sorteio semanal do jogo do bicho e paga os vencedores.",
                syntax: "/sortearbicho"
            }
        ]
    }
};

module.exports = CATEGORIAS;
