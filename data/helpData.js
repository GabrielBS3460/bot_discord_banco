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
            {
                cmd: "/alt",
                desc: "Transfere K$, itens ou equipamentos entre seus personagens.",
                syntax: "/alt <dinheiro | itens | diverso>"
            },
            {
                cmd: "/inventario",
                desc: "Mostra o inventário do seu personagem Ativo",
                syntax: "/inventario filtro:<tipoItem>"
            }
        ]
    },
    base: {
        emoji: "🏰",
        titulo: "Bases & Organizações",
        descricao: "Sistema de propriedades e moradia do grupo.",
        comandos: [
            { cmd: "/base fundar", desc: "Compra e funda uma nova base.", syntax: "/base fundar" },
            { cmd: "/base painel", desc: "Painel de gerenciamento, estrutura e moradores.", syntax: "/base painel" },
            { cmd: "/base construir", desc: "Constrói um novo cômodo (K$ 1.000).", syntax: "/base construir" },
            { cmd: "/base mobiliar", desc: "Compra mobílias para os seus cômodos.", syntax: "/base mobiliar" },
            {
                cmd: "/base morador-add",
                desc: "Convida um jogador para morar na base.",
                syntax: "/base morador-add jogador:@usuario"
            },
            {
                cmd: "/base morador-remover",
                desc: "Remove um morador da base.",
                syntax: "/base morador-remover jogador:@usuario"
            },
            { cmd: "/base reparar", desc: "Conserta cômodos danificados (K$ 500).", syntax: "/base reparar" },
            { cmd: "/base desfazer", desc: "Desfaz uma base Criada", syntax: "/base desfazer" },
            { cmd: "/base upgrade", desc: "Melhora o porte de uma base Criada", syntax: "/base upgrade" }
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
            {
                cmd: "/drop",
                desc: "Gera loot aleatório baseado no ND e guarda no inventário.",
                syntax: "/drop nd:<ND>"
            },
            { cmd: "/avaliar", desc: "Avalia o mestre da sessão.", syntax: "/avaliar mestre:@usuario link:<link>" }
        ]
    },
    comercio: {
        emoji: "⚖️",
        titulo: "Comércio & Leilões",
        descricao: "Compre, venda e negocie itens com jogadores ou NPCs.",
        comandos: [
            {
                cmd: "/mercado anunciar",
                desc: "Coloca um item da sua mochila à venda na Casa de Leilões.",
                syntax: "/mercado anunciar preco:<valor>"
            },
            {
                cmd: "/mercado comprar",
                desc: "Abre o mural de anúncios para comprar itens de outros jogadores.",
                syntax: "/mercado comprar"
            },
            {
                cmd: "/mercado meus_anuncios",
                desc: "Veja seus itens à venda e cancele anúncios se desejar.",
                syntax: "/mercado meus_anuncios"
            },
            {
                cmd: "/venda",
                desc: "Propõe venda direta de um item do inventário a um jogador.",
                syntax: "/venda comprador:@usuario valor:<valor>"
            },
            {
                cmd: "/venda-npc",
                desc: "Vende um item do inventário para um NPC por K$.",
                syntax: "/venda-npc valor:<valor>"
            },
            {
                cmd: "/venda-ingredientes",
                desc: "Venda P2P de ingredientes (entre jogadores).",
                syntax: "/venda-ingredientes comprador:@usuario"
            },
            {
                cmd: "/entregar",
                desc: "Entrega um item do seu inventário diretamente para outro jogador.",
                syntax: "/entregar destinatario:@usuario"
            },
            { cmd: "/saldo", desc: "Mostra seu saldo atual.", syntax: "/saldo" },
            { cmd: "/extrato", desc: "Histórico financeiro do personagem.", syntax: "/extrato" },
            {
                cmd: "/tix",
                desc: "Transferência de K$ entre jogadores.",
                syntax: "/tix destinatario:@usuario valor:<valor>"
            },
            { cmd: "/gasto", desc: "Registra um gasto no seu extrato.", syntax: "/gasto valor:<valor> motivo:<motivo>" }
        ]
    },
    sistemas: {
        emoji: "⚒️",
        titulo: "Ofícios & Profissões",
        descricao: "Sistemas de crafting e culinária.",
        comandos: [
            { cmd: "/forjar", desc: "Cria e aprimora itens usando pontos de forja.", syntax: "/forjar" },
            { cmd: "/setforja", desc: "Configura seus poderes de forja.", syntax: "/setforja poderes:<texto>" },
            { cmd: "/resgatarforja", desc: "Resgata seus pontos de forja diários.", syntax: "/resgatarforja" },
            { cmd: "/feirinha", desc: "Mercado semanal de ingredientes.", syntax: "/feirinha" },
            { cmd: "/cozinhar", desc: "Prepara pratos com bônus e guarda na mochila.", syntax: "/cozinhar" },
            { cmd: "/aprenderculinaria", desc: "Aprende novas receitas.", syntax: "/aprenderculinaria" }
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
            { cmd: "/musica", desc: "Abre o Painel de Música", syntax: "/musica" }
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
            }
        ]
    }
};
