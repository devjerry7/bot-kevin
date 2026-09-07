// config.js
require("dotenv").config();

const config = {
  // --- SEGREDOS REAIS (Ficam no .env no host) ---
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  prefix: process.env.PREFIX || "mc!",
  databaseUrl: process.env.DATABASE_URL,

  // --- IDENTIDADE VISUAL ---
  bannerUrl:
    "https://media.discordapp.net/attachments/1539757756272091177/1540170399369662484/14_de_ago._de_2026_18_19_38.png?ex=6a88faf6&is=6a87a976&hm=9e613c70cf8982eb821bb1d6d0e9afb08f48de6a1932c2d51f7a8403effa30d8&=&format=webp&quality=lossless&width=1536&height=615",
  colorBase: 0x962dc0, // Cor Roxa Atualizada
  // Cores extras que faltavam
  colorWarning: 0xffa500,
  colorSuccess: 0x00ff00,
  colorError: 0xff0000,

  // --- EMOJIS GERAIS ---
  emoji: {
    wait: "<:temporizadoremoji:1545445362255400960>",
    error: "<:emojierror:1545444524241719376>",
    success: "<:CheckV:1536498882450825287>",
    download: "<:dowloademoji:1545445834236231862>",
    bot: "<:1125476889763532840:1536498076418572318>",
    money: "<:Dinheiro:1535775870168469624>",
    shield: "<:escudoemoji:1545448007636615198>",
    diamond: "<:diamond:1536498079308579009>",
    panel: "🎛️",
    log: "<:logemoji:1545449214245478480>",
    lock: "<:trancadoemoji:1545453869792763974>",
    unlock: "<:abertoemoji:1545491070987534386>",
    question: "<:interrogaoemoji:1545468689405583370>",
    bomb: "<:bombaemoji:1545469098748547234>",
    boom: "<:boomemoji:1545469923311231017>",
    ticket: "<:W_Ticket:1446489399897358336>",
    trash: "<:lixeiraemoji:1545465798884327452>",
    panelGames: "<:jogos:1546273610971218000>",
    notifySorteio: "<:sorteios:1546265787776503888>",
    notifyInteracao: "<:interaes:1546265751730790411>",
    notifyLive: "<:transmisso:1546265901161255085>",
    notifyIcon: "<:notificao:1546265830457606285>",
    warning: "<:avisoemoji:1545494059081142403>", // Emoji de aviso que faltava
  },

  // --- EMOJIS DOS JOGOS (ATUALIZADOS) ---
  gameEmojis: {
    ff: "<:freefire:1542643584488964126>",
    val: "<:valorant:1542643586309300295>",
    cs: "<:csgo:1542345431021920336>",
    gta: "<:GTAV:1545831727736557648>",
    roblox: "<:robloxxa:1542345429562171452>",
    mine: "<:minecraft:1542345428413059132>",
    codenames: "<:codnames:1542351228045103124>",
    amongus: "<:amongs:1542345434779877446>",
    lol: "<:lol:1545833983508615261>",
    plato: "<:PLATO:1545831775471927367>",
    gartic: "<:Gartic:1545831819428241591>",
    bloodstrike: "<:bloodstrike:1545832296567804035>",
    clash: "<:clashroyal:1545831363318648874>",
    standoff: "<:standoff:1545831512572960921>",
    stumble: "<:stumbleguys:1545831580952559616>",
    fortnite: "<:Fortnite:1545831642021494895>",
  },

  // --- IDS DOS CARGOS DE JOGOS ---
  gameRoles: {
    ff: "1537238139725414460",
    val: "1537238427915784312",
    cs: "1540161210488590386",
    gta: "1540161300229914684",
    roblox: "1537238242770821170",
    mine: "1540161266138742844",
    codenames: "1540161171364126780",
    amongus: "1540161415652835338",
    lol: "1545471941643739186",
    plato: "1545473748130336829",
    gartic: "1545474000497541121",
    bloodstrike: "1545472289749995600",
    clash: "1545472708618354789",
    standoff: "1545472620844027904",
    stumble: "1545473008368492685",
    fortnite: "1545472181637488650",
  },

  // --- IDS DOS CARGOS DE NOTIFICAÇÃO ---
  notifyRoles: {
    interaction: "1546256823965974679",
    giveaway: "1546256710778359869",
    live: "1541782081917554779",
  },

  // --- SISTEMA DE VOZ ---
  voice: {
    joinToCreateId: "1545530073686347776",
    tempCategoryId: "1545529897714319360",
  },

  // --- ECONOMIA ---
  economy: {
    currencyName: "Kevins",
    dailyAmount: 500,
    workMin: 50,
    workMax: 200,
  },

  // 👇 BLOCOS NOVOS ADICIONADOS A PARTIR DAQUI 👇

  // --- SEGURANÇA E PUNIÇÕES ---
  security: {
    logId: "1535946213520711751",
    panelaLogId: "1545510700003106926",
    blacklistLogId: "1545510794589118495",
    jailRoleId: "1545516786072686623",
    antiSpam: {
      limit: 15,
      timeMs: 5000,
      timeoutMin: 10,
    },
    antiNuke: {
      timeMs: 10000,
      maxChannels: 5,
      maxRoles: 5,
      maxBans: 5,
      maxKicks: 5,
    },
  },

  // --- TICKETS ---
  tickets: {
    parentChannelId: "id_do_canal_de_tickets",
    logId: "id_do_canal_de_logs_dos_tickets",
    approverRoleId: "id_do_cargo_da_staff_dos_tickets",
  },

  // --- MÍDIAS EXTRAS ---
  media: {
    gifNuke:
      "https://i.pinimg.com/originals/20/ef/07/20ef07f361063277c58146322eb6880f.gif",
    gifPolice:
      "https://i.pinimg.com/originals/ea/0c/cd/ea0ccd11f06cba1bfe842f1c47e7242d.gif",
  },
};

// ==========================================
// 💡 INJEÇÃO MÁGICA DE COMPATIBILIDADE
// ==========================================
process.env.DISCORD_TOKEN = config.token;
process.env.CLIENT_ID = config.clientId;
process.env.GUILD_ID = config.guildId;
process.env.PREFIX = config.prefix;
process.env.DATABASE_URL = config.databaseUrl;

// Variáveis Globais
process.env.COLOR_BASE = `#${config.colorBase.toString(16)}`;
process.env.BANNER_URL = config.bannerUrl;

// Voz
process.env.JOIN_TO_CREATE_ID = config.voice.joinToCreateId;
process.env.TEMP_CATEGORY_ID = config.voice.tempCategoryId;

// Emojis Base
process.env.EMOJI_ERROR = config.emoji.error;
process.env.EMOJI_LOCK = config.emoji.lock;
process.env.EMOJI_UNLOCK = config.emoji.unlock;
process.env.EMOJI_RENAME = config.emoji.rename || "✏️";
process.env.EMOJI_PANEL_GAMES = config.emoji.panelGames;

// Emojis de Notificação
process.env.EMOJI_NOTIFY_SORTEIO = config.emoji.notifySorteio;
process.env.EMOJI_NOTIFY_INTERACAO = config.emoji.notifyInteracao;
process.env.EMOJI_NOTIFY_LIVE = config.emoji.notifyLive;
process.env.EMOJI_NOTIFY_ICON = config.emoji.notifyIcon;

// Emojis de Jogos (Atualizados)
process.env.EMOJI_GAME_FF = config.gameEmojis.ff;
process.env.EMOJI_GAME_VAL = config.gameEmojis.val;
process.env.EMOJI_GAME_CS = config.gameEmojis.cs;
process.env.EMOJI_GAME_GTA = config.gameEmojis.gta;
process.env.EMOJI_GAME_ROBLOX = config.gameEmojis.roblox;
process.env.EMOJI_GAME_MINE = config.gameEmojis.mine;
process.env.EMOJI_GAME_CODENAMES = config.gameEmojis.codenames;
process.env.EMOJI_GAME_AMONGUS = config.gameEmojis.amongus;
process.env.EMOJI_GAME_LOL = config.gameEmojis.lol;
process.env.EMOJI_GAME_PLATO = config.gameEmojis.plato;
process.env.EMOJI_GAME_GARTIC = config.gameEmojis.gartic;
process.env.EMOJI_GAME_BLOODSTRIKE = config.gameEmojis.bloodstrike;
process.env.EMOJI_GAME_CLASH = config.gameEmojis.clash;
process.env.EMOJI_GAME_STANDOFF = config.gameEmojis.standoff;
process.env.EMOJI_GAME_STUMBLE = config.gameEmojis.stumble;
process.env.EMOJI_GAME_FORTNITE = config.gameEmojis.fortnite;

// Roles (Cargos) de Jogos
process.env.ROLE_FF = config.gameRoles.ff;
process.env.ROLE_VAL = config.gameRoles.val;
process.env.ROLE_CS = config.gameRoles.cs;
process.env.ROLE_GTA = config.gameRoles.gta;
process.env.ROLE_ROBLOX = config.gameRoles.roblox;
process.env.ROLE_MINE = config.gameRoles.mine;
process.env.ROLE_CODENAMES = config.gameRoles.codenames;
process.env.ROLE_AMONGUS = config.gameRoles.amongus;
process.env.ROLE_LOL = config.gameRoles.lol;
process.env.ROLE_PLATO = config.gameRoles.plato;
process.env.ROLE_GARTIC = config.gameRoles.gartic;
process.env.ROLE_BLOODSTRIKE = config.gameRoles.bloodstrike;
process.env.ROLE_CLASH = config.gameRoles.clash;
process.env.ROLE_STANDOFF = config.gameRoles.standoff;
process.env.ROLE_STUMBLE = config.gameRoles.stumble;
process.env.ROLE_FORTNITE = config.gameRoles.fortnite;

// Roles (Cargos) de Notificação
process.env.ROLE_NOTIFY_INTERACTION = config.notifyRoles.interaction;
process.env.ROLE_NOTIFY_GIVEAWAY = config.notifyRoles.giveaway;
process.env.ROLE_NOTIFY_LIVE = config.notifyRoles.live;

// 👇 INJEÇÕES NOVAS ADICIONADAS A PARTIR DAQUI 👇

// Cores Extras
process.env.COLOR_WARNING = `#${config.colorWarning.toString(16)}`;
process.env.COLOR_SUCCESS = `#00ff00`; // Passado direto pra não dar erro de formatação
process.env.COLOR_ERROR = `#ff0000`; // Passado direto pra não dar erro de formatação

// Segurança e Logs
process.env.SECURITY_LOG_ID = config.security.logId;
process.env.PANELA_LOG_ID = config.security.panelaLogId;
process.env.BLACKLIST_LOG_ID = config.security.blacklistLogId;
process.env.JAIL_ROLE_ID = config.security.jailRoleId;

// Anti-Spam & Anti-Nuke Injeções
process.env.ANTI_SPAM_LIMIT = config.security.antiSpam.limit;
process.env.ANTI_SPAM_TIME_MS = config.security.antiSpam.timeMs;
process.env.ANTI_SPAM_TIMEOUT_MIN = config.security.antiSpam.timeoutMin;
process.env.ANTI_NUKE_TIME_MS = config.security.antiNuke.timeMs;
process.env.ANTI_NUKE_MAX_CHANNELS = config.security.antiNuke.maxChannels;
process.env.ANTI_NUKE_MAX_ROLES = config.security.antiNuke.maxRoles;
process.env.ANTI_NUKE_MAX_BANS = config.security.antiNuke.maxBans;
process.env.ANTI_NUKE_MAX_KICKS = config.security.antiNuke.maxKicks;

// Tickets e Mídias
process.env.TICKET_PARENT_CHANNEL_ID = config.tickets.parentChannelId;
process.env.TICKET_LOG_ID = config.tickets.logId;
process.env.TICKET_APPROVER_ROLE_ID = config.tickets.approverRoleId;
process.env.GIF_NUKE = config.media.gifNuke;
process.env.GIF_POLICE = config.media.gifPolice;
process.env.EMOJI_NUKE = config.emoji.boom;
process.env.EMOJI_WARNING = config.emoji.warning;

module.exports = config;
