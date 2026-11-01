const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const StandardLiveEvent = require("../models/StandardLiveEvent");

class TikTokProvider extends BaseProvider {
  constructor() {
    super("tiktok");
  }

  normalizeText(text) {
    if (!text) return "";

    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  detectGame(text) {
    if (!text) return null;

    const lower = this.normalizeText(text);

    if (
      lower.includes("free fire") ||
      lower.includes("freefire") ||
      /\bff\b/.test(lower)
    ) {
      return "Free Fire";
    }

    if (lower.includes("valorant") || /\bval\b/.test(lower)) {
      return "Valorant";
    }

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

        // Requisição simulando um navegador mobile para forçar o TikTok a entregar o SSR completo
        const response = await axios.get(
          `https://www.tiktok.com/@${username}/live`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
              "Cache-Control": "no-cache",
            },
            timeout: 10000,
            maxRedirects: 5,
          },
        );

        const htmlContent = response.data;

        const isLiveActive =
          htmlContent.includes('"roomStatus":2') ||
          htmlContent.includes('"status":2') ||
          htmlContent.includes('"isLive":true') ||
          htmlContent.includes("live-room");

        if (isLiveActive) {
          let liveTitle = `Live de @${username}`;

          // Extração avançada varrendo blocos JSON embutidos (SIGI_STATE / Universal Data)
          let extractedRoomTitle = null;
          let extractedHashtag = null;
          let extractedSubTag = null;
          let viewers = 0;
          let roomId = username;

          // Tenta extrair o JSON do SIGI_STATE caso exista no HTML
          const sigiMatch = htmlContent.match(
            /<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/,
          );
          if (sigiMatch && sigiMatch[1]) {
            try {
              const sigiData = JSON.parse(sigiMatch[1]);
              // Procura pelas estruturas de sala dentro do SIGI_STATE
              const roomModule =
                sigiData.LiveModule || sigiData.RoomModule || {};
              const roomInfo =
                roomModule.roomInfo || roomModule.activeRoom || {};

              if (roomInfo.title) extractedRoomTitle = roomInfo.title;
              if (roomInfo.user_count)
                viewers = parseInt(roomInfo.user_count, 10);
              if (roomInfo.id) roomId = String(roomInfo.id);
              if (roomInfo.game_tag_name)
                extractedSubTag = roomInfo.game_tag_name;
              if (roomInfo.hashtag_name)
                extractedHashtag = roomInfo.hashtag_name;
            } catch (e) {
              // Se falhar o parse do SIGI_STATE, segue para o regex clássico
            }
          }

          // Fallback por Regex caso o SIGI_STATE venha em outro formato
          const ogTitleMatch = htmlContent.match(
            /<meta\s+property="og:title"\s+content="([^"]+)"/i,
          );
          const roomTitleMatch =
            htmlContent.match(/"room_title":"([^"]+)"/) ||
            htmlContent.match(/"title":"([^"]+)"/);
          const userCountMatch = htmlContent.match(/"user_count":(\d+)/);
          const tagMatch =
            htmlContent.match(/"hashtag_name":"([^"]+)"/) ||
            htmlContent.match(/"categoryName":"([^"]+)"/);
          const gameTagMatch =
            htmlContent.match(/"sub_tag_name":"([^"]+)"/) ||
            htmlContent.match(/"game_tag":"([^"]+)"/);
          const roomIdMatch =
            htmlContent.match(/"roomId":"(\d+)"/) ||
            htmlContent.match(/"room_id":"(\d+)"/);

          if (extractedRoomTitle) {
            liveTitle = this.cleanTitle(extractedRoomTitle, username);
          } else if (ogTitleMatch?.[1]) {
            liveTitle = this.cleanTitle(ogTitleMatch[1], username);
          } else if (roomTitleMatch?.[1]) {
            liveTitle = this.cleanTitle(roomTitleMatch[1], username);
          }

          if (viewers === 0 && userCountMatch?.[1]) {
            viewers = parseInt(userCountMatch[1], 10);
          }

          const hashtag = extractedHashtag || tagMatch?.[1] || null;
          const subTag = extractedSubTag || gameTagMatch?.[1] || null;

          if (roomIdMatch?.[1] && roomId === username) {
            roomId = roomIdMatch[1];
          }

          console.log(
            `[TikTok Debug] Verificando @${username} -> Título extraído: "${liveTitle}" | Hashtag extraída: "${hashtag}" | SubTag extraída: "${subTag}"`,
          );

          const detectedCategory = this.resolveCategory({
            subTag,
            hashtag,
            title: liveTitle,
            username,
          });

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
