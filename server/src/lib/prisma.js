const { PrismaClient } = require('@prisma/client');

// Single shared client — a new PrismaClient per module exhausts the connection pool.
const prisma = new PrismaClient();

module.exports = prisma;
