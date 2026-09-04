// handlers/ticketHandler.js
const {
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags,
} = require("discord.js");

const { BTN_OPEN } = require("../commands/ticketPanel");
const BTN_CLOSE = "btn_ticket_close";
const BTN_TRANSCRIPT = "btn_ticket_transcript";
const BTN_DELETE = "btn_ticket_delete";

// --- FUNÇÃO GERADORA DE HTML (MANTIDA INTACTA) ---
const generateHtmlTranscript = (messages, channelName) => {
  const sortedMessages = Array.from(messages.values()).reverse();

  const rows = sortedMessages
    .map((m) => {
      const date = new Date(m.createdTimestamp).toLocaleString("pt-BR");
      const avatarUrl = m.author.displayAvatarURL({
        extension: "png",
        size: 64,
      });

      const content =
        m.content ||
        (m.embeds.length > 0
          ? "<i>[Mensagem contendo Embed]</i>"
          : "<i>[Sem conteúdo de texto]</i>");

      let attachmentHtml = "";
      if (m.attachments.size > 0) {
        attachmentHtml = m.attachments
          .map(
            (att) =>
              `<br><a href="${att.url}" target="_blank" style="color: #00b0f4; font-size: 0.9em;">📎 [Anexo: ${att.name}]</a>`,
          )
          .join("");
      }

      return `
        <div class="message">
            <img src="${avatarUrl}" class="avatar" alt="${m.author.username}">
            <div class="content">
                <div>
                    <span class="username">${m.author.username}</span>
                    <span class="timestamp">${date}</span>
                </div>
                <div class="text">
                    ${content.replace(/\n/g, "<br>")}
                    ${attachmentHtml}
                </div>
            </div>
        </div>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Transcript - ${channelName}</title>
        <style>
            body { background-color: #36393f; color: #dcddde; font-family: "Whitney", "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 1px solid #4f545c; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #fff; margin: 0; font-size: 1.5rem; }
            .header p { color: #b9bbbe; margin-top: 5px; font-size: 0.9rem; }
            .message { display: flex; margin-bottom: 20px; }
            .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; cursor: pointer; }
            .content { display: flex; flex-direction: column; }
            .username { color: #fff; font-weight: 500; margin-right: 5px; }
            .timestamp { color: #72767d; font-size: 0.75rem; }
            .text { color: #dcddde; font-size: 0.9375rem; line-height: 1.375rem; margin-top: 5px; white-space: pre-wrap; }
            a { color: #00b0f4; text-decoration: none; }
            a:hover { text-decoration: underline; }
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #2f3136; }
            ::-webkit-scrollbar-thumb { background: #202225; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📄 Histórico do Ticket: ${channelName}</h1>
            <p>Gerado automaticamente em: ${new Date().toLocaleString("pt-BR")}</p>
        </div>
        ${rows}
    </body>
    </html>`;
};

module.exports = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (
    ![BTN_OPEN, BTN_CLOSE, BTN_TRANSCRIPT, BTN_DELETE].includes(
      interaction.customId,
    )
  )
    return false;

  const { customId, guild, user } = interaction;

  // --- CARREGANDO VARIÁVEIS DO .ENV ---
  const PARENT_CHANNEL_ID = process.env.TICKET_PARENT_CHANNEL_ID;
  const TICKET_LOG_ID = process.env.TICKET_LOG_ID;
  const APPROVER_ROLE_ID = process.env.TICKET_APPROVER_ROLE_ID;

  const BANNER_URL = process.env.BANNER_TICKET || "";
  const COLOR_NEUTRAL = process.env.COLOR_NEUTRAL
    ? parseInt(process.env.COLOR_NEUTRAL.replace("#", ""), 16)
    : 0x2f3136;

  const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
  const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";
  const EMOJI_TICKET = process.env.EMOJI_TICKET || "🎫";
  const EMOJI_LOCK = process.env.EMOJI_LOCK || "🔒";
  const EMOJI_LOG = process.env.EMOJI_LOG || "📄";
  const EMOJI_TRASH = process.env.EMOJI_TRASH || "🗑️";

  // --- 1. ABRIR TICKET ---
  if (customId === BTN_OPEN) {
    console.log(`[TICKET] Tentativa de abrir por ${user.tag}`);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const parentChannel = guild.channels.cache.get(PARENT_CHANNEL_ID);

    if (!parentChannel) {
      return interaction.editReply(
        `${EMOJI_ERROR} Erro de Configuração: Canal de Suporte não encontrado (ID inválido no .env?).`,
      );
    }

    const threadName = `ticket-${user.username}`;
    const existingThread = parentChannel.threads.cache.find(
      (t) => t.name === threadName && !t.archived,
    );

    if (existingThread) {
      return interaction.editReply(
        `${EMOJI_ERROR} Você já tem um ticket aberto: <#${existingThread.id}>`,
      );
    }

    try {
      const thread = await parentChannel.threads.create({
        name: threadName,
        autoArchiveDuration: 60,
        type: ChannelType.PrivateThread,
        reason: `Ticket de ${user.tag}`,
      });

      await thread.members.add(user.id);

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI_TICKET} Atendimento Iniciado`)
        .setDescription(
          `Olá ${user}! Descreva seu problema.\nA moderação foi notificada.`,
        )
        .setColor(COLOR_NEUTRAL);

      if (BANNER_URL) embed.setImage(BANNER_URL);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BTN_CLOSE)
          .setLabel("Fechar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(EMOJI_LOCK),
        new ButtonBuilder()
          .setCustomId(BTN_TRANSCRIPT)
          .setLabel("Log (HTML)")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(EMOJI_LOG),
      );

      const mention = APPROVER_ROLE_ID ? `<@&${APPROVER_ROLE_ID}>` : "";
      await thread.send({
        content: `${user} ${mention}`,
        embeds: [embed],
        components: [row],
      });

      return interaction.editReply({
        content: `${EMOJI_SUCCESS} Ticket criado: <#${thread.id}>`,
      });
    } catch (e) {
      console.error("[TICKET ERROR]", e);
      return interaction.editReply(
        `${EMOJI_ERROR} Erro ao criar Tópico. Verifique permissões.`,
      );
    }
  }

  // --- 2. FECHAR TICKET (PEDE CONFIRMAÇÃO) ---
  if (customId === BTN_CLOSE) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_DELETE)
        .setLabel("Encerrar Atendimento")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(EMOJI_TRASH),
    );
    return interaction.reply({
      content: "Deseja encerrar e salvar o log?",
      components: [row],
    });
  }

  // --- 3. LOG MANUAL (HTML) ---
  if (customId === BTN_TRANSCRIPT) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = interaction.channel;

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const htmlContent = generateHtmlTranscript(messages, channel.name);
      const attachment = new AttachmentBuilder(
        Buffer.from(htmlContent, "utf-8"),
        { name: `transcript-${channel.name}.html` },
      );

      const logChannel = guild.channels.cache.get(TICKET_LOG_ID);

      if (logChannel) {
        await logChannel.send({
          content: `${EMOJI_LOG} Log (HTML) salvo: \`${channel.name}\``,
          files: [attachment],
        });
        return interaction.editReply(
          `${EMOJI_SUCCESS} Log HTML salvo no canal de logs.`,
        );
      }

      await interaction.user.send({
        content: "Seu transcript HTML:",
        files: [attachment],
      });
      return interaction.editReply(`${EMOJI_SUCCESS} Log enviado na DM.`);
    } catch (e) {
      console.error("[TICKET ERROR]", e);
      return interaction.editReply(`${EMOJI_ERROR} Erro ao gerar log.`);
    }
  }

  // --- 4. DELETAR (Automático com Log HTML) ---
  if (customId === BTN_DELETE) {
    const thread = interaction.channel;

    if (!thread.isThread()) {
      return interaction.reply({
        content: `${EMOJI_ERROR} Erro: Canal inválido.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply(
      `${EMOJI_TRASH} Gerando Transcript HTML e encerrando...`,
    );

    try {
      const messages = await thread.messages.fetch({ limit: 100 });
      const htmlContent = generateHtmlTranscript(messages, thread.name);
      const attachment = new AttachmentBuilder(
        Buffer.from(htmlContent, "utf-8"),
        { name: `transcript-${thread.name}.html` },
      );

      const logChannel = guild.channels.cache.get(TICKET_LOG_ID);

      if (logChannel) {
        await logChannel.send({
          content: `${EMOJI_LOG} **Ticket Encerrado:** \`${thread.name}\`\n👤 Fechado por: ${user}\n📂 *Baixe o arquivo e abra no navegador para ver o chat completo.*`,
          files: [attachment],
        });
      }
    } catch (error) {
      console.error("[TICKET ERROR] Falha ao gerar log no delete:", error);
    }

    setTimeout(() => {
      thread.delete().catch(() => {});
    }, 3000);

    return true;
  }

  return false;
};
