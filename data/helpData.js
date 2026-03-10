module.exports = {
    personagem: {
        emoji: "👤",
        titulo: "Personagem & Economia",
        descricao: "Gerencie sua ficha e economia.",
        comandos: [
            { cmd: "/cadastrar", desc: "Cria um personagem.", syntax: "/cadastrar nome:<nome>" },
            {
                cmd: "/personagem",
                desc: "Gerencia personagens (listar, trocar, apagar).",
                syntax: "/personagem <subcomando>"
            },
            { cmd: "/ficha", desc: "Mostra sua ficha.", syntax: "/ficha" },
            { cmd: "/saldo", desc: "Mostra seu saldo atual.", syntax: "/saldo" },
            { cmd: "/extrato", desc: "Histórico financeiro do personagem.", syntax: "/extrato" },
            {
                cmd: "/tix",
                desc: "Transferência de K$ entre jogadores.",
                syntax: "/tix destinatario:@usuario valor:<valor>"
            },
            {
                cmd: "/gasto",
                desc: "Registra um gasto no seu extrato.",
                syntax: "/gasto valor:<valor> motivo:<motivo>"
            },
            {
                cmd: "/alt",
                desc: "Transfere K$, itens ou equipamentos entre seus personagens.",
                syntax: "/alt <dinheiro | itens | diverso>"
            }
        ]
    },
    base: {
        emoji: "🏰",
        titulo: "Bases & Organizações",
        descricao: "Sistema de propriedades e moradia do grupo.",
        comandos: [
            { cmd: "/base fundar", desc: "Compra e funda uma nova base.", syntax: "/base fundar" },
            { cmd: "/base painel", desc: "Abre o painel de gerenciamento da sua base.", syntax: "/base painel" },
            { cmd: "/base construir", desc: "Constrói um novo cômodo (K$ 1.000).", syntax: "/base construir" },
            { cmd: "/base mobiliar", desc: "Compra mobílias para os seus cômodos.", syntax: "/base mobiliar" }
        ]
    },
    agenda: {
        emoji: "📅",
        titulo: "Agenda & Horários",
        descricao: "Sincronização de disponibilidade do servidor.",
        comandos: [
            { cmd: "/agenda marcar", desc: "Define os dias e horários que você está livre.", syntax: "/agenda marcar" },
            { cmd: "/agenda mapa", desc: "Mostra o mapa de calor com os horários de todos.", syntax: "/agenda mapa" }
        ]
    },
    contrato: {
        emoji: "🛡️",
        titulo: "Sistema de Contratos",
        descricao: "Participe de aventuras e missões.",
        comandos: [
            { cmd: "/inscrever", desc: "Se candidata a um contrato aberto.", syntax: "/inscrever" },
            { cmd: "/resgatar", desc: "Resgata a recompensa de um contrato.", syntax: '/resgatar contrato:"Nome"' },
            { cmd: "/drop", desc: "Gera loot aleatório baseado no ND.", syntax: "/drop nd:<ND>" },
            { cmd: "/avaliar", desc: "Avalia o mestre da sessão.", syntax: "/avaliar mestre:@usuario link:<link>" }
        ]
    },
    sistemas: {
        emoji: "⚒️",
        titulo: "Ofícios & Comércio",
        descricao: "Crafting, culinária e mercado.",
        comandos: [
            { cmd: "/forjar", desc: "Cria itens usando pontos de forja.", syntax: "/forjar" },
            { cmd: "/setforja", desc: "Configura seus poderes de forja.", syntax: "/setforja poderes:<texto>" },
            { cmd: "/resgatarforja", desc: "Resgata seus pontos de forja diários.", syntax: "/resgatarforja" },
            { cmd: "/feirinha", desc: "Mercado semanal de ingredientes.", syntax: "/feirinha" },
            { cmd: "/cozinhar", desc: "Prepara pratos com bônus.", syntax: "/cozinhar" },
            { cmd: "/aprenderculinaria", desc: "Aprende novas receitas.", syntax: "/aprenderculinaria" },
            {
                cmd: "/venda-npc",
                desc: "Vende um item para um NPC por K$.",
                syntax: "/venda-npc valor:<valor> link:<link>"
            },
            {
                cmd: "/venda-ingredientes",
                desc: "Venda P2P (entre jogadores).",
                syntax: "/venda-ingredientes comprador:@usuario"
            },
            {
                cmd: "/venda",
                desc: "Propõe venda de qualquer item a um jogador.",
                syntax: "/venda comprador:@usuario item:<nome> valor:<valor> link:<link>"
            }
        ]
    },
    atividades: {
        emoji: "🎲",
        titulo: "Jogos & Interação",
        descricao: "Atividades paralelas e minigames.",
        comandos: [
            {
                cmd: "/apostar",
                desc: "Faz uma aposta no jogo do bicho.",
                syntax: "/apostar valor:<valor> tipo:<tipo> numero:<num>"
            },
            { cmd: "/punga", desc: "Tenta roubar K$ de um alvo aleatório.", syntax: "/punga" }
        ]
    },
    mestre: {
        emoji: "👑",
        titulo: "Comandos de Mestre",
        descricao: "Gerenciamento de mesas e recompensas.",
        comandos: [
            {
                cmd: "/criarcontrato",
                desc: "Cria um novo contrato no mural.",
                syntax: '/criarcontrato nome:"Nome" nd:<ND> vagas:<num>'
            },
            {
                cmd: "/painelcontrato",
                desc: "Gerencia os inscritos do contrato.",
                syntax: '/painelcontrato nome:"Nome"'
            },
            {
                cmd: "/loot",
                desc: "Entrega K$ diretamente a um jogador.",
                syntax: "/loot jogador:@usuario valor:<valor>"
            },
            {
                cmd: "/solicitada",
                desc: "Registra missão solicitada e paga o grupo.",
                syntax: "/solicitada nd:<ND> custo:<valor> jogador1:@usuario ..."
            },
            {
                cmd: "/missa",
                desc: "Cobra o dízimo e transfere para o clérigo.",
                syntax: "/missa valor_total:<valor> fiel1:@usuario ..."
            }
        ]
    }
};
