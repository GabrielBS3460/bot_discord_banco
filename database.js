const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./banco_de_dados.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

const sql_setup = `
CREATE TABLE IF NOT EXISTS usuarios (
    discord_id TEXT PRIMARY KEY,
    personagem TEXT,
    saldo REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS transacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT NOT NULL,
    data TEXT NOT NULL,
    descricao TEXT,
    valor REAL NOT NULL,
    tipo TEXT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (discord_id)
);`;

db.run("ALTER TABLE usuarios ADD COLUMN ultimo_resgate_manavitra TEXT", (err) => {
    if (err && err.message.includes('duplicate column name')) {
    } else if (err) {
        console.error("Erro ao alterar tabela para Manavitra:", err.message);
    }
});

db.run("ALTER TABLE usuarios ADD COLUMN ultimo_resgate_recompensa TEXT", (err) => {
    if (err && err.message.includes('duplicate column name')) {
    } else if (err) {
        console.error("Erro ao alterar tabela:", err.message);
    }
});

db.exec(sql_setup, (err) => {
    if (err) {
        return console.error(err.message);
    }
});


function getUsuario(discordId) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM usuarios WHERE discord_id = ?";
        db.get(sql, [discordId], (err, row) => {
            if (err) {
                console.error(err.message);
                reject(err);
            }
            resolve(row);
        });
    });
}

function addUsuario(discordId, personagem) {
    return new Promise((resolve, reject) => {
        const sql = "INSERT INTO usuarios (discord_id, personagem, saldo) VALUES (?, ?, ?)";

        db.run(sql, [discordId, personagem, 0], function(err) {
            if (err) {
                console.error(err.message);
                reject(err);
            }
            resolve({ id: this.lastID });
        });
    });
}

function realizarVenda(vendedorId, compradorId, valor, descricaoItem) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            const dataAtual = new Date().toISOString();

            const sqlSubtrair = `UPDATE usuarios SET saldo = saldo - ? WHERE discord_id = ?`;
            db.run(sqlSubtrair, [valor, compradorId]);

            const sqlAdicionar = `UPDATE usuarios SET saldo = saldo + ? WHERE discord_id = ?`;
            db.run(sqlAdicionar, [valor, vendedorId]);

            const sqlCompra = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'COMPRA')`;
            db.run(sqlCompra, [compradorId, dataAtual, `Compra de ${descricaoItem} de @${vendedorId}`, valor]);

            const sqlVenda = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'VENDA')`;
            db.run(sqlVenda, [vendedorId, dataAtual, `Venda de ${descricaoItem} para @${compradorId}`, valor], (err) => {
                if (err) {
                    db.run("ROLLBACK;");
                    console.error("Erro na transação de venda, rollback executado:", err);
                    reject(err);
                } else {
                    db.run("COMMIT;");
                    resolve();
                }
            });
        });
    });
}

function modificarSaldo(alvoId, valor, motivo) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            const sqlUpdate = `UPDATE usuarios SET saldo = saldo + ? WHERE discord_id = ?`;
            db.run(sqlUpdate, [valor, alvoId]);

            const tipo = valor >= 0 ? 'RECOMPENSA' : 'GASTO';
            const dataAtual = new Date().toISOString();
            const sqlInsert = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, ?)`;
            
            db.run(sqlInsert, [alvoId, dataAtual, motivo, Math.abs(valor), tipo], (err) => {
                if (err) {
                    db.run("ROLLBACK;");
                    reject(err);
                } else {
                    db.run("COMMIT;");
                    resolve();
                }
            });
        });
    });
}

function processarMissao(narradorId, recompensa, listaPlayersId, custo) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            const dataAtual = new Date().toISOString();
            const motivoMissao = "Participação em Missão Solicitada";
            const motivoNarrador = "Recompensa por Narrar Missão Solicitada";

            const sqlNarrador = `UPDATE usuarios SET saldo = saldo + ? WHERE discord_id = ?`;
            db.run(sqlNarrador, [recompensa, narradorId]);
            const sqlLogNarrador = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'RECOMPENSA')`;
            db.run(sqlLogNarrador, [narradorId, dataAtual, motivoNarrador, recompensa]);

            listaPlayersId.forEach(playerId => {
                const sqlPlayer = `UPDATE usuarios SET saldo = saldo - ? WHERE discord_id = ?`;
                db.run(sqlPlayer, [custo, playerId]);
                const sqlLogPlayer = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'GASTO')`;
                db.run(sqlLogPlayer, [playerId, dataAtual, motivoMissao, custo]);
            });

            db.run("COMMIT;", (err) => {
                if (err) {
                    db.run("ROLLBACK;");
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

function registrarCooldownManavitra(jogadorId) {
    const dataAtual = new Date().toISOString();
    const sql = `UPDATE usuarios SET ultimo_resgate_manavitra = ? WHERE discord_id = ?`;
    const sql2 = `UPDATE usuarios SET ultimo_resgate_recompensa = ? WHERE discord_id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, [dataAtual, jogadorId], (err) => {
            if (err) reject(err);
            else resolve();
        });
        db.run(sql2, [dataAtual, jogadorId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function registrarRecompensa(jogadorId, valor, motivo) {
    return new Promise((resolve, reject) => {
        const dataAtual = new Date().toISOString();
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");
            const sqlUpdate = `UPDATE usuarios SET saldo = saldo + ?, ultimo_resgate_recompensa = ? WHERE discord_id = ?`;
            db.run(sqlUpdate, [valor, dataAtual, jogadorId]);
            const sqlInsert = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'RECOMPENSA')`;
            db.run(sqlInsert, [jogadorId, dataAtual, motivo, valor], (err) => {
                if (err) {
                    console.log(err);
                    db.run("ROLLBACK;");
                    reject(err);
                } else {
                    db.run("COMMIT;");
                    resolve();
                }
            });
        });
    });
}

function registrarCooldown(jogadorId) {
    const dataAtual = new Date().toISOString();
    const sql = `UPDATE usuarios SET ultimo_resgate_recompensa = ? WHERE discord_id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, [dataAtual, jogadorId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function registrarGasto(jogadorId, valor, motivo) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            // 1. Subtrai o valor do saldo do jogador
            const sqlUpdate = `UPDATE usuarios SET saldo = saldo - ? WHERE discord_id = ?`;
            db.run(sqlUpdate, [valor, jogadorId]);

            // 2. Insere o registro na tabela de transações
            const dataAtual = new Date().toISOString();
            const sqlInsert = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'GASTO')`;
            
            db.run(sqlInsert, [jogadorId, dataAtual, motivo, valor], (err) => {
                if (err) {
                    db.run("ROLLBACK;");
                    reject(err);
                } else {
                    db.run("COMMIT;");
                    resolve();
                }
            });
        });
    });
}

function processarMissa(clerigoId, valorTotal, listaParticipanteIds, custoIndividual) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            const dataAtual = new Date().toISOString();
            const motivoCusto = "Custo de serviço de Missa";
            const motivoVenda = "Venda de serviço de Missa";

            const sqlClerigo = `UPDATE usuarios SET saldo = saldo + ? WHERE discord_id = ?`;
            db.run(sqlClerigo, [valorTotal, clerigoId]);
            const sqlLogClerigo = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'VENDA')`;
            db.run(sqlLogClerigo, [clerigoId, dataAtual, motivoVenda, valorTotal]);

            listaParticipanteIds.forEach(participanteId => {
                const sqlPlayer = `UPDATE usuarios SET saldo = saldo - ? WHERE discord_id = ?`;
                db.run(sqlPlayer, [custoIndividual, participanteId]);
                const sqlLogPlayer = `INSERT INTO transacoes (usuario_id, data, descricao, valor, tipo) VALUES (?, ?, ?, ?, 'GASTO')`;
                db.run(sqlLogPlayer, [participanteId, dataAtual, motivoCusto, custoIndividual]);
            });

            db.run("COMMIT;", (err) => {
                if (err) {
                    db.run("ROLLBACK;");
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

module.exports = {
    db,
    getUsuario,
    addUsuario,
    realizarVenda,
    modificarSaldo,
    processarMissao,
    registrarRecompensa,
    registrarCooldown,
    registrarCooldownManavitra,
    registrarGasto,
    processarMissa 
};