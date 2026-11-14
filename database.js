// database.js
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
  });

globalForPrisma.prisma = prisma;

module.exports = prisma;
