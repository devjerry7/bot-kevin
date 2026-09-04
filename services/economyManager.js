// services/economyManager.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- CONFIGURAÇÕES PUXADAS DO .ENV (Com fallback de segurança) ---
const DAILY_AMOUNT = Number(process.env.ECONOMY_DAILY_AMOUNT) || 500;
const WORK_MIN = Number(process.env.ECONOMY_WORK_MIN) || 50;
const WORK_MAX = Number(process.env.ECONOMY_WORK_MAX) || 200;

// Cooldowns fixos (podem ir pro .env no futuro se você quiser alterar)
const COOLDOWN_DAILY = 24 * 60 * 60 * 1000; // 24 horas
const COOLDOWN_WORK = 1 * 60 * 60 * 1000; // 1 hora

module.exports = {
  // --- CONTA & SALDO ---
  getAccount: async (userId) => {
    let account = await prisma.economy.findUnique({
      where: { userId: userId },
    });
    if (!account) {
      account = await prisma.economy.create({ data: { userId } });
    }
    return account;
  },

  addMoney: async (userId, amount) => {
    const acc = await module.exports.getAccount(userId);
    await prisma.economy.update({
      where: { userId: acc.userId },
      data: { wallet: acc.wallet + amount },
    });
    return acc.wallet + amount;
  },

  removeMoney: async (userId, amount) => {
    const acc = await module.exports.getAccount(userId);
    const newBalance = Math.max(0, acc.wallet - amount);
    await prisma.economy.update({
      where: { userId: acc.userId },
      data: { wallet: newBalance },
    });
    return newBalance;
  },

  pay: async (senderId, receiverId, amount) => {
    const sender = await module.exports.getAccount(senderId);
    const receiver = await module.exports.getAccount(receiverId);

    if (sender.wallet < amount)
      return { success: false, msg: "Saldo insuficiente." };
    if (amount <= 0) return { success: false, msg: "Valor inválido." };

    await prisma.$transaction([
      prisma.economy.update({
        where: { userId: sender.userId },
        data: { wallet: sender.wallet - amount },
      }),
      prisma.economy.update({
        where: { userId: receiver.userId },
        data: { wallet: receiver.wallet + amount },
      }),
    ]);

    return { success: true };
  },

  // --- ECONOMIA BÁSICA ---
  claimDaily: async (userId) => {
    const acc = await module.exports.getAccount(userId);
    const now = Date.now();
    const last = acc.lastDaily ? acc.lastDaily.getTime() : 0;

    if (now - last < COOLDOWN_DAILY) {
      const remaining = COOLDOWN_DAILY - (now - last);
      return { success: false, remaining };
    }

    await prisma.economy.update({
      where: { userId: acc.userId },
      data: { wallet: acc.wallet + DAILY_AMOUNT, lastDaily: new Date() },
    });

    return { success: true, amount: DAILY_AMOUNT };
  },

  work: async (userId) => {
    const acc = await module.exports.getAccount(userId);
    const now = Date.now();
    const last = acc.lastWork ? acc.lastWork.getTime() : 0;

    if (now - last < COOLDOWN_WORK) {
      const remaining = COOLDOWN_WORK - (now - last);
      return { success: false, remaining };
    }

    const earnings =
      Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;

    await prisma.economy.update({
      where: { userId: acc.userId },
      data: { wallet: acc.wallet + earnings, lastWork: new Date() },
    });

    return { success: true, amount: earnings };
  },

  // Busca os top 10 do servidor inteiro
  getLeaderboard: async () => {
    return await prisma.economy.findMany({
      orderBy: { wallet: "desc" },
      take: 10,
    });
  },

  // --- SISTEMA DE ITENS E INVENTÁRIO ---
  buyItem: async (userId, itemPrice, itemId) => {
    const acc = await module.exports.getAccount(userId);

    if (acc.wallet < itemPrice)
      return { success: false, msg: "Saldo insuficiente." };

    try {
      await prisma.$transaction([
        prisma.economy.update({
          where: { userId: acc.userId },
          data: { wallet: acc.wallet - itemPrice },
        }),
        prisma.inventory.upsert({
          where: { userId_itemId: { userId, itemId } },
          update: { quantity: { increment: 1 } },
          create: { userId, itemId, quantity: 1 },
        }),
      ]);
      return { success: true };
    } catch (e) {
      console.error("[ECONOMY ERROR]", e);
      return { success: false, msg: "Erro no banco de dados." };
    }
  },

  hasItem: async (userId, itemId) => {
    const item = await prisma.inventory.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });
    return item && item.quantity > 0;
  },

  getItems: async (userId) => {
    return await prisma.inventory.findMany({ where: { userId } });
  },
};
