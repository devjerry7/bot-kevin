const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const StandardLiveEvent = require("../models/StandardLiveEvent");

class TikTokProvider extends BaseProvider {
  constructor() {
    super("tiktok");
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

        // Validação rigorosa: O TikTok define roomStatus 2 ou status 2 estritamente quando há transmissão ativa real
        const isLiveActive =
          htmlContent.includes('"roomStatus":2') ||
          htmlContent.includes('"status":2') ||
          htmlContent.includes('"isLive":true');

        if (isLiveActive) {
          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "tiktok",
              platformLiveId: `tiktok_${username}_${Date.now()}`,
              username: streamer.platformUsername,
              displayName: streamer.platformUsername,
              isLive: true,
              title: `Transmissão ao vivo de @${username}`,
              category: "TikTok Live",
              url: `https://www.tiktok.com/@${username}/live`,
              thumbnail: null,
              viewerCount: 0,
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
