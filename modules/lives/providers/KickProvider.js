const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const StandardLiveEvent = require("../models/StandardLiveEvent");

class KickProvider extends BaseProvider {
  constructor() {
    super("kick");
  }

  async checkLives(streamersLista) {
    const kickStreamers = streamersLista.filter(
      (s) => s.platform.toLowerCase() === "kick",
    );
    if (kickStreamers.length === 0) return [];

    const events = [];

    for (const streamer of kickStreamers) {
      try {
        // A Kick possui endpoints públicos de canais que retornam o status da live
        const response = await axios.get(
          `https://kick.com/api/v1/channels/${encodeURIComponent(streamer.platformUsername)}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "application/json",
            },
            timeout: 10000,
          },
        );

        const channelData = response.data;
        const livestream = channelData?.livestream;

        if (livestream && livestream.is_live) {
          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "kick",
              platformLiveId: String(livestream.id),
              username: streamer.platformUsername,
              displayName:
                channelData.user?.username || streamer.platformUsername,
              isLive: true,
              title:
                livestream.session_title || livestream.name || "Sem título",
              category: livestream.categories?.[0]?.name || "Diversos",
              url: `https://kick.com/${streamer.platformUsername}`,
              thumbnail:
                livestream.thumbnail?.url ||
                channelData.user?.profile_pic ||
                null,
              viewerCount: livestream.viewer_count || 0,
              startedAt: new Date(livestream.created_at || Date.now()),
            }),
          );
        } else {
          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "kick",
              platformLiveId: null,
              username: streamer.platformUsername,
              displayName: streamer.platformUsername,
              isLive: false,
            }),
          );
        }
      } catch (error) {
        // Se der 404, o canal não existe ou mudou de nome
        if (error.response?.status !== 404) {
          console.error(
            `[KickProvider] Erro ao checar streamer ${streamer.platformUsername}:`,
            error.message,
          );
        }

        events.push(
          new StandardLiveEvent({
            streamerId: streamer.streamerId,
            platform: "kick",
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

module.exports = KickProvider;
