// handlers/chatProtectionHandler.js
const { EmbedBuilder } = require("discord.js");

// Auxiliar para obter os IDs da Whitelist do .env
const getWhitelistIds = () => {
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  return whitelistEnv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

// Notifica os donos no PV sobre a tentativa de violação
const notifyOwnersInDM = async (
  client,
  guild,
  author,
  violationType,
  details,
) => {
  const whitelistIds = getWhitelistIds();

  const alertEmbed = new EmbedBuilder()
    .setTitle("🚨 [SEGURANÇA] TENTATIVA DE ENVIO SUSPEITO INTERCEPTADA")
    .setDescription(
      `O bot bloqueou o envio de um arquivo/link potencialmente perigoso no servidor **${guild.name}**.\n\n` +
        `👤 **Membro:** ${author.tag} (\`${author.id}\`)\n` +
        `📌 **Tipo de Violação:** \`${violationType}\`\n` +
        `🔍 **Conteúdo Interceptado:** \`${details}\``,
    )
    .setColor(0xff0000)
    .setTimestamp();

  for (const ownerId of whitelistIds) {
    try {
      const ownerUser = await client.users.fetch(ownerId);
      if (ownerUser) {
        await ownerUser.send({ embeds: [alertEmbed] });
      }
    } catch (e) {
      console.error(
        `[CHAT PROTECTION DM ERROR] Não foi possível enviar DM para ${ownerId}`,
      );
    }
  }
};

module.exports = async (message) => {
  if (message.author.bot) return false;

  const WHITELIST_IDS = getWhitelistIds();

  // Apenas membros da Whitelist Oficial ignoram as regras de segurança
  if (WHITELIST_IDS.includes(message.author.id)) return false;

  const { content, channel, attachments, guild, client, member } = message;
  const contentLower = content ? content.toLowerCase() : "";

  let violationType = null;
  let warningMessage = "";
  let details = "";

  // --- 1. FILTRO DE ANEXOS E ARQUIVOS PERIGOSOS ---
  if (attachments && attachments.size > 0) {
    const dangerousExtensions = [
      ".exe",
      ".scr",
      ".bat",
      ".cmd",
      ".vbs",
      ".ps1",
      ".msi",
      ".jar",
      ".zip",
      ".rar",
      ".7z",
      ".iso",
      ".apk",
    ];

    for (const [, attachment] of attachments) {
      const fileNameLower = attachment.name.toLowerCase();
      const hasDangerousExt = dangerousExtensions.some((ext) =>
        fileNameLower.endsWith(ext),
      );

      if (hasDangerousExt) {
        violationType = "ARQUIVO_SUSPEITO";
        details = attachment.name;
        warningMessage = `🛡️ **${message.author}, envio de arquivos executáveis ou compactados foi bloqueado por segurança.**`;
        break;
      }
    }
  }

  // --- 2. ANTI-INVITE DO DISCORD ---
  const inviteRegex = /(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)/i;
  if (!violationType && inviteRegex.test(contentLower)) {
    violationType = "LINK_CONVITE";
    details = content;
    warningMessage = `🚫 **${message.author}, divulgação de convites não é permitida.**`;
  }

  // --- 3. ANTI-PHISHING, NITRO FALSO E LINKS ENCURTADOS ---
  const maliciousLinkRegex =
    /(steamcommunity\..*?\..*|discordgift\..*|discor\.me|discord-nitro\..*|nitrofree\..*|steam-nitro\..*|free-nitro\..*|steamgifts\..*giveaway.*|tinyurl\.com|bit\.ly)/i;

  if (!violationType && maliciousLinkRegex.test(contentLower)) {
    violationType = "LINK_MALICIOSO";
    details = content;
    warningMessage = `🛡️ **${message.author}, link potencialmente perigoso bloqueado.**`;
  }

  // --- 4. AÇÃO PUNITIVA E NOTIFICAÇÃO ---
  if (violationType) {
    try {
      const COLOR_ERROR = process.env.COLOR_ERROR
        ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
        : 0xff0000;

      // Deleta a mensagem imediatamente
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      // Aplica Mute temporário no usuário por segurança se aplicável
      if (member && member.moderatable) {
        await member.timeout(
          10 * 60 * 1000,
          `Bloqueio automático: ${violationType}`,
        );
      }

      // Notifica os Donos no PV
      await notifyOwnersInDM(
        client,
        guild,
        message.author,
        violationType,
        details,
      );

      // Envia aviso temporário no canal
      const embed = new EmbedBuilder()
        .setDescription(warningMessage)
        .setColor(COLOR_ERROR);

      const msg = await channel.send({ embeds: [embed] });
      setTimeout(() => msg.delete().catch(() => {}), 5000);

      return true; // Interrompe a execução
    } catch (error) {
      console.error(`[CHAT PROTECTION ERROR]: ${error.message}`);
    }
  }

  return false; // Mensagem liberada
};
