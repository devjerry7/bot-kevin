// commands/staffUtils.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

async function handleMeta(message) {
  // Apaga o comando do usuário para manter o chat limpo
  if (message.deletable) message.delete().catch(() => {});

  const staff = await prisma.staffUser.findUnique({
    where: { discordId: message.author.id },
  });

  if (!staff) {
    const msg = await message.channel.send(
      `${config.emoji?.error || "❌"} Você não faz parte da staff rastreada.`,
    );
    return setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  const staffConfig = (await prisma.staffConfig.findUnique({
    where: { id: "main" },
  })) || { metaChatSemanal: 250, metaCallMinutos: 600 };
  const tracking = (await prisma.staffTracking.findUnique({
    where: { discordId: message.author.id },
  })) || { msgCount: 0, voiceMinutes: 0 };

  let replyText = "";
  if (staff.trackType === "CHAT") {
    const faltam = Math.max(0, staffConfig.metaChatSemanal - tracking.msgCount);
    const percent = Math.min(
      100,
      Math.floor((tracking.msgCount / staffConfig.metaChatSemanal) * 100),
    );

    replyText = `📊 **Seu Progresso (Chat):**\nVocê enviou **${tracking.msgCount}/${staffConfig.metaChatSemanal}** mensagens válidas nesta semana (${percent}%).\n${faltam > 0 ? `Faltam **${faltam}** mensagens.` : "✅ Meta batida!"}\n🔥 Streak atual: **${staff.streakWeeks} semanas**`;
  } else {
    const horasAtuais = (tracking.voiceMinutes / 60).toFixed(1);
    const horasMeta = (staffConfig.metaCallMinutos / 60).toFixed(1);
    const faltamMinutos = Math.max(
      0,
      staffConfig.metaCallMinutos - tracking.voiceMinutes,
    );
    const faltamHoras = (faltamMinutos / 60).toFixed(1);
    const percent = Math.min(
      100,
      Math.floor((tracking.voiceMinutes / staffConfig.metaCallMinutos) * 100),
    );

    replyText = `📊 **Seu Progresso (Call):**\nVocê ficou **${horasAtuais}h / ${horasMeta}h** em call nesta semana (${percent}%).\n${faltamMinutos > 0 ? `Faltam **${faltamHoras}h**.` : "✅ Meta batida!"}\n🔥 Streak atual: **${staff.streakWeeks} semanas**`;
  }

  // Envia a resposta e deleta após 15 segundos para simular o "efêmero"
  const msg = await message.channel.send({
    content: `<@${message.author.id}>, \n${replyText}`,
  });
  setTimeout(() => msg.delete().catch(() => {}), 15000);
}

async function handlePausa(message) {
  // Apaga o comando do usuário
  if (message.deletable) message.delete().catch(() => {});

  const staff = await prisma.staffUser.findUnique({
    where: { discordId: message.author.id },
  });

  if (!staff) {
    const msg = await message.channel.send(
      `${config.emoji?.error || "❌"} Você não faz parte da staff rastreada.`,
    );
    return setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  // Toggle: Se já estiver pausado, retoma. Se estiver ativo, pausa.
  if (staff.status === "PAUSED") {
    await prisma.staffUser.update({
      where: { discordId: message.author.id },
      data: { status: "ACTIVE" },
    });
    const msg = await message.channel.send(
      `${config.emoji?.success || "✅"} <@${message.author.id}>, seu tracking foi **RETOMADO**. Volte ao trabalho!`,
    );
    setTimeout(() => msg.delete().catch(() => {}), 10000);
  } else {
    await prisma.staffUser.update({
      where: { discordId: message.author.id },
      data: { status: "PAUSED" },
    });
    const msg = await message.channel.send(
      `${config.emoji?.success || "✅"} <@${message.author.id}>, seu tracking foi **PAUSADO**. Você não ganhará streaks, mas também não será punido.`,
    );
    setTimeout(() => msg.delete().catch(() => {}), 10000);
  }
}

module.exports = { handleMeta, handlePausa };
