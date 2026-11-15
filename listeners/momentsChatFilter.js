// listeners/momentsChatFilter.js
const MOMENTS_CHANNEL_ID = "1535789016237088798";

// Lista de domínios ou termos de links comuns de clipes/mídias permitidos
const MEDIA_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "twitch.tv",
  "tiktok.com",
  "medal.tv",
  "streamable.com",
  "discord.com",
  "discord.gg",
];

module.exports = async (message) => {
  if (!message || !message.channel) return false;

  // Apenas executa no canal de momentos específico
  if (message.channel.id !== MOMENTS_CHANNEL_ID) return false;

  const hasAttachments = message.attachments.size > 0;
  const content = message.content.toLowerCase();

  // Verifica se a mensagem contém algum link de mídia permitido
  const hasMediaLink = MEDIA_DOMAINS.some((domain) => content.includes(domain));

  // Se NÃO tiver anexos E NÃO tiver link de mídia (ou seja, é puro texto / papo furado)
  if (!hasAttachments && !hasMediaLink) {
    try {
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      const warning = await message.channel.send(
        `<@${message.author.id}>, Aqui é chat geral seu merda? Este canal é exclusivo para momentos e clipes! Por favor, utilize o chat geral para conversas.`,
      );

      setTimeout(() => {
        warning.delete().catch(() => {});
      }, 5000);
    } catch (err) {
      console.error("[MOMENTS FILTER ERROR]:", err);
    }

    return true; // Interceptado
  }

  return false; // Permitido (contém mídia)
};
