import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Youtube, 
  BarChart3, 
  TrendingUp, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Globe,
  Smartphone,
  Video,
  ChevronRight,
  Loader2,
  Sparkles,
  Download,
  FileJson,
  FileSpreadsheet,
  Clock,
  MessageSquare,
  ThumbsUp,
  Eye,
  Calendar,
  LayoutDashboard,
  Hash
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cryptoService } from './services/cryptoService';
import { youtubeService, ChannelStats, YouTubeVideo } from './services/youtubeService';
import { generateStrategy, summarizeVideo } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ChartTab = 'popularity' | 'views' | 'likes' | 'comments' | 'timeline' | 'format';

export default function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeyValid, setIsKeyValid] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [channelData, setChannelData] = useState<ChannelStats | null>(null);
  const [hashtagVideos, setHashtagVideos] = useState<YouTubeVideo[]>([]);
  const [strategy, setStrategy] = useState<string>('');
  const [strategyLoading, setStrategyLoading] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('popularity');
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState<Record<string, boolean>>({});
  
  // Filters
  const [filterRegion, setFilterRegion] = useState<'all' | 'kr' | 'other'>('all');
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'shorts'>('all');

  useEffect(() => {
    const savedKey = cryptoService.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      validateKey(savedKey);
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const validateKey = async (key: string) => {
    const valid = await youtubeService.testConnection(key);
    setIsKeyValid(valid);
    return valid;
  };

  const handleSaveKey = async (key: string) => {
    setLoading(true);
    const valid = await validateKey(key);
    if (valid) {
      cryptoService.saveApiKey(key);
      setApiKey(key);
      setShowKeyModal(false);
    } else {
      alert('유효하지 않은 API 키입니다. 다시 확인해주세요.');
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setStrategy('');
    setSummaries({});
    try {
      if (searchQuery.startsWith('#')) {
        const videos = await youtubeService.searchByHashtag(apiKey, searchQuery);
        setHashtagVideos(videos);
        setChannelData(null);
      } else {
        const channels = await youtubeService.searchChannel(apiKey, searchQuery);
        if (channels.length > 0) {
          const details = await youtubeService.getChannelDetails(apiKey, channels[0].id.channelId);
          setChannelData(details);
          setHashtagVideos([]);
        }
      }
    } catch (error) {
      console.error(error);
      alert('검색 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  const handleGenerateStrategy = async () => {
    if (!channelData && hashtagVideos.length === 0) return;
    setStrategyLoading(true);
    try {
      const dataToAnalyze = channelData || { videos: hashtagVideos };
      const result = await generateStrategy(dataToAnalyze);
      setStrategy(result || '');
    } catch (error) {
      console.error(error);
      alert('전략 생성 중 오류가 발생했습니다.');
    }
    setStrategyLoading(false);
  };

  const handleSummarize = async (video: YouTubeVideo) => {
    if (summaries[video.id]) return;
    setSummaryLoading(prev => ({ ...prev, [video.id]: true }));
    try {
      const summary = await summarizeVideo(video.title, video.description);
      setSummaries(prev => ({ ...prev, [video.id]: summary || '요약을 생성할 수 없습니다.' }));
    } catch (error) {
      console.error(error);
    }
    setSummaryLoading(prev => ({ ...prev, [video.id]: false }));
  };

  const filteredVideos = useMemo(() => {
    const videos = channelData ? channelData.videos : hashtagVideos;
    return videos.filter(v => {
      const regionMatch = filterRegion === 'all' || 
        (filterRegion === 'kr' && v.regionCode === 'ko') || 
        (filterRegion === 'other' && v.regionCode !== 'ko');
      
      const typeMatch = filterType === 'all' || 
        (filterType === 'shorts' && v.isShorts) || 
        (filterType === 'regular' && !v.isShorts);
      
      return regionMatch && typeMatch;
    });
  }, [channelData, hashtagVideos, filterRegion, filterType]);

  const exportToJson = () => {
    const data = filteredVideos;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube_analysis_${new Date().getTime()}.json`;
    a.click();
  };

  const exportToCsv = () => {
    const headers = ['Title', 'ID', 'Views', 'Likes', 'Comments', 'PublishedAt', 'Type'];
    const rows = filteredVideos.map(v => [
      `"${v.title.replace(/"/g, '""')}"`,
      v.id,
      v.viewCount,
      v.likeCount,
      v.commentCount,
      v.publishedAt,
      v.isShorts ? 'Shorts' : 'Regular'
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube_analysis_${new Date().getTime()}.csv`;
    a.click();
  };

  const chartData = useMemo(() => {
    const top10 = filteredVideos.slice(0, 10);
    
    if (activeChartTab === 'timeline') {
      return [...filteredVideos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()).map(v => ({
        date: new Date(v.publishedAt).toLocaleDateString(),
        views: v.viewCount,
        title: v.title
      }));
    }

    if (activeChartTab === 'format') {
      const shorts = filteredVideos.filter(v => v.isShorts).length;
      const regular = filteredVideos.length - shorts;
      return [
        { name: '쇼츠', value: shorts },
        { name: '일반', value: regular }
      ];
    }

    return top10.map(v => ({
      name: v.title.length > 15 ? v.title.substring(0, 15) + '...' : v.title,
      views: v.viewCount,
      likes: v.likeCount,
      comments: v.commentCount,
      popularity: Math.round((v.viewCount + v.likeCount * 5 + v.commentCount * 10) / 100)
    }));
  }, [filteredVideos, activeChartTab]);

  const COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#E2E8F0] font-sans">
      {/* Header */}
      <header className="bg-[#151921] border-b border-[#2D3748] sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-900/20">
              <Youtube size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">YouTube Insight AI</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Strategy Consultant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowKeyModal(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                isKeyValid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", isKeyValid ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
              {isKeyValid ? "API CONNECTED" : "API DISCONNECTED"}
              <Settings size={14} className="ml-1 opacity-60" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <section className="mb-12">
          <div className="max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="text-gray-500 group-focus-within:text-red-500 transition-colors" size={22} />
              </div>
              <input 
                type="text" 
                placeholder="채널 이름 입력 또는 #해시태그 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full h-16 pl-14 pr-40 bg-[#1A1F26] rounded-2xl border border-[#2D3748] focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none text-lg text-white placeholder-gray-600 shadow-2xl"
              />
              <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-8 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-900/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "분석 시작"}
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-6">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <LayoutDashboard size={14} /> 채널 정밀 분석
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Hash size={14} /> 키워드 트렌드
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Sparkles size={14} /> AI 전략 수립
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {(channelData || hashtagVideos.length > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Channel Summary Header */}
              {channelData && (
                <div className="bg-[#151921] rounded-[32px] p-8 border border-[#2D3748] shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                  <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                    <img src={channelData.thumbnail} alt={channelData.title} className="w-32 h-32 rounded-3xl border-4 border-[#2D3748] shadow-2xl" />
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-white">{channelData.title}</h2>
                        <span className="text-xs font-bold px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 self-center md:self-auto">채널 분석 결과</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-6 max-w-2xl line-clamp-2">{channelData.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#1A1F26] p-4 rounded-2xl border border-[#2D3748]">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">구독자 수</p>
                          <p className="text-xl font-bold text-white">{(channelData.subscriberCount / 10000).toFixed(1)}<span className="text-xs ml-1 text-gray-500">만</span></p>
                        </div>
                        <div className="bg-[#1A1F26] p-4 rounded-2xl border border-[#2D3748]">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">총 조회수</p>
                          <p className="text-xl font-bold text-white">{(channelData.viewCount / 10000).toFixed(1)}<span className="text-xs ml-1 text-gray-500">만</span></p>
                        </div>
                        <div className="bg-[#1A1F26] p-4 rounded-2xl border border-[#2D3748]">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">총 영상 수</p>
                          <p className="text-xl font-bold text-white">{channelData.videoCount}<span className="text-xs ml-1 text-gray-500">개</span></p>
                        </div>
                        <div className="bg-[#1A1F26] p-4 rounded-2xl border border-[#2D3748]">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">채널 개설일</p>
                          <p className="text-sm font-bold text-white">{new Date(channelData.publishedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Dashboard */}
              <div className="bg-[#151921] rounded-[32px] border border-[#2D3748] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-[#2D3748] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex bg-[#1A1F26] p-1 rounded-xl border border-[#2D3748]">
                    {[
                      { id: 'popularity', label: '인기 점수', icon: TrendingUp },
                      { id: 'views', label: '조회수', icon: Eye },
                      { id: 'likes', label: '좋아요', icon: ThumbsUp },
                      { id: 'comments', label: '댓글', icon: MessageSquare },
                      { id: 'timeline', label: '타임라인', icon: Clock },
                      { id: 'format', label: '콘텐츠 포맷', icon: Video },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveChartTab(tab.id as ChartTab)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          activeChartTab === tab.id ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setFilterType(filterType === 'shorts' ? 'all' : 'shorts')}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold border transition-all", filterType === 'shorts' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-[#1A1F26] text-gray-500 border-[#2D3748]")}
                    >쇼츠만</button>
                    <button 
                      onClick={() => setFilterRegion(filterRegion === 'kr' ? 'all' : 'kr')}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold border transition-all", filterRegion === 'kr' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-[#1A1F26] text-gray-500 border-[#2D3748]")}
                    >한국어</button>
                  </div>
                </div>

                <div className="p-8">
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {activeChartTab === 'format' ? (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1A1F26', border: 'none', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      ) : activeChartTab === 'timeline' ? (
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2D3748" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#718096' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#718096' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1A1F26', border: 'none', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="views" stroke="#EF4444" fillOpacity={1} fill="url(#colorViews)" />
                        </AreaChart>
                      ) : (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2D3748" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#718096' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#718096' }} />
                          <Tooltip 
                            cursor={{ fill: '#1A1F26' }}
                            contentStyle={{ backgroundColor: '#1A1F26', border: 'none', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar 
                            dataKey={activeChartTab === 'popularity' ? 'popularity' : activeChartTab} 
                            fill="#EF4444" 
                            radius={[6, 6, 0, 0]} 
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-3">
                  <button 
                    onClick={handleGenerateStrategy}
                    disabled={strategyLoading}
                    className="px-6 py-3 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 shadow-xl"
                  >
                    {strategyLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    AI 채널 진단 및 전략 수립
                  </button>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={exportToJson}
                    className="px-4 py-3 bg-[#1A1F26] text-gray-300 rounded-2xl font-bold border border-[#2D3748] hover:bg-[#2D3748] transition-all flex items-center gap-2"
                  >
                    <FileJson size={18} className="text-blue-400" />
                    JSON 내보내기
                  </button>
                  <button 
                    onClick={exportToCsv}
                    className="px-4 py-3 bg-[#1A1F26] text-gray-300 rounded-2xl font-bold border border-[#2D3748] hover:bg-[#2D3748] transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={18} className="text-emerald-400" />
                    CSV 내보내기
                  </button>
                </div>
              </div>

              {/* Video List Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Video className="text-red-500" />
                    조회수 상위 영상 (최대 50개)
                  </h3>
                  <span className="text-xs text-gray-500 font-bold">{filteredVideos.length}개의 영상 분석됨</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredVideos.slice(0, 50).map((video, index) => (
                    <motion.div 
                      key={video.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-[#151921] rounded-3xl border border-[#2D3748] overflow-hidden group hover:border-red-500/30 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 p-5">
                        <div className="relative flex-shrink-0 w-full sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-xl">
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                            #{index + 1}
                          </div>
                          {video.isShorts && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg shadow-lg">
                              <Smartphone size={14} />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">{video.title}</h4>
                            <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1"><Eye size={12} /> {video.viewCount.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><ThumbsUp size={12} /> {video.likeCount.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(video.publishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="mt-4">
                            <button 
                              onClick={() => handleSummarize(video)}
                              disabled={summaryLoading[video.id]}
                              className={cn(
                                "w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2",
                                summaries[video.id] 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20"
                              )}
                            >
                              {summaryLoading[video.id] ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                              {summaries[video.id] ? "요약 완료" : "AI 영상 요약하기"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {summaries[video.id] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="px-5 pb-5 pt-0"
                          >
                            <div className="bg-[#1A1F26] p-4 rounded-2xl border border-[#2D3748] text-xs text-gray-400 leading-relaxed italic">
                              <div className="flex items-start gap-2">
                                <Sparkles size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <p>{summaries[video.id]}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Strategy Section */}
              <AnimatePresence>
                {strategy && (
                  <motion.section 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#151921] rounded-[32px] p-10 shadow-2xl border border-red-500/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
                        <Sparkles size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">AI 맞춤형 운영 전략 보고서</h2>
                        <p className="text-gray-500 text-sm">최신 알고리즘 트렌드와 채널 데이터를 분석한 결과입니다.</p>
                      </div>
                    </div>
                    
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-sm">
                        {strategy}
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => isKeyValid && setShowKeyModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#151921] w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-[#2D3748]"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20">
                  <Settings size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">YouTube API 설정</h2>
                <p className="text-gray-500 text-sm">
                  분석을 시작하려면 YouTube Data API v3 키가 필요합니다.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-bold mb-2 text-gray-500 uppercase tracking-widest">API Key</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full h-14 px-5 bg-[#1A1F26] rounded-2xl border border-[#2D3748] focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 outline-none transition-all text-white"
                  />
                </div>

                <div className="bg-blue-500/5 p-5 rounded-2xl text-[11px] text-blue-400 leading-relaxed border border-blue-500/10">
                  <p className="font-bold mb-1 flex items-center gap-2"><AlertCircle size={14} /> 보안 안내</p>
                  입력하신 키는 브라우저 로컬 스토리지에 암호화되어 저장되며, 분석 요청 시에만 Google API 서버로 직접 전송됩니다.
                </div>

                <div className="flex gap-3">
                  {isKeyValid && (
                    <button 
                      onClick={() => setShowKeyModal(false)}
                      className="flex-1 h-14 bg-[#1A1F26] text-gray-400 rounded-2xl font-bold hover:bg-[#2D3748] transition-all border border-[#2D3748]"
                    >
                      닫기
                    </button>
                  )}
                  <button 
                    onClick={() => handleSaveKey(apiKey)}
                    disabled={loading}
                    className="flex-[2] h-14 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "연결 및 저장"}
                  </button>
                </div>
                
                <a 
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-center text-[10px] text-gray-600 hover:text-red-500 transition-colors font-bold uppercase tracking-widest"
                >
                  API 키 발급 가이드 확인하기
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
