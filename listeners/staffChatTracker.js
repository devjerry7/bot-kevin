// listeners/staffChatTracker.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const staffConfig = require("../config/staffConfig");

module.exports = async (message) => {
  // Ignora bots, DMs ou mensagens sem servidor
  if (message.author.bot || !message.guild) return;

  // 1. Verifica se o usuário é um staff cadastrado na trilha CHAT e ativo
  const staff = await prisma.staffUser.findUnique({
    where: { discordId: message.author.id },
  });

  if (!staff || staff.status !== "ACTIVE" || staff.trackType !== "CHAT") return;

  // 2. Filtro de Canal: Ignora canais configurados no array ignoredChannels
  const channelName = message.channel.name.toLowerCase();
  const isIgnored = staffConfig.ignoredChannels.some((term) =>
    channelName.includes(term.toLowerCase()),
  );
  if (isIgnored) return;

  // 3. Filtro de Qualidade: A mensagem DEVE ter mais de 3 palavras
  const words = message.content.trim().split(/\s+/);
  if (words.length <= 3) return;

  // 4. Atualiza ou cria o registro de tracking da semana no Supabase
  await prisma.staffTracking.upsert({
    where: { discordId: message.author.id },
    update: { msgCount: { increment: 1 } },
    create: {
      discordId: message.author.id,
      msgCount: 1,
      voiceMinutes: 0,
    },
  });
};
