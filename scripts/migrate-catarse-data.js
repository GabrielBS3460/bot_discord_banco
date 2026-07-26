require("dotenv").config();
const path = require("path");
const fs = require("fs");
const prisma = require("../database.js");

const ASSINANTES_PATH = path.resolve(__dirname, "..", "NEW_COMMANDS", "data", "catarse-assinantes.json");
const EMAILS_PATH = path.resolve(__dirname, "..", "NEW_COMMANDS", "data", "cartarse-emails.json");

async function migrate() {
    console.log("Iniciando migração dos dados do Catarse...\n");

    // Migrar assinantes
    if (fs.existsSync(ASSINANTES_PATH)) {
        const assinantes = JSON.parse(fs.readFileSync(ASSINANTES_PATH, "utf-8"));
        console.log(`Encontrados ${assinantes.length} assinantes para migrar.`);

        for (const a of assinantes) {
            await prisma.catarseAssinante.upsert({
                where: { id: a.id },
                update: {
                    nome: a.Nome,
                    email: a.Email,
                    pagamentoMensal: a.Pagamento_Mensal,
                    totalPago: a.Total_Pago,
                    status: a.Status,
                    dataDeInicio: a.Data_De_Inicio,
                    mesesAssinante: a.Meses_Assinante,
                },
                create: {
                    id: a.id,
                    nome: a.Nome,
                    email: a.Email,
                    pagamentoMensal: a.Pagamento_Mensal,
                    totalPago: a.Total_Pago,
                    status: a.Status,
                    dataDeInicio: a.Data_De_Inicio,
                    mesesAssinante: a.Meses_Assinante,
                },
            });
        }
        console.log(`✅ ${assinantes.length} assinantes migrados.`);
    } else {
        console.log("⚠️ Arquivo de assinantes não encontrado, pulando.");
    }

    // Migrar emails
    if (fs.existsSync(EMAILS_PATH)) {
        const emails = JSON.parse(fs.readFileSync(EMAILS_PATH, "utf-8"));
        console.log(`Encontrados ${emails.length} emails conectados para migrar.`);

        for (const e of emails) {
            await prisma.catarseEmail.upsert({
                where: { id: e.id },
                update: { userId: e.userId, email: e.email },
                create: { id: e.id, userId: e.userId, email: e.email },
            });
        }
        console.log(`✅ ${emails.length} emails migrados.`);
    } else {
        console.log("⚠️ Arquivo de emails não encontrado, pulando.");
    }

    console.log("\nMigração concluída!");
    await prisma.$disconnect();
}

migrate().catch(err => {
    console.error("Erro na migração:", err);
    prisma.$disconnect();
    process.exit(1);
});
