process.env.DATABASE_URL =
    "postgresql://postgres.djmambmnusfonxvvhape:Botguilda123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
module.exports = prisma;
