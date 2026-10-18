// config/streamerConfig.js
module.exports = {
  // Cargo oficial que identifica os streamers parceiros
  streamerRoleId: process.env.STREAMER_ROLE_ID || "1535758466294096033",

  // Canal onde os pings e anúncios de live são enviados
  notificationChannelId:
    process.env.STREAMER_NOTIFY_CHANNEL_ID || "1535759130298421258",

  // Categorias de voz monitoradas para contabilização de tempo em call
  monitoredVoiceCategoryIds: [
    "1535757868064837681",
    "1535753779314430043", // Categoria principal/lives
  ],

  // Metas semanais padrão para os streamers
  goals: {
    weeklyVoiceHours: 7, // Meta: 7 horas em call por semana
    weeklyInvites: 5, // Meta: 5 novos membros via convite exclusivo
  },

  // Configurações de verificação das APIs de transmissão
  apiCheckIntervalMs: 3 * 60 * 1000, // Checagem a cada 3 minutos
};
