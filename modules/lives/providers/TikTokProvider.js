const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const StandardLiveEvent = require("../models/StandardLiveEvent");

class TikTokProvider extends BaseProvider {
  constructor() {
    super("tiktok");
  }

  /**
   * Normaliza texto para facilitar comparação (remove acentos, emojis e espaços extras).
   */
  normalizeText(text) {
    if (!text) return "";

    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Tenta identificar um jogo através de qualquer texto:
   * título, hashtag, subtag etc.
   */
  detectGame(text) {
    if (!text) return null;

    const lower = this.normalizeText(text);

    // Free Fire
    if (
      lower.includes("free fire") ||
      lower.includes("freefire") ||
      /\bff\b/.test(lower)
    ) {
      return "Free Fire";
    }

    // Valorant
    if (lower.includes("valorant") || /\bval\b/.test(lower)) {
      return "Valorant";
    }

    // GTA / FiveM
    if (
      lower.includes("gta v") ||
      lower.includes("gta 5") ||
      lower.includes("gta5") ||
      /\bgta\b/.test(lower) ||
      lower.includes("fivem") ||
      lower.includes("five m")
    ) {
      return "GTA V / FiveM";
    }

    // Counter-Strike
    if (
      lower.includes("counter-strike") ||
      lower.includes("counter strike") ||
      lower.includes("cs2") ||
      lower.includes("cs:go") ||
      lower.includes("csgo")
    ) {
      return "Counter-Strike 2";
    }

    if (lower.includes("roblox")) {
      return "Roblox";
    }

    if (lower.includes("minecraft") || /\bmine\b/.test(lower)) {
      return "Minecraft";
    }

    if (lower.includes("league of legends") || /\blol\b/.test(lower)) {
      return "League of Legends";
    }

    if (lower.includes("fortnite")) {
      return "Fortnite";
    }

    if (lower.includes("among us")) {
      return "Among Us";
    }

    if (lower.includes("clash royale")) {
      return "Clash Royale";
    }

    if (lower.includes("stumble guys")) {
      return "Stumble Guys";
    }

    if (lower.includes("standoff 2") || lower.includes("standoff")) {
      return "Standoff 2";
    }

    if (lower.includes("gartic")) {
      return "Gartic";
    }

    if (lower.includes("blood strike") || lower.includes("bloodstrike")) {
      return "Blood Strike";
    }

    return null;
  }

  detectGameFromTitle(title) {
    return this.detectGame(title);
  }

  /**
   * Verifica se a categoria retornada pelo TikTok é genérica.
   */
  isGenericCategory(category) {
    if (!category) return true;

    const lower = this.normalizeText(category);

    const genericCategories = [
      "games",
      "game",
      "gaming",
      "jogos",
      "jogo",
      "conversa",
      "games / conversa",
      "games/conversa",
      "jogos / conversa",
      "jogos/conversa",
      "chat",
      "just chatting",
      "live",
      "tiktok live",
      "tiktok",
      "entertainment",
      "entretenimento",
    ];

    return genericCategories.some(
      (generic) =>
        lower === generic ||
        lower.includes("tiktok") ||
        lower.includes("games/conversa") ||
        lower.includes("games / conversa"),
    );
  }

  /**
   * Remove títulos genéricos de propaganda/SEO do TikTok.
   */
  cleanTitle(extractedTitle, username) {
    if (!extractedTitle) {
      return `Live de @${username}`;
    }

    let title = extractedTitle;

    try {
      title = JSON.parse(`"${extractedTitle.replace(/"/g, '\\"')}"`);
    } catch {
      title = extractedTitle;
    }

    const lower = this.normalizeText(title);

    const isGenericTag =
      lower.includes("download tiktok") ||
      lower.includes("tiktok lite") ||
      lower.includes("make your day") ||
      lower.includes("assista em tempo real") ||
      lower.includes("tiktok.com");

    if (isGenericTag) {
      return `Live de @${username}`;
    }

    return title.trim();
  }

  /**
   * Decide qual categoria será enviada ao Discord.
   */
  resolveCategory({ subTag, hashtag, title, username }) {
    console.log(
      `[TikTok Debug] Resolvendo categoria para @${username} | SubTag: "${subTag}" | Hashtag: "${hashtag}" | Título: "${title}"`,
    );

    const gameFromSubTag = this.detectGame(subTag);
    if (gameFromSubTag) {
      console.log(
        `[TikTok Debug] Jogo detectado pela SubTag: ${gameFromSubTag}`,
      );
      return gameFromSubTag;
    }

    const gameFromHashtag = this.detectGame(hashtag);
    if (gameFromHashtag) {
      console.log(
        `[TikTok Debug] Jogo detectado pela Hashtag: ${gameFromHashtag}`,
      );
      return gameFromHashtag;
    }

    const gameFromTitle = this.detectGame(title);
    if (gameFromTitle) {
      console.log(
        `[TikTok Debug] Jogo detectado pelo Título: ${gameFromTitle}`,
      );
      return gameFromTitle;
    }

    if (subTag && !this.isGenericCategory(subTag)) {
      console.log(`[TikTok Debug] Usando SubTag não genérica: ${subTag}`);
      return subTag;
    }

    if (hashtag && !this.isGenericCategory(hashtag)) {
      console.log(`[TikTok Debug] Usando Hashtag não genérica: ${hashtag}`);
      return hashtag;
    }

    console.log(
      `[TikTok Debug] Nenhuma tag ou jogo identificado. Caindo para fallback: Games / Conversa`,
    );
    return "Games / Conversa";
  }

  async checkLives(streamersLista) {
    const tiktokStreamers = streamersLista.filter(
      (s) => s.platform.toLowerCase() === "tiktok",
    );

    if (tiktokStreamers.length === 0) {
      return [];
    }

    const events = [];

    for (const streamer of tiktokStreamers) {
      try {
        const username = streamer.platformUsername.replace("@", "");

        const response = await axios.get(
          `https://www.tiktok.com/@${username}/live`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            },
            timeout: 10000,
            maxRedirects: 5,
          },
        );

        const htmlContent = response.data;

        const isLiveActive =
          htmlContent.includes('"roomStatus":2') ||
          htmlContent.includes('"status":2') ||
          htmlContent.includes('"isLive":true');

        if (isLiveActive) {
          let liveTitle = `Live de @${username}`;

          // Extração via Meta Tags OpenGraph (og:title, og:description) + Fallbacks de JSON
          const ogTitleMatch = htmlContent.match(
            /<meta\s+property="og:title"\s+content="([^"]+)"/i,
          );
          const metaDescMatch = htmlContent.match(
            /<meta\s+name="description"\s+content="([^"]+)"/i,
          );
          const roomTitleMatch = htmlContent.match(/"room_title":"([^"]+)"/);
          const titleMatch = htmlContent.match(/"title":"([^"]+)"/);

          if (ogTitleMatch?.[1]) {
            liveTitle = this.cleanTitle(ogTitleMatch[1], username);
          } else if (roomTitleMatch?.[1]) {
            liveTitle = this.cleanTitle(roomTitleMatch[1], username);
          } else if (titleMatch?.[1]) {
            liveTitle = this.cleanTitle(titleMatch[1], username);
          } else if (metaDescMatch?.[1]) {
            liveTitle = this.cleanTitle(metaDescMatch[1], username);
          }

          let viewers = 0;
          const userCountMatch = htmlContent.match(/"user_count":(\d+)/);

          if (userCountMatch?.[1]) {
            viewers = parseInt(userCountMatch[1], 10);
          }

          // Busca em chaves modernas do TikTok Web
          const tagMatch =
            htmlContent.match(/"hashtag_name":"([^"]+)"/) ||
            htmlContent.match(/"categoryName":"([^"]+)"/);

          const gameTagMatch =
            htmlContent.match(/"sub_tag_name":"([^"]+)"/) ||
            htmlContent.match(/"game_tag":"([^"]+)"/);

          const hashtag = tagMatch?.[1] || null;
          const subTag = gameTagMatch?.[1] || null;

          console.log(
            `[TikTok Debug] Verificando @${username} -> Título extraído: "${liveTitle}" | Hashtag extraída: "${hashtag}" | SubTag extraída: "${subTag}"`,
          );

          const detectedCategory = this.resolveCategory({
            subTag,
            hashtag,
            title: liveTitle,
            username,
          });

          let roomId = username;
          const roomIdMatch = htmlContent.match(/"roomId":"(\d+)"/);

          if (roomIdMatch?.[1]) {
            roomId = roomIdMatch[1];
          }

          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "tiktok",
              platformLiveId: `tiktok_${username}_${roomId}`,
              username: streamer.platformUsername,
              displayName: streamer.platformUsername,
              isLive: true,
              title: liveTitle,
              category: detectedCategory,
              url: `https://www.tiktok.com/@${username}/live`,
              thumbnail: null,
              viewerCount: viewers,
              startedAt: new Date(),
            }),
          );
        } else {
          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "tiktok",
              platformLiveId: null,
              username: streamer.platformUsername,
              displayName: streamer.platformUsername,
              isLive: false,
            }),
          );
        }
      } catch (error) {
        console.error(
          `[TikTokProvider] Erro ao verificar @${streamer.platformUsername}:`,
          error.message,
        );

        events.push(
          new StandardLiveEvent({
            streamerId: streamer.streamerId,
            platform: "tiktok",
            platformLiveId: null,
            username: streamer.platformUsername,
            displayName: streamer.platformUsername,
            isLive: false,
          }),
        );
      }
    }

    return events;
  }
}

module.exports = TikTokProvider;
