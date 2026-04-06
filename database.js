require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

console.log("=== DIAGNÓSTICO DE BANCO DE DADOS ===");
console.log("A variável DATABASE_URL foi encontrada pelo Node? ->", !!process.env.DATABASE_URL);

const prisma = new PrismaClient();

module.exports = prisma;
