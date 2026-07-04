require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

console.log("=== DIAGNÓSTICO DE BANCO DE DADOS ===");
const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
console.log("DATABASE_URL encontrada?", !!dbUrl);
console.log("DIRECT_URL encontrada?", !!directUrl);

if (dbUrl) {
    // Mostra a URL sem a senha para debug
    const sanitized = dbUrl.replace(/:([^@]+)@/, ":****@");
    console.log("DATABASE_URL (sanitizada):", sanitized);
} else {
    console.error("ERRO CRÍTICO: DATABASE_URL está undefined! Verifique as variáveis de ambiente no painel da Square Cloud.");
}

if (directUrl) {
    const sanitized = directUrl.replace(/:([^@]+)@/, ":****@");
    console.log("DIRECT_URL (sanitizada):", sanitized);
}

const prisma = new PrismaClient({
    log: ["error", "warn"],
});

prisma.$connect()
    .then(() => console.log("✅ Conexão com banco de dados bem-sucedida!"))
    .catch((err) => console.error("❌ Falha ao conectar ao banco:", err.message));

module.exports = prisma;
