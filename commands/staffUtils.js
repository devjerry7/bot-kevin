// commands/staffUtils.js
const { EmbedBuilder } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

async function handleMeta(message) {
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

  const iconeSucesso = config.emoji?.success || "✅";
  const iconeProgresso = config.emoji?.loading || "⏳";
  const iconeFogo = config.emoji?.fire || "🔥";
  const iconeStats = config.emoji?.stats || "📊";

  if (type === "CHAT" || type === "BOTH") {
    const metaChat = staffConfig.metaChatSemanal;
    const atualChat = tracking.msgCount;
    const faltamChat = Math.max(0, metaChat - atualChat);
    const pChat = Math.min(100, Math.floor((atualChat / metaChat) * 100));
    const statusChat = atualChat >= metaChat ? iconeSucesso : iconeProgresso;

    descricao +=
      `💬 **Atividade no Chat:**\n` +
      `• Progresso: **${atualChat}** / **${metaChat}** mensagens (${pChat}%)\n` +
      `${faltamChat > 0 ? `• Faltam **${faltamChat}** mensagens.` : `• ${iconeSucesso} Meta de chat concluída!`}\n\n`;
  }

  if (type === "CALL" || type === "BOTH") {
    const metaCall = staffConfig.metaCallMinutos;
    const atualCall = tracking.voiceMinutes;
    const horasAtuais = (atualCall / 60).toFixed(1);
    const horasMeta = (metaCall / 60).toFixed(1);
    const faltamMinutos = Math.max(0, metaCall - atualCall);
    const faltamHoras = (faltamMinutos / 60).toFixed(1);
    const pCall = Math.min(100, Math.floor((atualCall / metaCall) * 100));
    const statusCall = atualCall >= metaCall ? iconeSucesso : iconeProgresso;

    descricao +=
      `🎙️ **Atividade em Call:**\n` +
      `• Progresso: **${horasAtuais}h** / **${horasMeta}h** (${pCall}%)\n` +
      `${faltamMinutos > 0 ? `• Faltam **${faltamHoras}h** em call.` : `• ${iconeSucesso} Meta de call concluída!`}\n\n`;
  }

  descricao += `${iconeFogo} **Sequência:** ${staff.streakWeeks} semanas consecutivas.`;

  const embed = new EmbedBuilder()
    .setTitle(`${iconeStats} Seu Progresso na Equipe`)
    .setDescription(descricao)
    .setColor(config.colorBase || 0x00ffcc)
    .setTimestamp();

  const msg = await message.channel.send({
    content: `<@${message.author.id}>`,
    embeds: [embed],
  });
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

  const textoAviso =
    novoStatus === "PAUSED"
      ? `seu monitoramento foi **pausado**. Você está seguro de punições esta semana, mas não acumulará sequência.`
      : `seu monitoramento foi **retomado**. Bom trabalho de volta!`;

  const icone =
    novoStatus === "PAUSED"
      ? config.emoji?.warning || "⚠️"
      : config.emoji?.success || "✅";
  const msg = await message.channel.send(
    `${icone} <@${message.author.id}>, ${textoAviso}`,
  );
  setTimeout(() => msg.delete().catch(() => {}), 10000);
}

module.exports = { handleMeta, handlePausa };
