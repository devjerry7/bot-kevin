// commands/staffUtils.js (ou commands/meta.js)
const { EmbedBuilder } = require("discord.js");
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
      `${config.emoji?.error || "❌"} Você não faz parte da equipe monitorada.`,
    );
    return setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  const staffConfig = (await prisma.staffConfig.findUnique({
    where: { id: "main" },
  })) || { metaChatSemanal: 250, metaCallMinutos: 600 };
  const tracking = (await prisma.staffTracking.findUnique({
    where: { discordId: message.author.id },
  })) || { msgCount: 0, voiceMinutes: 0 };

  const type = staff.trackType; // CHAT, CALL ou BOTH
  let descricao = "";

  if (type === "CHAT" || type === "BOTH") {
    const metaChat = staffConfig.metaChatSemanal;
    const atualChat = tracking.msgCount;
    const pChat = Math.min(100, Math.floor((atualChat / metaChat) * 100));
    const statusChat =
      atualChat >= metaChat
        ? config.emoji?.success || "✅"
        : config.emoji?.loading || "⏳";

    descricao += `💬 **Chat:** ${atualChat} / ${metaChat} mensagens (${pChat}%) ${statusChat}\n`;
  }

  if (type === "CALL" || type === "BOTH") {
    const metaCall = staffConfig.metaCallMinutos;
    const atualCall = tracking.voiceMinutes;
    const horasAtuais = (atualCall / 60).toFixed(1);
    const horasMeta = (metaCall / 60).toFixed(1);
    const pCall = Math.min(100, Math.floor((atualCall / metaCall) * 100));
    const statusCall =
      atualCall >= metaCall
        ? config.emoji?.success || "✅"
        : config.emoji?.loading || "⏳";

    descricao += `🎙️ **Call:** ${horasAtuais}h / ${horasMeta}h (${pCall}%) ${statusCall}\n`;
  }

  descricao += `\n🔥 **Sequência atual:** ${staff.streakWeeks} semanas`;

  const embed = new EmbedBuilder()
    .setTitle(`${config.emoji?.stats || "📊"} Seu Progresso na Equipe`)
    .setDescription(descricao)
    .setColor(config.colorBase || 0x00ffcc)
    .setTimestamp();

  const msg = await message.channel.send({
    content: `<@${message.author.id}>`,
    embeds: [embed],
  });

  // Apaga o feedback após 15 segundos para manter o canal limpo
  setTimeout(() => msg.delete().catch(() => {}), 15000);
}

async function handlePausa(message) {
  if (message.deletable) message.delete().catch(() => {});

  const staff = await prisma.staffUser.findUnique({
    where: { discordId: message.author.id },
  });

  if (!staff) {
    const msg = await message.channel.send(
      `${config.emoji?.error || "❌"} Você não faz parte da equipe monitorada.`,
    );
    return setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  const novoStatus = staff.status === "PAUSED" ? "ACTIVE" : "PAUSED";
  await prisma.staffUser.update({
    where: { discordId: message.author.id },
    data: { status: novoStatus },
  });

  const txt =
    novoStatus === "PAUSED"
      ? `${config.emoji?.warning || "⚠️"} Seu monitoramento foi **pausado**. Você não acumulará pontos, mas estará seguro de punições.`
      : `${config.emoji?.success || "✅"} Seu monitoramento foi **retomado**. Bom trabalho!`;

  const msg = await message.channel.send(`<@${message.author.id}>, ${txt}`);
  setTimeout(() => msg.delete().catch(() => {}), 10000);
}

module.exports = { handleMeta, handlePausa };
