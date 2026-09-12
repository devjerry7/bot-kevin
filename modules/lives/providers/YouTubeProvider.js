const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const StandardLiveEvent = require("../models/StandardLiveEvent");

class YouTubeProvider extends BaseProvider {
  constructor() {
    super("youtube");
    this.apiKey = process.env.YOUTUBE_API_KEY;
  }

  async checkLives(streamersLista) {
    if (!this.apiKey) return [];

    // Filtra apenas os streamers do YouTube
    const youtubeStreamers = streamersLista.filter(
      (s) => s.platform.toLowerCase() === "youtube",
    );
    if (youtubeStreamers.length === 0) return [];

    const events = [];

    // O YouTube busca por ID de canal ou Handle. Vamos iterar de forma otimizada.
    for (const streamer of youtubeStreamers) {
      try {
        // Passo 1: Descobrir o ID do canal se o usuário cadastrou um nome/handle (@canal)
        let channelId = streamer.platformUserId;

        if (!channelId || !channelId.startsWith("UC")) {
          const searchResponse = await axios.get(
            `https://www.googleapis.com/youtube/v3/channels`,
            {
              params: {
                part: "id",
                forHandle: streamer.platformUsername.replace("@", ""),
                key: this.apiKey,
              },
            },
          );

          if (
            searchResponse.data.items &&
            searchResponse.data.items.length > 0
          ) {
            channelId = searchResponse.data.items[0].id;
          } else {
            continue; // Canal não encontrado
          }
        }

        // Passo 2: Checar se existe transmissão ao vivo ativa para este canal
        const liveSearchResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/search`,
          {
            params: {
              part: "snippet",
              channelId: channelId,
              eventType: "live",
              type: "video",
              key: this.apiKey,
            },
          },
        );

        const items = liveSearchResponse.data.items;

        if (items && items.length > 0) {
          const liveData = items[0];
          const videoId = liveData.id.videoId;

          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "youtube",
              platformLiveId: videoId,
              username: streamer.platformUsername,
              displayName: liveData.snippet.channelTitle,
              isLive: true,
              title: liveData.snippet.title,
              category: "YouTube Live",
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail:
                liveData.snippet.thumbnails.high?.url ||
                liveData.snippet.thumbnails.default?.url,
              viewerCount: 0, // A API de search do YouTube não retorna viewers em tempo real, colocamos 0 por segurança
              startedAt: new Date(liveData.snippet.publishedAt),
            }),
          );
        } else {
          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "youtube",
              platformLiveId: null,
              username: streamer.platformUsername,
              displayName: streamer.platformUsername,
              isLive: false,
            }),
          );
        }
      } catch (error) {
        console.error(
          `[YouTubeProvider] Erro ao checar streamer ${streamer.platformUsername}:`,
          error.response?.data || error.message,
        );
      }
    }

    return events;
  }
}

module.exports = YouTubeProvider;
