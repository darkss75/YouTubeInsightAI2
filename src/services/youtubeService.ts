export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string; // ISO 8601
  isShorts: boolean;
  regionCode?: string;
}

export interface ChannelStats {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  popularityScore: number;
  videos: YouTubeVideo[];
  publishedAt: string;
}

export const youtubeService = {
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${apiKey}`
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  async searchChannel(apiKey: string, query: string): Promise<any[]> {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
        query
      )}&maxResults=5&key=${apiKey}`
    );
    const data = await response.json();
    return data.items || [];
  },

  async getChannelDetails(apiKey: string, channelId: string): Promise<ChannelStats> {
    // 1. Get channel stats
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
    );
    const channelData = await channelResponse.json();
    const channel = channelData.items[0];

    // 2. Get recent videos (max 50)
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${apiKey}`
    );
    const videosData = await videosResponse.json();
    const videoIds = videosData.items.map((item: any) => item.id.videoId).join(',');

    // 3. Get detailed video stats (views, likes, comments, duration, snippet for description)
    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );
    const videoDetailsData = await videoDetailsResponse.json();

    const videos: YouTubeVideo[] = videoDetailsData.items.map((item: any) => {
      const duration = item.contentDetails.duration;
      const isShorts = this.parseDurationToSeconds(duration) < 180; // 3 minutes
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.medium.url,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        commentCount: parseInt(item.statistics.commentCount || '0'),
        duration,
        isShorts,
        regionCode: item.snippet.defaultAudioLanguage || 'ko'
      };
    });

    // Sort videos by view count as requested
    const sortedVideos = [...videos].sort((a, b) => b.viewCount - a.viewCount);

    // Calculate popularity score (simple formula: views + likes*5 + comments*10) / videoCount
    const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0);
    const popularityScore = videos.length > 0 
      ? (totalViews + totalLikes * 5 + totalComments * 10) / videos.length 
      : 0;

    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.medium.url,
      subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics.videoCount || '0'),
      viewCount: parseInt(channel.statistics.viewCount || '0'),
      popularityScore,
      videos: sortedVideos,
      publishedAt: channel.snippet.publishedAt
    };
  },

  async searchByHashtag(apiKey: string, hashtag: string): Promise<YouTubeVideo[]> {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        hashtag
      )}&type=video&maxResults=50&key=${apiKey}`
    );
    const data = await response.json();
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');

    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );
    const videoDetailsData = await videoDetailsResponse.json();

    const videos = videoDetailsData.items.map((item: any) => {
      const duration = item.contentDetails.duration;
      const isShorts = this.parseDurationToSeconds(duration) < 180;
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.medium.url,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        commentCount: parseInt(item.statistics.commentCount || '0'),
        duration,
        isShorts,
        regionCode: item.snippet.defaultAudioLanguage || 'ko'
      };
    });

    return [...videos].sort((a, b) => b.viewCount - a.viewCount);
  },

  parseDurationToSeconds(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  }
};
