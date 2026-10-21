const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const StandardLiveEvent = require("../models/StandardLiveEvent");

class TikTokProvider extends BaseProvider {
  constructor() {
    super("tiktok");
  }

  // Tenta inferir o jogo a partir do título caso a categoria venha vazia ou genérica
  detectGameFromTitle(title) {
    if (!title) return null;
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes("valorant") || lowerTitle.includes("val"))
      return "Valorant";
    if (lowerTitle.includes("free fire") || lowerTitle.includes("ff"))
      return "Free Fire";
    if (lowerTitle.includes("gta") || lowerTitle.includes("fivem"))
      return "GTA V / FiveM";
    if (
      lowerTitle.includes("cs2") ||
      lowerTitle.includes("counter-strike") ||
      lowerTitle.includes("cs:go")
    )
      return "Counter-Strike 2";
    if (lowerTitle.includes("roblox")) return "Roblox";
    if (lowerTitle.includes("minecraft") || lowerTitle.includes("mine"))
      return "Minecraft";
    if (lowerTitle.includes("league of legends") || lowerTitle.includes("lol"))
      return "League of Legends";
    if (lowerTitle.includes("fortnite")) return "Fortnite";
    if (lowerTitle.includes("clash royale")) return "Clash Royale";
    if (lowerTitle.includes("stumble guys")) return "Stumble Guys";
    if (lowerTitle.includes("standoff")) return "Standoff 2";
    if (lowerTitle.includes("blood strike")) return "Blood Strike";

    return null;
  }

  // Filtra títulos genéricos de propaganda/SEO do TikTok
  cleanTitle(extractedTitle, username) {
    if (!extractedTitle) return `Live de @${username}`;

    const lower = extractedTitle.toLowerCase();
    const isGenericTag =
      lower.includes("download tiktok") ||
      lower.includes("tiktok lite") ||
      lower.includes("make your day") ||
      lower.includes("assista em tempo real") ||
      lower.includes("tiktok.com");

    if (isGenericTag) {
      return `Live de @${username}`;
    }

    return extractedTitle;
  }

  async checkLives(streamersLista) {
    const tiktokStreamers = streamersLista.filter(
      (s) => s.platform.toLowerCase() === "tiktok",
    );
    if (tiktokStreamers.length === 0) return [];

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

        // Validação estrita de status de live no TikTok
        const isLiveActive =
          htmlContent.includes('"roomStatus":2') ||
          htmlContent.includes('"status":2') ||
          htmlContent.includes('"isLive":true');

        if (isLiveActive) {
          // Extração do Título da Live
          let liveTitle = `Live de @${username}`;

          // Tenta pegar primeiro o título real da sala (room title)
          const roomTitleMatch = htmlContent.match(/"room_title":"([^"]+)"/);
          const titleMatch = htmlContent.match(/"title":"([^"]+)"/);

          if (roomTitleMatch && roomTitleMatch[1]) {
            liveTitle = this.cleanTitle(roomTitleMatch[1], username);
          } else if (titleMatch && titleMatch[1]) {
            liveTitle = this.cleanTitle(titleMatch[1], username);
          }

          // Extração de Visualizadores
          let viewers = 0;
          const userCountMatch = htmlContent.match(/"user_count":(\d+)/);
          if (userCountMatch && userCountMatch[1]) {
            viewers = parseInt(userCountMatch[1], 10);
          }

          // Extração da Categoria / Tag do Jogo
          let detectedCategory = null;
          const tagMatch = htmlContent.match(/"hashtag_name":"([^"]+)"/);
          const gameTagMatch = htmlContent.match(/"sub_tag_name":"([^"]+)"/);

          if (gameTagMatch && gameTagMatch[1]) {
            detectedCategory = gameTagMatch[1];
          } else if (tagMatch && tagMatch[1]) {
            detectedCategory = tagMatch[1];
          }

          // Fallback: Se não achou na tag, tenta identificar o jogo direto pelo título
          if (
            !detectedCategory ||
            detectedCategory.toLowerCase().includes("tiktok")
          ) {
            const gameFromTitle = this.detectGameFromTitle(liveTitle);
            detectedCategory = gameFromTitle || "Games / Conversa";
          }

          // Identificador estático baseado na sala/username
          let roomId = username;
          const roomIdMatch = htmlContent.match(/"roomId":"(\d+)"/);
          if (roomIdMatch && roomIdMatch[1]) {
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
