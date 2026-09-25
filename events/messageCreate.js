// events/messageCreate.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("../config");
const path = require("path");
const fs = require("fs");

// --- IMPORTAÇÕES DOS SISTEMAS DE JOGO E ESTADO ---
const { getGameState } = require("../game/gameState");
const { calculateScores, postReviewEmbed } = require("../game/scoreSystem");
const { startRound } = require("../game/gameManager");
const { handlePDCommand } = require("../pdManager");

// --- IMPORTAÇÕES DE HANDLERS (SEGURANÇA) ---
const handleMention = require("../handlers/mentionHandler");
const handleAntiSpam = require("../handlers/antiSpamHandler");
const handleChatProtection = require("../handlers/chatProtectionHandler");

// --- IMPORTAÇÕES DOS COMANDOS (Módulos externos) ---
const { handleAvatar } = require("../commands/avatar");
const { handleRepeat } = require("../commands/repeat");
const { handleVipCommands } = require("../commands/vip");
const { handleProtection } = require("../commands/protection");
const { handleBan, handleUnban, handleKick } = require("../commands/modBasic");
const { handleNuke } = require("../commands/nuke");
const {
  handleMute,
  handleUnmute,
  handleJail,
  handleUnjail,
} = require("../commands/timeMod");
const helpCommand = require("../commands/help");
const {
  handleLockdown,
  handleUnlockdown,
  handleLockdownAll,
  handleUnlockdownAll,
} = require("../commands/lockdown");
const { handleBotInfo } = require("../commands/botinfo");
const { handleListMembers } = require("../commands/listMembers");
const { handleVoice } = require("../commands/voice");

// --- PAINÉIS VISUAIS E EMBEDS ---
const { handleGameRolesPanel } = require("../commands/gameRoles");
const { handleNotifyRolesPanel } = require("../commands/notifyRoles");
const { handleEconomy } = require("../commands/economy");
const { handleGambling } = require("../commands/gambling");
const { handleCrime } = require("../commands/crime");
const { handleTicketPanel } = require("../commands/ticketPanel");
const { handleMassRemove } = require("../commands/massRemove");
const { handlePostVip } = require("../commands/postarvip");

// --- IMPORTAÇÕES DOS COMANDOS FREE FIRE ---
const ffCampeaoCommand = require("../commands/ffcampeao");
const ffSairCommand = require("../commands/ffsair");

// --- IMPORTAÇÕES DA EQUIPE ---
const staffChatTracker = require("../listeners/staffChatTracker");
const { handleMeta, handlePausa } = require("../commands/staffUtils");

// Helper Visual Dinâmico
const createFeedbackEmbed = (title, description, color) => {
  const COLOR_ERROR = config.colorError || 0xff0000;
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || COLOR_ERROR)
    .setTimestamp();
};

// --- INÍCIO DO MÓDULO ---
module.exports = async (message) => {
  if (message.author.bot || !message.guild) return;

  // ====================================================
  // [NOVO] ESCUTAR COMPROVANTES NOS TÓPICOS PIX
  // ====================================================
  if (message.channel.name && message.channel.name.startsWith("pix-")) {
    if (message.attachments.size === 0) {
      return message.reply("⚠️ Envie a **FOTO/IMAGEM** do comprovante.");
    }

    const attachment = message.attachments.first();
    const parts = message.channel.name.split("-");
    const teamId = parts[1]; // Extrai o ID da equipe do nome do tópico

    if (
      attachment.contentType &&
      attachment.contentType.startsWith("image/") &&
      teamId
    ) {
      const staffChannel = message.client.channels.cache.get(
        "1553170817553006622",
      );

      if (staffChannel) {
        const embedStaff = new EmbedBuilder()
          .setTitle("<:serv:1545491203292663808> NOVO COMPROVANTE RECEBIDO")
          .setDescription(
            `**Enviado por:** ${message.author} (\`${message.author.id}\`)\n**Tópico:** <#${message.channel.id}>\n\nRevise a imagem abaixo.`,
          )
          .setColor(0x9b59b6)
          .setImage(attachment.url);

        const rowStaff = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`staff_approve_${teamId}`)
            .setLabel("APROVAR")
            .setEmoji("<a:verif:1535775598822301781>")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`staff_reject_${teamId}`)
            .setLabel("RECUSAR")
            .setEmoji("<:serv:1545444524241719376>")
            .setStyle(ButtonStyle.Secondary),
        );

        await staffChannel.send({
          embeds: [embedStaff],
          components: [rowStaff],
        });
        return message.reply(
          "<:serv:1545501461427785798> **Comprovante enviado para a equipe!** Aguarde a validação.",
        );
      }
    }
  }

  const PREFIX = config.prefix || "mc!";
  const EMOJI_ERROR = config.emoji?.error || "❌";
  const EMOJI_SUCCESS = config.emoji?.success || "✅";
  const EMOJI_STOP = config.emoji?.stop || "🛑";

  // ====================================================
  // 2. CAMADA DE SEGURANÇA
  // ====================================================
  if (await handleChatProtection(message)) return;
  if (await handleAntiSpam(message)) return;

  staffChatTracker(message).catch((err) =>
    console.error("[STAFF TRACKER ERROR]", err),
  );

  // ====================================================
  // 3. LÓGICA DE JOGO E MENÇÃO
  // ====================================================
  const state = getGameState(message.guild.id);
  const userId = message.author.id;

  if (
    message.mentions.has(message.client.user.id) &&
    !message.mentions.everyone
  ) {
    if (await handleMention(message)) return;
  }

  if (!message.content.startsWith(PREFIX)) {
    if (state.isActive) {
      const currentLetter = state.currentLetter;
      if (state.players[userId] && state.players[userId].isStopped) return;

      const content = message.content.trim().toUpperCase();
      if (content.startsWith(currentLetter) && content.includes(",")) {
        const rawAnswers = content.split(",");
        const cleanedAnswers = rawAnswers
          .map((ans) => ans.trim().toUpperCase())
          .filter((ans) => ans.length > 0);
        const categoriesCount = state.categories.length;

        if (cleanedAnswers.length === categoriesCount) {
          const hasInvalidLetter = cleanedAnswers.some(
            (ans) => !ans.startsWith(currentLetter),
          );
          if (hasInvalidLetter) {
            const COLOR_INFO = config.colorInfo || 0x00bfff;
            return message.channel
              .send({
                embeds: [
                  createFeedbackEmbed(
                    `${EMOJI_ERROR} Resposta Inválida`,
                    `Todas as respostas devem começar com a letra **${currentLetter}**!`,
                    COLOR_INFO,
                  ),
                ],
              })
              .then((m) => setTimeout(() => m.delete(), 5000));
          }
          state.players[userId] = {
            answers: cleanedAnswers,
            isStopped: true,
            score: 0,
          };
          await message.react(EMOJI_SUCCESS);
          if (message.deletable)
            try {
              await message.delete();
            } catch (e) {}
          return;
        }
      }
    }
    return;
  }

  // ====================================================
  // 4. PROCESSAMENTO DE COMANDOS
  // ====================================================
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const adminCommandPath = path.join(
    __dirname,
    "..",
    "commands",
    "admin",
    `${command}.js`,
  );

  if (fs.existsSync(adminCommandPath)) {
    if (message.deletable) {
      try {
        await message.delete();
      } catch (error) {
        if (error.code !== 10008) console.error("Erro delete:", error);
      }
    }
    try {
      const adminCommand = require(adminCommandPath);
      const safeMessage = Object.create(message, {
        reply: {
          value: (content) =>
            message.channel.send(
              typeof content === "string" ? { content } : content,
            ),
        },
      });
      await adminCommand.execute(safeMessage, args);
      return;
    } catch (error) {
      console.error(`[ERRO COMANDO ADMIN]`, error);
      return message.channel.send(
        `${EMOJI_ERROR} Ocorreu um erro ao executar este comando.`,
      );
    }
  }

  if (message.deletable) {
    try {
      await message.delete();
    } catch (error) {
      if (error.code !== 10008) console.error("Erro delete:", error);
    }
  }

  if (command === "ffcampeao") return ffCampeaoCommand.execute(message, args);
  if (command === "ffsair") return ffSairCommand.execute(message, args);

  if (["help", "ajuda", "comandos"].includes(command))
    return helpCommand.execute(message, args);
  if (["sistemas", "botinfo"].includes(command)) return handleBotInfo(message);

  if (command === "meta") return handleMeta(message);
  if (command === "pausa") return handlePausa(message);

  if (command === "postarvip") return handlePostVip(message);

  if (
    [
      "vip",
      "vipadm",
      "setvip",
      "addvip",
      "remvip",
      "addtime",
      "renovar",
    ].includes(command)
  )
    return handleVipCommands(message, command, args);

  if (["panela", "blacklist"].includes(command))
    return handleProtection(message, command, args);
  if (["pd", "setpd", "removepd"].includes(command))
    return handlePDCommand(message, command, args);

  if (command === "ban") return handleBan(message, args);
  if (command === "unban") return handleUnban(message, args);
  if (command === "kick") return handleKick(message, args);
  if (command === "nuke") return handleNuke(message);
  if (command === "mute") return handleMute(message, args);
  if (command === "unmute") return handleUnmute(message, args);
  if (command === "prender") return handleJail(message, args);
  if (command === "soltar") return handleUnjail(message, args);

  if (["lock", "trancar"].includes(command)) return handleLockdown(message);
  if (["lockall", "trancartudo"].includes(command))
    return handleLockdownAll(message);
  if (["unlock", "destrancar"].includes(command))
    return handleUnlockdown(message);
  if (["unlockall", "destrancartudo"].includes(command))
    return handleUnlockdownAll(message);

  if (["join", "entrar", "leave", "sair"].includes(command))
    return handleVoice(message, args, command);

  if (command === "av") return handleAvatar(message, args);
  if (command === "repeat") return handleRepeat(message, args);
  if (["membros", "listmembers", "list"].includes(command))
    return handleListMembers(message, args);
  if (["limparcargo", "tirarcargo", "massremove"].includes(command)) {
    return handleMassRemove(message, args);
  }

  if (["roles", "cargos", "jogos"].includes(command)) {
    return handleGameRolesPanel(message);
  }

  if (["notificacoes", "tags", "ping"].includes(command)) {
    return handleNotifyRolesPanel(message);
  }

  if (["ticket", "suporte", "atendimento"].includes(command)) {
    return handleTicketPanel(message);
  }

  if (
    [
      "atm",
      "saldo",
      "carteira",
      "daily",
      "work",
      "trabalhar",
      "pay",
      "pagar",
      "rank",
      "leaderboard",
      "top",
      "eco",
    ].includes(command)
  ) {
    return handleEconomy(message, command, args);
  }

  if (["slot", "slots", "mines"].includes(command)) {
    return handleGambling(message, command, args);
  }

  if (["loja", "comprar", "roubar", "rob"].includes(command)) {
    return handleCrime(message, command, args);
  }

  if (command === "stop") {
    if (state.isActive)
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            `${EMOJI_STOP} Jogo Ativo`,
            `Já existe um jogo ativo (Letra **${state.currentLetter}**).`,
          ),
        ],
      });
    await startRound(message, state, true);
    return;
  }
  if (command === "parar") {
    if (!state.isActive)
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            `${EMOJI_ERROR} Jogo Inativo`,
            `Não há jogo ativo.`,
          ),
        ],
      });
    clearTimeout(state.timer);
    state.isActive = false;
    await message.channel.send({
      embeds: [
        createFeedbackEmbed(
          `${EMOJI_SUCCESS} STOP!`,
          "Rodada encerrada manualmente.",
        ),
      ],
    });
    await postReviewEmbed(state, message.channel);
  }

  if (command === "resposta" || command === "respostas") {
    return message.channel
      .send({
        embeds: [
          createFeedbackEmbed(
            "Obsoleto",
            `Envie suas respostas direto no chat.`,
          ),
        ],
      })
      .then((m) => setTimeout(() => m.delete(), 5000));
  }
};
