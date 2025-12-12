import React, { useState, useEffect, useCallback } from 'react';
import { CATEGORIES, APP_NAME } from './constants';
import { StyleCategory, CategoryDetails, GenerationStatus, MangaLayoutType, MangaColorMode, MangaStyleType, ManualStyleMode, PosterType, CardType, LogoStyleType, IdPhotoLayoutType, IdPhotoSizeType, AspectRatioType, AdMode, AdHandType, AdModelType, AdRegion, AdPodiumType, CopywritingMode, CopywritingTone, StickerLayoutType, Cinematic3DStyleType, UploadedFile } from './types';
import { enhancePrompt, generateImageFromPrompt, analyzeImageToPrompt, TEXT_MODEL_ID, IMAGE_MODEL_ID } from './services/geminiService';
import { CategoryCard } from './components/CategoryCard';

// Window augmentation for Gemini API Key Selection
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isDark = theme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState<CategoryDetails>(CATEGORIES[0]);

  // State for specific modes
  const [mangaLayout, setMangaLayout] = useState<MangaLayoutType>('SINGLE');
  const [mangaColor, setMangaColor] = useState<MangaColorMode>('BW');
  const [mangaStyle, setMangaStyle] = useState<MangaStyleType>('JAPANESE');
  const [manualStyle, setManualStyle] = useState<ManualStyleMode>('CARTOON');
  const [posterType, setPosterType] = useState<PosterType>('MOVIE');
  const [cardType, setCardType] = useState<CardType>('MINIMALIST');
  const [logoStyle, setLogoStyle] = useState<LogoStyleType>('LINE_ART');
  // ID Photo
  const [idPhotoLayout, setIdPhotoLayout] = useState<IdPhotoLayoutType>('SINGLE');
  const [idPhotoSize, setIdPhotoSize] = useState<IdPhotoSizeType>('2_INCH');

  // Advertisement State
  const [adMode, setAdMode] = useState<AdMode>('PODIUM');
  const [adHandType, setAdHandType] = useState<AdHandType>('FEMALE_HAND');
  const [adModelType, setAdModelType] = useState<AdModelType>('FEMALE');
  const [adRegion, setAdRegion] = useState<AdRegion>('ASIAN');
  const [adPodiumType, setAdPodiumType] = useState<AdPodiumType>('WHITE_PLATFORM');

  // Copywriting State
  const [copywritingMode, setCopywritingMode] = useState<CopywritingMode>('SOCIAL_MEDIA');
  const [copywritingTone, setCopywritingTone] = useState<CopywritingTone>('PROFESSIONAL');

  // Sticker State
  const [stickerLayout, setStickerLayout] = useState<StickerLayoutType>('SINGLE');

  // Cinematic 3D State
  const [cinematicStyle, setCinematicStyle] = useState<Cinematic3DStyleType>('HYPER_REALISTIC');

  // New state for aspect ratio (global)
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('1:1');

  // Unified File State (Images, PDFs, Texts)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [userInput, setUserInput] = useState('');
  const [enhancedPromptText, setEnhancedPromptText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');

  // 1. API Key Check on Mount
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeyReady(hasKey);
      } else {
        // Check LocalStorage or Env
        const localKey = localStorage.getItem('gemini_3_api_key');
        const envKey = process.env.GEMINI_3_API_KEY; // process.env.API_KEY checked in service
        if (localKey) {
          setApiKeyReady(true);
        } else if (envKey && !envKey.includes("AI Studio")) {
          setApiKeyReady(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setApiKeyReady(true);
      setErrorMsg(null);
    } else {
      setShowKeyModal(true);
    }
  };

  const saveManualKey = () => {
    if (!tempKey.trim()) return;
    localStorage.setItem('gemini_3_api_key', tempKey.trim());
    setApiKeyReady(true);
    setShowKeyModal(false);
    setErrorMsg(null);
  };

  // Theme Toggle
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Dynamic Theme Colors
  const colors = {
    bg: isDark ? 'bg-[#0f172a]' : 'bg-gray-50',
    text: isDark ? 'text-slate-100' : 'text-gray-900',
    textSub: isDark ? 'text-slate-400' : 'text-gray-500',
    textMuted: isDark ? 'text-slate-500' : 'text-gray-400',
    cardBg: isDark ? 'bg-slate-800/50' : 'bg-white shadow-sm',
    cardBorder: isDark ? 'border-slate-700/50' : 'border-gray-200',
    inputBg: isDark ? 'bg-slate-800' : 'bg-white',
    inputBorder: isDark ? 'border-slate-700' : 'border-gray-300',
    primary: 'indigo',
    headerGradient: isDark ? 'from-indigo-400 to-cyan-400' : 'from-indigo-600 to-cyan-600'
  };

  // Generic File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files) as File[]) {
      const isText = file.type === 'text/plain' || file.type === 'text/csv' || file.name.endsWith('.txt') || file.name.endsWith('.csv');
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      // Basic check for office docs (might fail in Gemini if not PDF, but we allow upload)
      const isDoc = file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt');

      try {
        if (isText) {
          // Read as text
          const textContent = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsText(file);
          });
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            mimeType: file.type || 'text/plain',
            data: textContent,
            type: 'text'
          });
        } else {
          // Read as Base64 (Image, PDF, Doc)
          const base64Content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            data: base64Content,
            type: isImage ? 'image' : 'document'
          });
        }
      } catch (err) {
        console.error(`Error reading file ${file.name}`, err);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    e.target.value = ''; // Reset input
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // 2. Logic to Generate Prompt / Content
  const handleEnhancePrompt = useCallback(async () => {
    if (!userInput.trim() && uploadedFiles.length === 0) return;
    if (!apiKeyReady) {
      await handleSelectKey();
    }

    setStatus('enhancing');
    setErrorMsg(null);
    setGeneratedImage(null); // Clear previous image when starting new flow

    try {
      const result = await enhancePrompt(
        userInput || "請參考附檔內容",
        selectedCategory,
        mangaLayout,
        mangaColor,
        mangaStyle,
        manualStyle,
        posterType,
        cardType,
        logoStyle,
        idPhotoLayout,
        idPhotoSize,
        aspectRatio,
        uploadedFiles,
        adMode,
        adHandType,
        adModelType,
        adRegion,
        adPodiumType,
        copywritingMode,
        copywritingTone,
        stickerLayout,
        cinematicStyle
      );
      setEnhancedPromptText(result);
      setStatus('idle');
    } catch (e: any) {
      console.error(e);
      setErrorMsg("無法生成內容，請確認 API Key 或檔案格式是否支援。");
      setStatus('error');
    }
  }, [userInput, selectedCategory, mangaLayout, mangaColor, mangaStyle, manualStyle, posterType, cardType, logoStyle, idPhotoLayout, idPhotoSize, aspectRatio, uploadedFiles, apiKeyReady, adMode, adHandType, adModelType, adRegion, adPodiumType, copywritingMode, copywritingTone, stickerLayout, cinematicStyle]);

  // 2.5 Logic to Analyze Image to Prompt (Only for Images)
  const handleAnalyzeImage = useCallback(async () => {
    const hasImages = uploadedFiles.some(f => f.type === 'image');
    if (!hasImages) return;

    if (!apiKeyReady) {
      await handleSelectKey();
    }

    setStatus('enhancing');
    setErrorMsg(null);
    setGeneratedImage(null);

    try {
      const result = await analyzeImageToPrompt(uploadedFiles);
      setEnhancedPromptText(result);
      setStatus('idle');
    } catch (e: any) {
      console.error(e);
      setErrorMsg("分析圖片失敗，請確認 API Key。");
      setStatus('error');
    }
  }, [uploadedFiles, apiKeyReady]);

  // 3. Logic to Generate Image
  const handleGenerateImage = useCallback(async () => {
    if (!enhancedPromptText) return;
    if (!apiKeyReady) {
      await handleSelectKey();
    }

    setStatus('generating_image');
    setErrorMsg(null);

    try {
      const base64Image = await generateImageFromPrompt(enhancedPromptText, aspectRatio, uploadedFiles);
      setGeneratedImage(base64Image);
      setStatus('success');
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.includes("Requested entity was not found")) {
        setApiKeyReady(false);
        setErrorMsg("API Key 無效或過期，請重新選擇。");
      } else {
        setErrorMsg("圖片生成失敗，請稍後再試。");
      }
      setStatus('error');
    }
  }, [enhancedPromptText, aspectRatio, uploadedFiles, apiKeyReady]);

  // Copy Prompt Handler
  const handleCopyPrompt = useCallback(() => {
    if (!enhancedPromptText) return;
    navigator.clipboard.writeText(enhancedPromptText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [enhancedPromptText]);

  // Loading Overlay Component
  const LoadingOverlay = ({ message }: { message: string }) => (
    <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl animate-in fade-in duration-300 backdrop-blur-sm ${isDark ? 'bg-slate-900/80' : 'bg-white/80'}`}>
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className={`font-medium animate-pulse ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>{message}</p>
    </div>
  );

  // Helper to determine placeholder text
  const getPlaceholder = () => {
    if (selectedCategory.id === StyleCategory.MANGA) {
      return mangaLayout !== 'SINGLE'
        ? "例如：起承轉合的故事描述。主角在早上遲到，叼著吐司奔跑，轉角撞到人，結果發現是轉學生..."
        : "例如：一隻在雨中穿著黃色雨衣的柴犬，旁邊有 '下雨了' 的中文對話框...";
    }
    if (selectedCategory.id === StyleCategory.LINE_STICKER) {
      return stickerLayout === 'SINGLE'
        ? "例如：一隻可愛的橘貓，表情驚訝，文字是『真的假的？！』..."
        : `例如：生成一組 ${stickerLayout === 'SHEET_8' ? '8' : '多'} 張的柴犬表情包，包含開心、生氣、難過等表情...`;
    }
    if (selectedCategory.id === StyleCategory.INSTRUCTION_MANUAL) {
      if (manualStyle === 'GUIDE_MAP') return "例如：台北市動物園的導覽地圖，標示出企鵝館、熊貓館...";
      if (manualStyle === 'INFOGRAPHIC') return "例如：2024年全球咖啡消費量的統計圖表...";
      return "例如：如何組裝一張木製椅子的步驟圖，要有標籤 1, 2, 3...";
    }
    if (selectedCategory.id === StyleCategory.ADVERTISEMENT) {
      if (adMode === 'HAND_MODEL') return "例如：一瓶高級精華液，手部優雅地拿著...";
      if (adMode === 'FULL_MODEL') return "例如：一位穿著運動裝的模特兒正在使用智慧手錶...";
      return "例如：一雙限量球鞋展示在台子上...";
    }
    if (selectedCategory.id === StyleCategory.POSTER) {
      return "例如：一部關於時空旅行的科幻電影，標題是『未來歸來』，要有神秘的時鐘背景...";
    }
    if (selectedCategory.id === StyleCategory.BUSINESS_CARD) {
      return "例如：一位花藝師的名片，上面有『花語工作室』字樣，要有淡雅的花朵插圖...";
    }
    if (selectedCategory.id === StyleCategory.LOGO_DESIGN) {
      return "例如：一家咖啡廳的Logo，包含咖啡豆與貓咪的元素...";
    }
    if (selectedCategory.id === StyleCategory.ID_PHOTO) {
      return "例如：一位穿著深色西裝的亞洲男性，白色背景，表情自信...";
    }
    if (selectedCategory.id === StyleCategory.COPYWRITING) {
      if (copywritingMode === 'SOCIAL_MEDIA') return "例如：幫我寫一篇關於新開幕的貓咪咖啡廳的IG貼文，要很可愛...";
      if (copywritingMode === 'AD_COPY') return "例如：推銷一款降噪耳機的廣告文案，強調專注與寧靜...";
      if (copywritingMode === 'QA_HELPER') return "例如：請問如何煮出完美的水波蛋？";
      return "例如：寫一篇關於人工智慧未來發展的短文...";
    }
    if (selectedCategory.id === StyleCategory.CINEMATIC_3D) {
      if (cinematicStyle === 'HYPER_REALISTIC') return "例如：一個長滿青苔的古老石像特寫，極致真實的紋理...";
      if (cinematicStyle === 'DISNEY') return "例如：一位穿著藍色禮服的公主在冰雪城堡前唱歌...";
      if (cinematicStyle === 'CYBERPUNK') return "例如：一位黑客在雨中的霓虹城市奔跑...";
      if (cinematicStyle === 'SPIDER_VERSE') return "例如：一位穿著帽T的少年在摩天大樓間擺盪，網點風格強烈...";
      return "例如：一個未來的賽博龐克城市夜景...";
    }
    return "例如：一個未來的賽博龐克城市夜景...";
  };

  // Reusable styling for option buttons
  const getOptionButtonClass = (isActive: boolean) =>
    `flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all shadow-sm ${isActive
      ? 'bg-indigo-600 text-white shadow-indigo-500/30'
      : isDark
        ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const isCopywriting = selectedCategory.id === StyleCategory.COPYWRITING;
  const hasImages = uploadedFiles.some(f => f.type === 'image');

  return (
    <div className={`min-h-screen transition-colors duration-300 ${colors.bg} ${colors.text} p-4 md:p-8 font-sans`}>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b pb-6 transition-colors duration-300 border-opacity-50" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className={`text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${colors.headerGradient} tracking-tight`}>
                {APP_NAME}
              </h1>
              <div className={`text-xs px-2 py-1 rounded-full border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-600'}`}>
                v.{import.meta.env.VITE_APP_VERSION}
              </div>
              <div className={`text-xs px-2 py-1 rounded-full border ${isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border-yellow-200 bg-yellow-50 text-yellow-600'}`}>
                {/* @ts-ignore */}
                API Key: {(localStorage.getItem('gemini_3_api_key') || process.env.GEMINI_3_API_KEY) ? (localStorage.getItem('gemini_3_api_key') || process.env.GEMINI_3_API_KEY)?.replace(/^(.{4}).+(.{4})$/, "$1....$2") : 'NONE'}
              </div>
              <div className={`text-xs px-2 py-1 rounded-full border ${isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>
                Text Model: {TEXT_MODEL_ID}
              </div>
              <div className={`text-xs px-2 py-1 rounded-full border ${isDark ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-green-200 bg-green-50 text-green-600'}`}>
                Image Model: {IMAGE_MODEL_ID}
              </div>
            </div>

            <p className={`mt-3 ${colors.textSub} max-w-3xl text-lg leading-relaxed`}>
              Gemini 3 Pro：影像生成神器！ 高品質圖像、多國語言轉換、完美中文字體、多種專業藝術風格，一鍵搞定。
            </p>

            {/* Author Credits */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm font-medium">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-white border border-gray-200 text-gray-600'}`}>
                <span>👨‍💻 Author:</span>
                <span className="text-indigo-500">AI Agent</span>
              </div>
              <a
                /*href="https://"*/
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <span>AI Agent</span>
              </a>
              <a
                /*href="https://"*/
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 ${isDark ? 'bg-red-900/20 text-red-300 hover:bg-red-900/40' : 'bg-red-50 border border-red-100 text-red-600 hover:bg-red-100'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                AI Agent
              </a>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 mt-4 md:mt-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-sm border border-gray-200 hover:bg-gray-50'}`}
              title={isDark ? "切換至亮色模式" : "切換至深色模式"}
            >
              {isDark ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {!apiKeyReady && (
              <button
                onClick={handleSelectKey}
                className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold transition shadow-lg flex items-center gap-2 text-sm"
              >
                <span>🔑</span> 連結
              </button>
            )}
          </div>
        </div>

        {/* Left Column: Controls */}
        <div className="w-full flex flex-col gap-8">

          {/* Step 1: Category Selection */}
          <section>
            <h2 className={`text-sm uppercase tracking-wider font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100 text-indigo-700'}`}>1</span>
              選擇功能 / 風格
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORIES.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isSelected={selectedCategory.id === cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                  }}
                  theme={theme}
                />
              ))}
            </div>

            {/* Sub-selection Panels */}
            {/* WRAPPER STYLE */}
            <div className={`transition-all duration-300 ${[StyleCategory.MANGA, StyleCategory.INSTRUCTION_MANUAL, StyleCategory.POSTER, StyleCategory.BUSINESS_CARD, StyleCategory.LOGO_DESIGN, StyleCategory.ID_PHOTO, StyleCategory.ADVERTISEMENT, StyleCategory.COPYWRITING, StyleCategory.LINE_STICKER, StyleCategory.CINEMATIC_3D].includes(selectedCategory.id)
              ? 'mt-6 opacity-100 translate-y-0'
              : 'mt-0 opacity-0 -translate-y-4 h-0 overflow-hidden'
              }`}>
              <div className={`p-5 rounded-2xl border ${colors.cardBg} ${colors.cardBorder} flex flex-col gap-5`}>

                {/* MANGA */}
                {selectedCategory.id === StyleCategory.MANGA && (
                  <>
                    {/* Manga Style (Genre) */}
                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">🖌️</span> 畫風流派
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { id: 'JAPANESE', label: '日本漫畫' },
                          { id: 'SHOJO', label: '少女漫畫' },
                          { id: 'WUXIA', label: '武俠漫畫' },
                          { id: 'AMERICAN', label: '美式漫畫' },
                          { id: 'KOREAN', label: '韓國漫畫' },
                          { id: 'PIXEL', label: '像素風格' },
                          { id: 'RAW', label: '原生圖片' },
                        ] as const).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setMangaStyle(s.id)}
                            className={getOptionButtonClass(mangaStyle === s.id)}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Layout Selection */}
                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">📖</span> 漫畫格式
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setMangaLayout('SINGLE')} className={getOptionButtonClass(mangaLayout === 'SINGLE')}>單幅插畫</button>
                        <button onClick={() => setMangaLayout('FOUR_PANEL')} className={getOptionButtonClass(mangaLayout === 'FOUR_PANEL')}>四格漫畫</button>
                        <button onClick={() => setMangaLayout('SIX_PANEL')} className={getOptionButtonClass(mangaLayout === 'SIX_PANEL')}>六格漫畫</button>
                        <button onClick={() => setMangaLayout('EIGHT_PANEL')} className={getOptionButtonClass(mangaLayout === 'EIGHT_PANEL')}>頁漫(8格)</button>
                        <button onClick={() => setMangaLayout('TEN_PANEL')} className={getOptionButtonClass(mangaLayout === 'TEN_PANEL')}>頁漫(10格)</button>
                        <button onClick={() => setMangaLayout('COVER')} className={getOptionButtonClass(mangaLayout === 'COVER')}>漫畫封面</button>
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">🎨</span> 色彩模式
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={() => setMangaColor('BW')} className={getOptionButtonClass(mangaColor === 'BW')}>黑白</button>
                        <button onClick={() => setMangaColor('COLOR')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all shadow-sm ${mangaColor === 'COLOR' ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-white border border-gray-200 text-gray-600'}`}>全彩</button>
                      </div>
                    </div>
                  </>
                )}

                {/* CINEMATIC 3D */}
                {selectedCategory.id === StyleCategory.CINEMATIC_3D && (
                  <div>
                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      <span className="text-lg">🧊</span> 3D 渲染風格
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setCinematicStyle('HYPER_REALISTIC')} className={getOptionButtonClass(cinematicStyle === 'HYPER_REALISTIC')}>極致寫實</button>
                      <button onClick={() => setCinematicStyle('DISNEY')} className={getOptionButtonClass(cinematicStyle === 'DISNEY')}>迪士尼風格</button>
                      <button onClick={() => setCinematicStyle('PIXAR')} className={getOptionButtonClass(cinematicStyle === 'PIXAR')}>皮克斯風格</button>
                      <button onClick={() => setCinematicStyle('CYBERPUNK')} className={getOptionButtonClass(cinematicStyle === 'CYBERPUNK')}>賽博龐克</button>
                      <button onClick={() => setCinematicStyle('WASTELAND')} className={getOptionButtonClass(cinematicStyle === 'WASTELAND')}>廢土/末日</button>
                      <button onClick={() => setCinematicStyle('DARK_FANTASY')} className={getOptionButtonClass(cinematicStyle === 'DARK_FANTASY')}>暗黑幻想</button>
                      <button onClick={() => setCinematicStyle('SPIDER_VERSE')} className={getOptionButtonClass(cinematicStyle === 'SPIDER_VERSE')}>美漫/網點</button>
                      <button onClick={() => setCinematicStyle('PAINTERLY')} className={getOptionButtonClass(cinematicStyle === 'PAINTERLY')}>油畫/塗抹</button>
                      <button onClick={() => setCinematicStyle('CEL_SHADED')} className={getOptionButtonClass(cinematicStyle === 'CEL_SHADED')}>日式賽璐珞</button>
                    </div>
                  </div>
                )}

                {/* LINE STICKER */}
                {selectedCategory.id === StyleCategory.LINE_STICKER && (
                  <div>
                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      <span className="text-lg">😊</span> 貼圖張數
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setStickerLayout('SINGLE')} className={getOptionButtonClass(stickerLayout === 'SINGLE')}>單張 (Single)</button>
                      <button onClick={() => setStickerLayout('SHEET_8')} className={getOptionButtonClass(stickerLayout === 'SHEET_8')}>8張 (Sheet)</button>
                      <button onClick={() => setStickerLayout('SHEET_16')} className={getOptionButtonClass(stickerLayout === 'SHEET_16')}>16張 (Sheet)</button>
                      <button onClick={() => setStickerLayout('SHEET_24')} className={getOptionButtonClass(stickerLayout === 'SHEET_24')}>24張 (Sheet)</button>
                      <button onClick={() => setStickerLayout('SHEET_32')} className={getOptionButtonClass(stickerLayout === 'SHEET_32')}>32張 (Sheet)</button>
                      <button onClick={() => setStickerLayout('SHEET_40')} className={getOptionButtonClass(stickerLayout === 'SHEET_40')}>40張 (Sheet)</button>
                    </div>
                    <p className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-500/80 p-2 rounded border border-yellow-200 dark:border-yellow-700/30 mt-3">
                      ⚠️ 370x320px 規格。多張模式將生成「角色表情包 (Sprite Sheet)」，所有表情與文字均為隨機搭配。
                    </p>
                  </div>
                )}

                {/* INSTRUCTION MANUAL */}
                {selectedCategory.id === StyleCategory.INSTRUCTION_MANUAL && (
                  <div>
                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      <span className="text-lg">🛠️</span> 說明書風格
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setManualStyle('CARTOON')} className={getOptionButtonClass(manualStyle === 'CARTOON')}>卡通圖解</button>
                      <button onClick={() => setManualStyle('REALISTIC')} className={getOptionButtonClass(manualStyle === 'REALISTIC')}>寫實攝影</button>
                      <button onClick={() => setManualStyle('GUIDE_MAP')} className={getOptionButtonClass(manualStyle === 'GUIDE_MAP')}>導覽圖</button>
                      <button onClick={() => setManualStyle('INFOGRAPHIC')} className={getOptionButtonClass(manualStyle === 'INFOGRAPHIC')}>資訊圖表</button>
                    </div>
                    <p className={`text-xs mt-3 ${colors.textMuted}`}>* 將會自動生成繁體中文的步驟標籤與說明文字。</p>
                  </div>
                )}

                {/* ADVERTISEMENT */}
                {selectedCategory.id === StyleCategory.ADVERTISEMENT && (
                  <>
                    {/* Mode Selection */}
                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">🎬</span> 拍攝模式
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={() => setAdMode('HAND_MODEL')} className={getOptionButtonClass(adMode === 'HAND_MODEL')}>手部展示 (Hand)</button>
                        <button onClick={() => setAdMode('FULL_MODEL')} className={getOptionButtonClass(adMode === 'FULL_MODEL')}>模特兒 (Model)</button>
                        <button onClick={() => setAdMode('PODIUM')} className={getOptionButtonClass(adMode === 'PODIUM')}>展示台 (Podium)</button>
                      </div>
                    </div>

                    {/* Sub-options based on Ad Mode */}
                    <div className="mt-2 p-3 rounded-xl bg-opacity-50 border border-opacity-30 border-indigo-200 dark:bg-slate-900/50">
                      {adMode === 'HAND_MODEL' && (
                        <div className="flex gap-2">
                          <button onClick={() => setAdHandType('MALE_HAND')} className={getOptionButtonClass(adHandType === 'MALE_HAND')}>男模特手</button>
                          <button onClick={() => setAdHandType('FEMALE_HAND')} className={getOptionButtonClass(adHandType === 'FEMALE_HAND')}>女模特手</button>
                        </div>
                      )}

                      {adMode === 'FULL_MODEL' && (
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-2">
                            <button onClick={() => setAdRegion('ASIAN')} className={getOptionButtonClass(adRegion === 'ASIAN')}>亞洲臉孔</button>
                            <button onClick={() => setAdRegion('EUROPEAN')} className={getOptionButtonClass(adRegion === 'EUROPEAN')}>歐美臉孔</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setAdModelType('MALE')} className={getOptionButtonClass(adModelType === 'MALE')}>男模特 (Male)</button>
                            <button onClick={() => setAdModelType('FEMALE')} className={getOptionButtonClass(adModelType === 'FEMALE')}>女模特 (Female)</button>
                            <button onClick={() => setAdModelType('CHILD_BOY')} className={getOptionButtonClass(adModelType === 'CHILD_BOY')}>男童 (Boy)</button>
                            <button onClick={() => setAdModelType('CHILD_GIRL')} className={getOptionButtonClass(adModelType === 'CHILD_GIRL')}>女童 (Girl)</button>
                          </div>
                        </div>
                      )}

                      {adMode === 'PODIUM' && (
                        <div className="flex gap-2">
                          <button onClick={() => setAdPodiumType('WOODEN')} className={getOptionButtonClass(adPodiumType === 'WOODEN')}>質感木紋</button>
                          <button onClick={() => setAdPodiumType('SILK')} className={getOptionButtonClass(adPodiumType === 'SILK')}>高級絲綢</button>
                          <button onClick={() => setAdPodiumType('WHITE_PLATFORM')} className={getOptionButtonClass(adPodiumType === 'WHITE_PLATFORM')}>極簡白台</button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* POSTER */}
                {selectedCategory.id === StyleCategory.POSTER && (
                  <div>
                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      <span className="text-lg">🎭</span> 海報類型
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => setPosterType('MOVIE')} className={getOptionButtonClass(posterType === 'MOVIE')}>電影海報</button>
                      <button onClick={() => setPosterType('EVENT')} className={getOptionButtonClass(posterType === 'EVENT')}>活動宣傳</button>
                      <button onClick={() => setPosterType('PRODUCT')} className={getOptionButtonClass(posterType === 'PRODUCT')}>商業產品</button>
                    </div>
                  </div>
                )}

                {/* BUSINESS CARD */}
                {selectedCategory.id === StyleCategory.BUSINESS_CARD && (
                  <div>
                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      <span className="text-lg">💼</span> 名片風格
                    </h3>
                    <div className="flex gap-2 mb-3">
                      <button onClick={() => setCardType('MINIMALIST')} className={getOptionButtonClass(cardType === 'MINIMALIST')}>極簡白</button>
                      <button onClick={() => setCardType('LUXURY')} className={getOptionButtonClass(cardType === 'LUXURY')}>黑金奢華</button>
                      <button onClick={() => setCardType('CREATIVE')} className={getOptionButtonClass(cardType === 'CREATIVE')}>創意插畫</button>
                    </div>
                    <p className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-500/80 p-2 rounded border border-yellow-200 dark:border-yellow-700/30">
                      ⚠️ 將生成平面設計圖 (Flat View)，非 3D 樣機，方便直接印刷參考。
                    </p>
                  </div>
                )}

                {/* LOGO DESIGN */}
                {selectedCategory.id === StyleCategory.LOGO_DESIGN && (
                  <div>
                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      <span className="text-lg">💠</span> Logo 風格
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { id: 'LINE_ART', label: '線條' },
                        { id: 'SKETCH', label: '素描' },
                        { id: 'ILLUSTRATION', label: '插畫' },
                        { id: 'CARTOON', label: '卡通' },
                        { id: '3D', label: '3D立體' },
                        { id: 'ARTISTIC', label: '藝術' },
                        { id: 'CUTE', label: '可愛' },
                      ] as const).map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setLogoStyle(style.id)}
                          className={getOptionButtonClass(logoStyle === style.id)}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ID PHOTO */}
                {selectedCategory.id === StyleCategory.ID_PHOTO && (
                  <>
                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">🖨️</span> 排版格式
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={() => setIdPhotoLayout('SINGLE')} className={getOptionButtonClass(idPhotoLayout === 'SINGLE')}>單張 (Single)</button>
                        <button onClick={() => setIdPhotoLayout('SHEET_8')} className={getOptionButtonClass(idPhotoLayout === 'SHEET_8')}>4x6排版 (8張)</button>
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">📏</span> 尺寸規格
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={() => setIdPhotoSize('1_INCH')} className={getOptionButtonClass(idPhotoSize === '1_INCH')}>1吋 (1 Inch)</button>
                        <button onClick={() => setIdPhotoSize('2_INCH')} className={getOptionButtonClass(idPhotoSize === '2_INCH')}>2吋 (2 Inch)</button>
                      </div>
                    </div>
                  </>
                )}

                {/* COPYWRITING ASSISTANT */}
                {selectedCategory.id === StyleCategory.COPYWRITING && (
                  <>
                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">📝</span> 寫作類型
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setCopywritingMode('SOCIAL_MEDIA')} className={getOptionButtonClass(copywritingMode === 'SOCIAL_MEDIA')}>社群貼文 (IG/FB)</button>
                        <button onClick={() => setCopywritingMode('AD_COPY')} className={getOptionButtonClass(copywritingMode === 'AD_COPY')}>廣告文案 (Ads)</button>
                        <button onClick={() => setCopywritingMode('ARTICLE')} className={getOptionButtonClass(copywritingMode === 'ARTICLE')}>短篇文章/SEO</button>
                        <button onClick={() => setCopywritingMode('QA_HELPER')} className={getOptionButtonClass(copywritingMode === 'QA_HELPER')}>一般問答/解惑</button>
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <span className="text-lg">🗣️</span> 語氣設定
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={() => setCopywritingTone('PROFESSIONAL')} className={getOptionButtonClass(copywritingTone === 'PROFESSIONAL')}>專業權威</button>
                        <button onClick={() => setCopywritingTone('HUMOROUS')} className={getOptionButtonClass(copywritingTone === 'HUMOROUS')}>幽默風趣</button>
                        <button onClick={() => setCopywritingTone('EMOTIONAL')} className={getOptionButtonClass(copywritingTone === 'EMOTIONAL')}>感性溫暖</button>
                        <button onClick={() => setCopywritingTone('DIRECT')} className={getOptionButtonClass(copywritingTone === 'DIRECT')}>直白有力</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* GLOBAL SETTING: Aspect Ratio (Hide for Copywriting) */}
            {!isCopywriting && (
              <div className={`mt-8 pt-6 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <h2 className={`text-sm uppercase tracking-wider font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100 text-indigo-700'}`}>📐</span>
                  畫布比例
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setAspectRatio('3:4')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 ${aspectRatio === '3:4' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-500' : isDark ? 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <div className="w-4 h-6 border-2 border-current rounded-sm"></div>
                    <span className="text-xs font-medium">直式 (3:4)</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio('1:1')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 ${aspectRatio === '1:1' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-500' : isDark ? 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <div className="w-5 h-5 border-2 border-current rounded-sm"></div>
                    <span className="text-xs font-medium">正方形 (1:1)</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio('4:3')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 ${aspectRatio === '4:3' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-500' : isDark ? 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <div className="w-6 h-4 border-2 border-current rounded-sm"></div>
                    <span className="text-xs font-medium">橫式 (4:3)</span>
                  </button>
                </div>
                {/* Advanced ratios */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-white text-gray-500 border-gray-200'}`}
                  >
                    手機全屏 (9:16)
                  </button>
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-white text-gray-500 border-gray-200'}`}
                  >
                    寬螢幕 (16:9)
                  </button>
                </div>
              </div>
            )}

          </section>

          {/* Step 2: Input */}
          <section>
            <h2 className={`text-sm uppercase tracking-wider font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100 text-indigo-700'}`}>2</span>
              {isCopywriting ? '輸入需求或問題' : '輸入描述'}
            </h2>
            <div className="relative group">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={getPlaceholder()}
                className={`w-full h-40 border-2 rounded-2xl p-4 placeholder-opacity-50 outline-none transition resize-none shadow-inner ${colors.inputBg} ${colors.inputBorder} ${colors.text} ${isDark ? 'placeholder-slate-500 focus:border-indigo-500' : 'placeholder-gray-400 focus:border-indigo-400'}`}
              />
              <div className={`absolute bottom-4 right-4 text-xs ${colors.textMuted}`}>
                {userInput.length} chars
              </div>
            </div>

            {/* File Upload Section */}
            <div className={`mt-4 p-4 rounded-xl border border-dashed transition-all ${isDark ? 'bg-slate-800/30 border-slate-700 hover:border-slate-500' : 'bg-gray-50 border-gray-300 hover:border-gray-400'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className={`cursor-pointer group flex items-center gap-3 text-sm font-medium transition ${isDark ? 'text-slate-400 hover:text-indigo-300' : 'text-gray-600 hover:text-indigo-600'}`}>
                  <div className={`p-2.5 rounded-lg transition ${isDark ? 'bg-slate-700 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-white border border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-200'}`}>


                    📤
                  </div>
                  <span className="flex flex-col text-left">
                    <span>上傳參考檔案 / 圖片</span>
                    <span className="text-xs opacity-60 font-normal">支援 PDF, TXT, CSV, 圖片 (Word/PPT 建議轉為 PDF)</span>
                  </span>
                  <input
                    type="file"
                    multiple
                    // Accept a wide range of documents. 
                    // Note: Word/PPT are accepted but success depends on Gemini's parsing of binary blobs vs PDF.
                    accept="image/*, .pdf, .txt, .csv, .doc, .docx, .ppt, .pptx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                {uploadedFiles.length > 0 && (
                  <button
                    onClick={() => setUploadedFiles([])}
                    className="text-xs text-red-500 hover:text-red-600 underline ml-auto"
                  >
                    清除所有
                  </button>
                )}
              </div>

              {uploadedFiles.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-4 custom-scrollbar">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="relative group flex-shrink-0 w-24 flex flex-col items-center">
                      {file.type === 'image' ? (
                        <img
                          src={file.data}
                          alt={file.name}
                          className={`h-20 w-20 object-cover rounded-lg shadow-md ${isDark ? 'bg-slate-900 border border-slate-600' : 'bg-white border border-gray-200'}`}
                        />
                      ) : (
                        <div className={`h-20 w-20 flex flex-col items-center justify-center p-2 rounded-lg shadow-md text-xs text-center break-words overflow-hidden ${isDark ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                          <span className="text-2xl mb-1">
                            {file.mimeType.includes('pdf') ? '📄' : file.type === 'text' ? '📝' : '📁'}
                          </span>
                          <span className="line-clamp-2 w-full text-[10px] leading-tight">{file.name}</span>
                        </div>
                      )}

                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition transform hover:scale-110 z-10"
                        title="移除"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className={`text-xs mt-3 opacity-80 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
              {isCopywriting
                ? '💡 提示：上傳產品文件 (PDF/CSV/TXT) 或圖片，AI 將根據內容撰寫更精準的文案。'
                : '💡 提示：若上傳參考圖，AI 將分析構圖與風格；若上傳文件，將作為背景知識參考。'}
            </p>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 mt-2">
            <button
              onClick={handleEnhancePrompt}
              disabled={(!userInput && uploadedFiles.length === 0) || status === 'enhancing' || status === 'generating_image'}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50 disabled:bg-slate-800 disabled:text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 disabled:bg-gray-200 disabled:text-gray-400'}`}
            >
              {status === 'enhancing' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{isCopywriting ? '正在撰寫文案...' : '正在優化提示詞...'}</span>
                </>
              ) : (
                <>
                  <span>{isCopywriting ? '✨ 開始撰寫文案' : '✨ 生成圖片專業提示詞'}</span>
                </>
              )}
            </button>

            {/* New "Analyze Image" Button - Only visible when images are uploaded */}
            {hasImages && (
              <button
                onClick={handleAnalyzeImage}
                disabled={status === 'enhancing' || status === 'generating_image'}
                className={`w-full py-3 rounded-xl font-bold text-base transition-all transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2 border ${isDark ? 'bg-slate-800 border-indigo-500/50 text-indigo-300 hover:bg-slate-700' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
              >
                <span>🔍 分析圖片生成{isCopywriting ? '文案' : '提示詞'}</span>
              </button>
            )}
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="w-full flex flex-col gap-6">

          {/* Enhanced Prompt Result (Or Copywriting Result) */}
          <div className={`rounded-2xl border p-6 flex flex-col relative transition-colors duration-300 ${colors.cardBg} ${colors.cardBorder} ${isCopywriting ? 'min-h-[600px]' : 'min-h-[200px]'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <span className="text-lg">⚡</span>
                {isCopywriting ? '文案生成結果' : '優化後的提示詞'}
              </h3>
              {enhancedPromptText && (
                <button
                  onClick={handleCopyPrompt}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-600'}`}
                >
                  {isCopied ? (
                    <>
                      <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      已複製
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      複製
                    </>
                  )}
                </button>
              )}
            </div>

            <div className={`flex-grow p-4 rounded-xl font-mono text-sm leading-relaxed overflow-y-auto ${isCopywriting ? 'max-h-[700px] whitespace-pre-wrap' : 'max-h-[300px]'} border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
              {enhancedPromptText || <span className="opacity-40 italic">等待生成...</span>}
            </div>

            {/* Generate Image Button - HIDDEN for Copywriting */}
            {!isCopywriting && enhancedPromptText && (
              <button
                onClick={handleGenerateImage}
                disabled={status === 'generating_image'}
                className={`mt-4 w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'}`}
              >
                <span>🎨 立即生成圖片</span>
              </button>
            )}
          </div>

          {/* Generated Image Result - HIDDEN for Copywriting */}
          {!isCopywriting && (
            <div className={`rounded-2xl border p-1 relative min-h-[400px] flex items-center justify-center overflow-hidden transition-colors duration-300 ${colors.cardBg} ${colors.cardBorder}`}>

              {status === 'generating_image' && <LoadingOverlay message="AI 正在繪製中..." />}

              {generatedImage ? (
                <div className="relative w-full h-full group">
                  <img
                    src={generatedImage}
                    alt="Generated Art"
                    className="w-full h-auto rounded-xl shadow-md object-contain max-h-[600px] animate-in zoom-in duration-500"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={generatedImage}
                      download={`nano_banana_pro_${Date.now()}.png`}
                      className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm flex items-center gap-2 text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      下載圖片
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center opacity-30 text-center p-8">
                  <div className={`w-24 h-24 mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                    <span className="text-4xl">🖼️</span>
                  </div>
                  <p className="font-medium">預覽區域</p>
                  <p className="text-sm mt-2">優化提示詞後點擊生成圖片</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* API Key Modal - Placed at Root Level */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setShowKeyModal(false); }}>
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl scale-100 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🔑</span> 設定 API Key
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              請輸入您的 Google Gemini API Key 以啟用功能。您的 Key 僅儲存於本地瀏覽器。
            </p>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Paste your Gemini API Key here..."
              className={`w-full p-3 rounded-xl border mb-4 outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                取消
              </button>
              <button
                onClick={saveManualKey}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/30 transition"
              >
                儲存連結
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-dashed border-gray-500/30 text-xs text-center">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                沒有 Key? 前往 Google AI Studio 申請
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;