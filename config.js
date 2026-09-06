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
    panelGames: "<:emoji_14:1540175395993690173>",
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

module.exports = config;
