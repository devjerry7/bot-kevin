const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const StandardLiveEvent = require("../models/StandardLiveEvent");

class TwitchProvider extends BaseProvider {
  constructor() {
    super("twitch");
    this.clientId = process.env.TWITCH_CLIENT_ID;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  // Pede um token de acesso temporário para a Twitch usando suas credenciais
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `https://id.twitch.tv/oauth2/token`,
        null,
        {
          params: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: "client_credentials",
          },
        },
      );

      this.accessToken = response.data.access_token;
      // Define a validade do token (geralmente expira em milissegundos, tiramos uma margem de segurança)
      this.tokenExpiresAt =
        Date.now() + response.data.expires_in * 1000 - 60000;
      return this.accessToken;
    } catch (error) {
      console.error(
        "[TwitchProvider] Erro ao gerar token de acesso:",
        error.response?.data || error.message,
      );
      return null;
    }
  }

  // Método principal que checa a lista de streamers
  async checkLives(streamersLista) {
    const token = await this.getAccessToken();
    if (!token) return [];

    // Filtra apenas os streamers que têm a plataforma "twitch" ativada
    const twitchStreamers = streamersLista.filter(
      (s) => s.platform.toLowerCase() === "twitch",
    );
    if (twitchStreamers.length === 0) return [];

    // Monta a query em lote (batch) com os usernames cadastrados no banco
    const userLogins = twitchStreamers
      .map((s) => `user_login=${encodeURIComponent(s.platformUsername)}`)
      .join("&");

    try {
      const response = await axios.get(
        `https://api.twitch.tv/helix/streams?${userLogins}`,
        {
          headers: {
            "Client-ID": this.clientId,
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const liveStreamsData = response.data.data; // Lista de quem está realmente ao vivo na Twitch agora
      const events = [];

      for (const streamer of twitchStreamers) {
        // Acha se o streamer atual está na resposta da Twitch
        const liveInfo = liveStreamsData.find(
          (stream) =>
            stream.user_login.toLowerCase() ===
            streamer.platformUsername.toLowerCase(),
        );

        if (liveInfo) {
          // Está AO VIVO
          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "twitch",
              platformLiveId: liveInfo.id,
              username: liveInfo.user_login,
              displayName: liveInfo.user_name,
              isLive: true,
              title: liveInfo.title,
              category: liveInfo.game_name || "Diversos",
              url: `https://twitch.tv/${liveInfo.user_login}`,
              // Formata a thumbnail para uma resolução limpa
              thumbnail: liveInfo.thumbnail_url
                .replace("{width}", "1280")
                .replace("{height}", "720"),
              viewerCount: liveInfo.viewer_count,
              startedAt: new Date(liveInfo.started_at),
            }),
          );
        } else {
          // Está OFFLINE
          events.push(
            new StandardLiveEvent({
              streamerId: streamer.streamerId,
              platform: "twitch",
              platformLiveId: null,
              username: streamer.platformUsername,
              displayName: streamer.platformUsername,
              isLive: false,
            }),
          );
        }
      }

      return events;
    } catch (error) {
      console.error(
        "[TwitchProvider] Erro ao buscar status das lives:",
        error.response?.data || error.message,
      );
      return [];
    }
  }
}

module.exports = TwitchProvider;
