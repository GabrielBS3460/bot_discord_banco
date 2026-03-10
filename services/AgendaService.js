const AgendaRepository = require("../repositories/AgendaRepository.js");

class AgendaService {
    async gerarMatrizHeatmap() {
        const players = await AgendaRepository.buscarAgendasGlobais();

        const matrix = Array(7)
            .fill(0)
            .map(() => Array(24).fill(0));
        let totalAtivos = 0;

        players.forEach(p => {
            if (p.agenda && Array.isArray(p.agenda)) {
                totalAtivos++;
                for (let day = 0; day < 7; day++) {
                    if (p.agenda[day]) {
                        p.agenda[day].forEach(hour => {
                            if (hour >= 0 && hour <= 23) matrix[day][hour]++;
                        });
                    }
                }
            }
        });

        return { matrix, totalAtivos };
    }

    async salvarAgendaUsuario(userId, availability) {
        return AgendaRepository.atualizarAgenda(userId, availability);
    }
}

module.exports = new AgendaService();
