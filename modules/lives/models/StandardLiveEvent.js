class StandardLiveEvent {
  constructor({
    streamerId,
    platform,
    platformLiveId,
    username,
    displayName,
    isLive,
    title = "Sem título",
    category = "Geral",
    url,
    thumbnail,
    viewerCount = 0,
    startedAt = new Date(),
  }) {
    this.streamerId = streamerId;
    this.platform = platform;
    this.platformLiveId = platformLiveId;
    this.username = username;
    this.displayName = displayName;
    this.isLive = isLive;
    this.title = title;
    this.category = category;
    this.url = url;
    this.thumbnail = thumbnail;
    this.viewerCount = viewerCount;
    this.startedAt = startedAt;
  }
}

module.exports = StandardLiveEvent;
