import { GoogleGenAI, Type } from "@google/genai";
import { CategoryDetails, MangaLayoutType, MangaColorMode, MangaStyleType, ManualStyleMode, PosterType, CardType, LogoStyleType, IdPhotoLayoutType, IdPhotoSizeType, StyleCategory, AspectRatioType, AdMode, AdHandType, AdModelType, AdRegion, AdPodiumType, CopywritingMode, CopywritingTone, StickerLayoutType, Cinematic3DStyleType, UploadedFile } from '../types';

// Helper to get the AI client. Note: We create a NEW instance every time 
// to ensure we capture the latest API Key if the user re-selects it.
// Helper to get the AI client. Note: We create a NEW instance every time 
// to ensure we capture the latest API Key if the user re-selects it.
const getAiClient = () => {
  const apiKey = localStorage.getItem('gemini_3_api_key') || process.env.GEMINI_3_API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing! generating content will likely fail.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// Helper to clean base64 string for Gemini API (removes data:xxx;base64, prefix)
const cleanBase64 = (base64String: string) => {
  const parts = base64String.split(',');
  return parts.length > 1 ? parts[1] : base64String;
};

export const TEXT_MODEL_ID = "gemini-2.5-flash";
export const IMAGE_MODEL_ID = "gemini-3-pro-image-preview";

export const enhancePrompt = async (
  userInput: string,
  category: CategoryDetails,
  mangaLayout: MangaLayoutType = 'SINGLE',
  mangaColor: MangaColorMode = 'BW',
  mangaStyle: MangaStyleType = 'JAPANESE',
  manualStyle: ManualStyleMode = 'CARTOON',
  posterType: PosterType = 'MOVIE',
  cardType: CardType = 'MINIMALIST',
  logoStyle: LogoStyleType = 'LINE_ART',
  idPhotoLayout: IdPhotoLayoutType = 'SINGLE',
  idPhotoSize: IdPhotoSizeType = '2_INCH',
  aspectRatio: AspectRatioType = '1:1',
  uploadedFiles: UploadedFile[] = [],
  // Ad params
  adMode: AdMode = 'PODIUM',
  adHandType: AdHandType = 'FEMALE_HAND',
  adModelType: AdModelType = 'FEMALE',
  adRegion: AdRegion = 'ASIAN',
  adPodiumType: AdPodiumType = 'WHITE_PLATFORM',
  // Copywriting params
  copywritingMode: CopywritingMode = 'SOCIAL_MEDIA',
  copywritingTone: CopywritingTone = 'PROFESSIONAL',
  // Sticker params
  stickerLayout: StickerLayoutType = 'SINGLE',
  // Cinematic 3D params
  cinematicStyle: Cinematic3DStyleType = 'HYPER_REALISTIC'
): Promise<string> => {
  const ai = getAiClient();

  // We use gemini-2.5-flash for the text reasoning/prompt engineering task
  const modelId = TEXT_MODEL_ID;

  let layoutInstruction = "";
  let styleVariationInstruction = "";
  let isCopywriting = false;

  // COPYWRITING LOGIC
  if (category.id === StyleCategory.COPYWRITING) {
    isCopywriting = true;
    let toneDesc = "";
    switch (copywritingTone) {
      case 'PROFESSIONAL': toneDesc = "專業、權威、值得信賴 (Professional & Trustworthy)"; break;
      case 'HUMOROUS': toneDesc = "幽默、風趣、輕鬆 (Humorous & Witty)"; break;
      case 'EMOTIONAL': toneDesc = "感性、溫暖、打動人心 (Emotional & Touching)"; break;
      case 'DIRECT': toneDesc = "直接、有力、急迫感 (Direct & Urgent)"; break;
    }

    let modeDesc = "";
    switch (copywritingMode) {
      case 'SOCIAL_MEDIA':
        modeDesc = `Task: Write a Social Media Post (FB/IG/Threads).
            Requirements: Use emojis, hashtags, and a conversational structure. Aim for high engagement.`;
        break;
      case 'AD_COPY':
        modeDesc = `Task: Write Advertising Copy (Google Ads/FB Ads).
            Requirements: Focus on Hook, Pain Points, Solution, and Call to Action (CTA). Short and punchy.`;
        break;
      case 'ARTICLE':
        modeDesc = `Task: Write a Short SEO Article or Blog Post.
            Requirements: Structured with H1/H2, clear paragraphs, and informative content.`;
        break;
      case 'QA_HELPER':
        modeDesc = `Task: General Q&A / Brainstorming.
            Requirements: Answer the user's question clearly, solve their problem, or provide ideas.`;
        break;
    }

    styleVariationInstruction = `
      **MODE**: ${modeDesc}
      **TONE**: ${toneDesc}
      
      Generate the content directly in Traditional Chinese. Do NOT generate an image prompt.
      `;
  }

  // MANGA LOGIC
  if (category.id === StyleCategory.MANGA) {
    // 1. Layout Logic
    if (mangaLayout === 'FOUR_PANEL') {
      layoutInstruction = `
      特殊指令: 用戶需要四格漫畫 (Yon-koma)。
      1. 生成的提示詞必須包含：「垂直排列的四格漫畫」、「漫畫條」、「四個分鏡」。
      2. 簡要描述四個格子的連續劇情。
      `;
    } else if (mangaLayout === 'SIX_PANEL') {
      layoutInstruction = `
      特殊指令: 用戶需要六格漫畫 (Six-panel manga page)。
      1. 生成的提示詞必須包含：「標準漫畫頁面佈局」、「六個分鏡」、「故事敘述流暢」。
      2. 簡要描述六個格子的連續劇情或動作。
      `;
    } else if (mangaLayout === 'EIGHT_PANEL') {
      layoutInstruction = `
      特殊指令: 用戶需要完整的漫畫頁面 (約8格)。
      1. 生成的提示詞必須包含：「漫畫頁面佈局」、「動態分鏡」、「對話框」、「敘事性構圖」。
      `;
    } else if (mangaLayout === 'TEN_PANEL') {
      layoutInstruction = `
      特殊指令: 用戶需要高密度的漫畫頁面 (十格漫畫)。
      1. 生成的提示詞必須包含：「複雜的漫畫頁面佈局」、「十個分鏡」、「詳細的故事細節」、「緊湊的節奏」。
      2. 確保分鏡清晰，適合展現豐富的劇情資訊。
      `;
    } else if (mangaLayout === 'COVER') {
      layoutInstruction = `
      特殊指令: 用戶需要漫畫單行本封面 (Manga Volume Cover)。
      1. 生成的提示詞必須包含：「漫畫封面設計」、「標題Logo設計」、「極具視覺衝擊的主角構圖」、「鮮明的色彩」、「第1卷 (Volume 1) 字樣」。
      2. 強調封面的吸引力與商業質感。
      `;
    } else {
      layoutInstruction = `特殊指令: 單幅精緻插畫，強調構圖與細節。`;
    }

    // 2. Sub-Style Logic
    let styleKeywords = "";
    const hasReferenceImages = uploadedFiles.some(f => f.type === 'image');
    switch (mangaStyle) {
      case 'WUXIA':
        styleKeywords = `「武俠漫畫風格 (Wuxia Manhua)」、「水墨風格 (Ink wash style)」、「飄逸的古裝」、「武術動作」、「東方古典美學」、「蒼勁有力的線條」、「江湖氣息」。`;
        break;
      case 'AMERICAN':
        styleKeywords = `「美式漫畫風格 (American Comic Book)」、「粗獷的輪廓線 (Bold outlines)」、「強烈的陰影 (Heavy shadows)」、「超級英雄美學」、「動態透視」、「DC/Marvel 風格」。`;
        break;
      case 'KOREAN':
        styleKeywords = `「韓漫風格 (Korean Webtoon)」、「精緻的數位繪圖 (Digital Art)」、「現代時尚感」、「唯美畫風 (Manhwa aesthetic)」、「鮮明的網漫質感」。`;
        break;
      case 'SHOJO':
        styleKeywords = `「少女漫畫風格 (Shojo Manga)」、「唯美畫風」、「大眼睛」、「細膩的情感表達」、「花朵與夢幻背景」、「柔和的線條」、「浪漫氛圍」。`;
        break;
      case 'PIXEL':
        styleKeywords = `「像素藝術漫畫 (Pixel Art Manga)」、「復古 8-bit/16-bit 風格」、「點陣圖質感」、「懷舊遊戲美學」、「清晰的像素邊緣」。`;
        break;
      case 'RAW':
        if (hasReferenceImages) {
          styleKeywords = `「1:1 完全還原參考圖風格 (Exact Replication)」、「與參考圖長得一模一樣」、「保留原始配色與光影」、「高保真畫質」、「無額外風格濾鏡」。`;
        } else {
          styleKeywords = `「原生圖片風格 (Raw Image Style)」、「高保真畫質」、「無濾鏡質感」、「清晰細節」、「原始素材感 (Raw aesthetics)」。`;
        }
        break;
      case 'JAPANESE':
      default:
        styleKeywords = `「日系漫畫風格 (Japanese Manga)」、「細膩的線條」、「豐富的網點 (Screentones)」、「動漫美學」、「Shonen Jump 風格」。`;
        break;
    }

    // 3. Color Logic
    let colorKeywords = "";
    if (mangaStyle === 'RAW' && hasReferenceImages) {
      colorKeywords = `色彩指令: 必須與參考圖片的顏色完全一致 (Exact Color Match)。請詳細描述參考圖的色彩配置、色調與飽和度，確保生成的圖片色彩與原圖一模一樣，不要改變原本的顏色。`;
    } else if (mangaColor === 'COLOR') {
      colorKeywords = `色彩指令: 使用關鍵字「全彩」、「鮮豔色彩」、「賽璐璐上色」或配合上述風格的色彩（如水墨彩、美漫上色）。不可出現黑白相關詞彙。`;
    } else {
      colorKeywords = `色彩指令: 使用關鍵字「黑白漫畫」、「網點紙效果」、「沾水筆觸」、「漫畫原稿風格」。`;
    }

    styleVariationInstruction = `
    風格設定: ${styleKeywords}
    ${colorKeywords}
    `;
  }

  // CINEMATIC 3D LOGIC
  if (category.id === StyleCategory.CINEMATIC_3D) {
    let cinematicKeywords = "";

    switch (cinematicStyle) {
      case 'HYPER_REALISTIC':
        cinematicKeywords = `
              **SELECTED STYLE**: 極致寫實風格 (Hyper-realistic / Photorealistic CGI).
              指引: 追求照片級真實感，毛孔、紋理、光影瑕疵。
              必填關鍵字: "Hyper-realistic", "Unreal Engine 5", "8k textures", "Ray tracing", "Subsurface scattering (SSS)", "Cinematic lighting", "Photograph", "Shot on 35mm", "Imperfections", "Highly detailed skin pores".
              禁語 (Negative Constraint): Do NOT use "cartoon", "stylized", "anime", "painting", "drawing", "Pixar style", "Disney style".
              `;
        break;
      case 'DISNEY':
        cinematicKeywords = `
              **SELECTED STYLE**: 迪士尼動畫風格 (Disney Animation Style).
              指引: 現代迪士尼動畫電影質感，大眼角色，柔美光影。
              必填關鍵字: "Disney animation style", "3D render", "Pixar-like but softer", "Character appeal", "Volumetric lighting", "Magical atmosphere", "Vibrant colors", "Frozen style", "Tangled style", "Expressive faces".
              禁語 (Negative Constraint): Do NOT use "photorealistic", "gritty", "dark", "cyberpunk", "horror".
              `;
        break;
      case 'PIXAR':
        cinematicKeywords = `
              **SELECTED STYLE**: 皮克斯風格 (Pixar Style).
              指引: 獨特的形狀語言，風格化的寫實材質。
              必填關鍵字: "Pixar style", "Disney Pixar", "RenderMan", "Stylized realism", "Soft shadows", "Vibrant textures", "Cinema 4D", "Octane render", "Toy Story aesthetic", "Soul aesthetic".
              禁語 (Negative Constraint): Do NOT use "hyper-realistic", "anime", "2D", "sketch".
              `;
        break;
      case 'CYBERPUNK':
        cinematicKeywords = `
              **SELECTED STYLE**: 賽博龐克 (Cyberpunk).
              指引: 科幻、霓虹、高科技低生活。
              必填關鍵字: "Cyberpunk 2077 style", "Neon lights (Cyan and Magenta)", "Rainy night", "Futuristic city", "Chrome reflections", "Holographic", "Cinematic 3D", "Unreal Engine", "High tech low life".
              禁語 (Negative Constraint): Do NOT use "Disney", "Pixar", "Cute", "Pastel colors".
              `;
        break;
      case 'WASTELAND':
        cinematicKeywords = `
              **SELECTED STYLE**: 廢土/末日風格 (Wasteland / Dystopian).
              指引: 破敗、荒涼、生鏽金屬、塵土飛揚。
              必填關鍵字: "Post-apocalyptic", "Mad Max style", "Wasteland", "Rusty metal", "Dust and sand", "Ruined buildings", "Desaturated earthy tones", "Harsh sunlight", "Gritty texture", "Survival gear".
              禁語 (Negative Constraint): Do NOT use "clean", "shiny", "cute", "vibrant", "neon".
              `;
        break;
      case 'DARK_FANTASY':
        cinematicKeywords = `
              **SELECTED STYLE**: 暗黑幻想 (Dark Fantasy).
              指引: 哥德式、詭異、壓抑、神秘。
              必填關鍵字: "Dark Fantasy", "Elden Ring style", "Diablo style", "Gothic architecture", "Eldritch horror", "Moody atmosphere", "Low key lighting", "Fog and mist", "Intricate armor", "Mystical glow".
              禁語 (Negative Constraint): Do NOT use "happy", "bright", "cartoon", "cute", "modern".
              `;
        break;
      case 'SPIDER_VERSE':
        cinematicKeywords = `
              **SELECTED STYLE**: 美漫/網點風格 (The "Spider-Verse" Style).
              指引: 故意降低幀數（抽幀）模仿真實動畫感，使用漫畫網點（Halftone），對話框，色彩錯位（Chromatic Aberration）。
              必填關鍵字: "Spider-Verse style", "Into the Spider-Verse", "Halftone dots", "Ben-Day dots", "Chromatic aberration", "Comic book aesthetic in 3D", "Low frame rate feel", "Graffiti texture", "Vibrant neon colors", "Action lines", "Speech bubbles".
              禁語 (Negative Constraint): Do NOT use "smooth", "photorealistic", "clean", "minimalist", "Disney style".
              `;
        break;
      case 'PAINTERLY':
        cinematicKeywords = `
              **SELECTED STYLE**: 油畫/塗抹風格 (Painterly Style).
              指引: 保留筆觸感，材質上有手繪的紋理，光影邊緣更加銳利或帶有繪畫的隨意感。
              必填關鍵字: "Painterly 3D", "Arcane style", "Hand-painted textures", "Visible brushstrokes", "Oil painting aesthetic", "Stylized realism", "Sharp lighting edges", "Matte painting look", "Artistic shading", "Concept art style".
              禁語 (Negative Constraint): Do NOT use "photorealistic", "smooth plastic", "noise", "granite".
              `;
        break;
      case 'CEL_SHADED':
        cinematicKeywords = `
              **SELECTED STYLE**: 日式賽璐珞風格 (Cel-Shading).
              指引: 模仿日本 2D 動畫，有明顯的色塊邊緣線（Outline）和硬陰影。
              必填關鍵字: "Cel-shading", "Toon shading", "Anime style 3D", "Genshin Impact style", "Guilty Gear style", "Hard outlines", "Flat colors", "2.5D aesthetic", "Japanese animation look", "Clean lines", "Vibrant anime colors".
              禁語 (Negative Constraint): Do NOT use "photorealistic", "soft shading", "oil painting", "western cartoon".
              `;
        break;
      default:
        cinematicKeywords = `風格: 「3D 電影級渲染」。關鍵字: "3D render", "Octane render", "Ray tracing", "4k".`;
    }

    styleVariationInstruction = `
      ${cinematicKeywords}
      
      CRITICAL INSTRUCTION:
      Strictly adhere to the **SELECTED STYLE** defined above. 
      Do NOT mix keywords from other 3D styles. 
      For example, if the style is "Hyper-realistic", do NOT include "Pixar" or "Disney" keywords.
      If the style is "Pixar", do NOT include "Hyper-realistic" or "Cyberpunk" unless requested.
      Ensure the prompt reflects ONLY the chosen aesthetic description.
      `;
  }

  // LINE STICKER LOGIC
  if (category.id === StyleCategory.LINE_STICKER) {
    let sheetCount = 1;
    let sheetDesc = "單張貼圖 (Single Sticker)";

    switch (stickerLayout) {
      case 'SHEET_8': sheetCount = 8; sheetDesc = "8張貼圖排列 (Sheet of 8 Stickers)"; break;
      case 'SHEET_16': sheetCount = 16; sheetDesc = "16張貼圖排列 (Sheet of 16 Stickers)"; break;
      case 'SHEET_24': sheetCount = 24; sheetDesc = "24張貼圖排列 (Sheet of 24 Stickers)"; break;
      case 'SHEET_32': sheetCount = 32; sheetDesc = "32張貼圖排列 (Sheet of 32 Stickers)"; break;
      case 'SHEET_40': sheetCount = 40; sheetDesc = "40張貼圖排列 (Sheet of 40 Stickers)"; break;
      default: sheetCount = 1; sheetDesc = "單張貼圖 (Single Sticker)"; break;
    }

    layoutInstruction = `
      佈局指令: ${sheetDesc}。
      1. 用戶需要「${sheetCount} 個不同的角色表情/動作」。
      2. 排列方式: 若為多張，請生成「角色表情包圖表 (Character Sheet / Sprite Sheet)」，將圖像平均排列在純色背景上。
      3. 每個小圖都必須包含一個「繁體中文 (Traditional Chinese)」的對話框或文字特效。
      4. 確保每個表情都不一樣 (隨機: 開心、生氣、難過、驚訝、疑惑、大笑等)。
      `;

    styleVariationInstruction = `
      風格指令: LINE 貼圖風格 (LINE Sticker Style)。
      1. 圖像比例暗示: 每個貼圖單體的視覺比例約為 370x320 像素 (接近正方形但略寬)。
      2. **NO WHITE BORDER**: 絕對不要白邊 (Negative Prompt: white outline, sticker border, die-cut border)。請生成直接繪製在背景上的角色 (Direct digital art on plain background)。
      3. 線條清晰粗獷 (Bold vector lines)，色彩鮮豔。
      4. 適合縮小觀看的構圖 (High readability at small size)。
      `;
  }

  // INSTRUCTION MANUAL LOGIC
  if (category.id === StyleCategory.INSTRUCTION_MANUAL) {
    if (manualStyle === 'CARTOON') {
      styleVariationInstruction = `風格指令: 「IKEA 風格說明書」、「向量線條」、「黑白輪廓」、「簡潔線條」、「卡通圖解」、「極簡主義」。`;
      layoutInstruction = `佈局指令: 確保圖像顯示清晰的步驟流程或爆炸圖 (exploded view)。包含「編號標籤 (1, 2, 3...)」與「指示箭頭」。`;
    } else if (manualStyle === 'REALISTIC') {
      styleVariationInstruction = `風格指令: 「寫實產品說明書」、「攝影棚攝影」、「純白背景」、「專業產品拆解圖」、「真實材質」。`;
      layoutInstruction = `佈局指令: 確保圖像顯示清晰的步驟流程或爆炸圖 (exploded view)。包含「編號標籤 (1, 2, 3...)」與「指示箭頭」。`;
    } else if (manualStyle === 'GUIDE_MAP') {
      styleVariationInstruction = `風格指令: 「觀光導覽地圖 (Tourist Guide Map)」、「等距視角 (Isometric view)」、「可愛插畫風格」、「地標建築特寫」、「色彩繽紛」。`;
      layoutInstruction = `佈局指令: 俯視地圖佈局，標示出主要路徑、景點與設施。包含「地標圖示」、「路線指引」。`;
    } else if (manualStyle === 'INFOGRAPHIC') {
      styleVariationInstruction = `風格指令: 「專業資訊圖表 (Infographic)」、「扁平化設計 (Flat Design)」、「數據視覺化」、「向量圖標」、「現代商務風格」。`;
      layoutInstruction = `佈局指令: 結構化的資訊版面。包含「統計圖表 (Pie chart/Bar chart)」、「流程圖」、「圖標與文字區塊的平衡排列」。`;
    }
  }

  // POSTER LOGIC
  if (category.id === StyleCategory.POSTER) {
    if (posterType === 'MOVIE') {
      styleVariationInstruction = `類型指令: 「電影海報」。強調戲劇性光影、主角特寫、電影標題排版、下方的演職員名單 (Credits)。氣氛要像好萊塢大片。`;
    } else if (posterType === 'EVENT') {
      styleVariationInstruction = `類型指令: 「活動宣傳海報」。強調活力、日期與地點的排版設計、吸引目光的圖形元素、鮮明的配色。`;
    } else {
      styleVariationInstruction = `類型指令: 「商業產品海報」。強調產品質感、商業攝影打光、奢華感或簡約感、誘人的視覺呈現。`;
    }
  }

  // BUSINESS CARD LOGIC
  if (category.id === StyleCategory.BUSINESS_CARD) {
    if (cardType === 'MINIMALIST') {
      styleVariationInstruction = `風格指令: 「極簡白風格」。大量的留白、無襯線字體、乾淨、現代感、優雅。`;
    } else if (cardType === 'LUXURY') {
      styleVariationInstruction = `風格指令: 「黑金奢華風格」。黑色底、金色字體 (Gold text)、高級質感。`;
    } else {
      styleVariationInstruction = `風格指令: 「創意插畫風格」。多彩的圖形設計、藝術感。`;
    }
    layoutInstruction = `呈現方式: 必須是「平面設計圖 (Flat Design)」。正視圖 (Top-down view)，純白背景 (或符合設計的單色背景)，無透視變形，適合直接印刷的設計稿。禁止出現桌子、手指或任何樣機 (Mockup) 元素。`;
  }

  // LOGO DESIGN LOGIC
  if (category.id === StyleCategory.LOGO_DESIGN) {
    switch (logoStyle) {
      case 'LINE_ART':
        styleVariationInstruction = `風格指令: 「線條藝術」。單色線條、向量風格、乾淨俐落、極簡圖標 (Line Art/Monoline)。`;
        break;
      case 'SKETCH':
        styleVariationInstruction = `風格指令: 「素描風格」。鉛筆筆觸、手繪感、草圖質感、藝術氣息 (Pencil Sketch/Hand drawn)。`;
        break;
      case 'ILLUSTRATION':
        styleVariationInstruction = `風格指令: 「插畫風格」。豐富的細節、數位繪畫質感、鮮明的色彩、商業插畫。`;
        break;
      case 'CARTOON':
        styleVariationInstruction = `風格指令: 「卡通風格」。粗輪廓、誇張比例、美式卡通或動漫感、活潑有趣。`;
        break;
      case '3D':
        styleVariationInstruction = `風格指令: 「3D立體風格」。Blender 渲染、光澤感、立體陰影、現代科技感、蓬鬆材質。`;
        break;
      case 'ARTISTIC':
        styleVariationInstruction = `風格指令: 「藝術風格」。抽象圖形、水彩或油畫質感、獨特的視覺衝擊、創意構圖。`;
        break;
      case 'CUTE':
        styleVariationInstruction = `風格指令: 「可愛風格 (Kawaii)」。圓潤線條、Q版吉祥物、粉嫩色彩、親和力強。`;
        break;
      default:
        styleVariationInstruction = `風格指令: 「簡約向量」。`;
    }
    layoutInstruction = `佈局指令: 主體標誌位於正中央，背景乾淨(通常為白色或單色)，確保Logo清晰可辨。`;
  }

  // ID PHOTO LOGIC
  if (category.id === StyleCategory.ID_PHOTO) {
    const sizeText = idPhotoSize === '1_INCH' ? '1吋 (1 Inch)' : '2吋 (2 Inch Passport Size)';
    if (idPhotoLayout === 'SHEET_8') {
      layoutInstruction = `
      佈局指令: 用戶需要一張「4x6英吋相紙排版 (4x6 photo sheet layout)」。
      1. 畫面必須顯示「8張完全相同」的證件照，排列成整齊的網格 (例如 2x4 或 4x2)。
      2. 每一張小照片都必須符合 ${sizeText} 的頭身比例。
      3. 背景必須是純色 (白色、淺藍或紅色)。
      4. 確保所有照片一致，適合裁切使用。
      `;
    } else {
      layoutInstruction = `
      佈局指令: 用戶需要一張「單張標準證件照 (Single Standard ID Photo)」。
      1. 畫面僅包含一個人的頭像，構圖居中。
      2. 符合 ${sizeText} 的頭身比例 (頭部約佔畫面 70-80%)。
      3. 背景純淨無雜物。
      `;
    }
    styleVariationInstruction = `
    風格指令: 「專業證件照風格」。
    1. 正面視角 (Front view)，雙耳可見，表情自然或微笑(不露齒)。
    2. 攝影棚平面光 (Flat studio lighting)，避免臉部陰影。
    3. 服裝得體專業。
    4. 高解析度，膚質自然真實。
    `;
  }

  // ADVERTISEMENT LOGIC
  if (category.id === StyleCategory.ADVERTISEMENT) {
    let modeInstruction = "";

    // 1. Hand Model Mode
    if (adMode === 'HAND_MODEL') {
      const handText = adHandType === 'MALE_HAND' ? '男性手部 (Male Hand)' : '女性手部 (Female Hand)';
      modeInstruction = `
      拍攝模式: 「手部特寫展示 (Hand Model Closeup)」。
      1. 畫面重點是${handText}優雅地拿著或展示產品。
      2. 膚質必須極度真實細膩 (High-end skincare texture)。
      3. 手勢自然、專業 (Professional hand posing)。
      4. 淺景深 (Depth of field)，背景模糊以突出產品。
      `;
    }
    // 2. Full Model Mode
    else if (adMode === 'FULL_MODEL') {
      let modelText = "";
      const regionText = adRegion === 'ASIAN' ? '亞洲 (Asian)' : '歐洲 (European/Caucasian)';

      switch (adModelType) {
        case 'MALE': modelText = `${regionText} 男性模特兒`; break;
        case 'FEMALE': modelText = `${regionText} 女性模特兒`; break;
        case 'CHILD_BOY': modelText = `${regionText} 男童模特兒`; break;
        case 'CHILD_GIRL': modelText = `${regionText} 女童模特兒`; break;
      }

      modeInstruction = `
      拍攝模式: 「模特兒情境展示 (Fashion/Lifestyle Model)」。
      1. 主角是一位${modelText}。
      2. 模特兒與產品進行互動 (使用中、展示中)。
      3. 服裝與造型必須符合產品調性 (例如高科技產品配現代服飾，保養品配居家或清新服飾)。
      4. 眼神與表情要有商業攝影的質感 (Commercial look)。
      `;
    }
    // 3. Podium Mode
    else if (adMode === 'PODIUM') {
      let podiumText = "";
      switch (adPodiumType) {
        case 'WOODEN': podiumText = "質感木紋展示台 (Wooden Podium)"; break;
        case 'SILK': podiumText = "絲綢布料 (Silk Fabric surface)"; break;
        case 'WHITE_PLATFORM': podiumText = "極簡白色平台 (Minimalist White Platform)"; break;
      }

      modeInstruction = `
      拍攝模式: 「靜物展示台 (Product Podium Shot)」。
      1. 產品置於${podiumText}之上。
      2. 使用專業打光 (Rim lighting, Softbox)。
      3. 構圖講究幾何平衡與空間感。
      4. 背景乾淨高雅，襯托產品價值。
      `;
    }

    styleVariationInstruction = `
    風格指令: 「4K 商業廣告攝影 (Commercial Photography)」。
    ${modeInstruction}
    關鍵字: "Product photography", "High resolution", "Masterpiece", "Ad campaign", "Professional lighting".
    `;
  }

  let ratioDescription = "";
  switch (aspectRatio) {
    case '16:9': ratioDescription = "寬螢幕 (16:9)"; break;
    case '9:16': ratioDescription = "手機全屏直式 (9:16)"; break;
    case '4:3': ratioDescription = "橫式 (4:3)"; break;
    case '3:4': ratioDescription = "直式 (3:4)"; break;
    case '1:1': ratioDescription = "正方形 (1:1)"; break;
  }

  // Construct System Instruction
  let systemInstruction = "";

  // Identify categories where we DO NOT want to enforce "Chinese Text Only" for image generation.
  // The user specifically requested removal for Photorealistic, Cinematic 3D, Digital Art, and Pixel Art.
  const categoriesSkippingTextRule = [
    StyleCategory.PHOTOREALISTIC,
    StyleCategory.CINEMATIC_3D,
    StyleCategory.DIGITAL_ART,
    StyleCategory.PIXEL_ART
  ];
  const includeTextRule = !categoriesSkippingTextRule.includes(category.id);

  if (isCopywriting) {
    // For Copywriting, we do NOT want the image prompt logic.
    systemInstruction = `${category.baseSystemPrompt}
      ${styleVariationInstruction}
      `;
  } else {
    // For Image Generation Categories
    systemInstruction = `${category.baseSystemPrompt}
  
      ${layoutInstruction}
      
      ${styleVariationInstruction}

      構圖比例指令: 此圖像的畫布比例為 ${aspectRatio} (${ratioDescription})。請確保生成的提示詞描述符合此比例的構圖特徵。例如若為 9:16，強調垂直線條與高聳感；若為 16:9，強調廣角與全景感。

      IMPORTANT OUTPUT RULES:
      1. Return ONLY the optimized **Traditional Chinese (繁體中文)** prompt text. 
      2. Do not add explanations or conversational filler.
      3. The prompt should be comma-separated descriptive phrases in Chinese.
      ${includeTextRule ? '4. **CRITICAL**: Include the phrase "文字內容為繁體中文" or "Chinese characters" in the prompt to ensure the image model generates Chinese text where applicable.' : ''}
      5. Translate all technical terms (like 'cinematic lighting', '8k', 'unreal engine') into professional Traditional Chinese terms (e.g., '電影級打光', '8k 解析度', '虛幻引擎渲染').
      ${uploadedFiles.length > 0 ? '6. **CONTEXT ANALYSIS**: Context files are provided. Analyze their content (images, text, or documents) and use them to guide the generation based on the user\'s request below.' : ''}
      `;
  }

  // Construct parts
  const contents: any[] = [];

  // If files provided, add them to request
  if (uploadedFiles.length > 0) {
    try {
      for (const file of uploadedFiles) {
        if (file.type === 'text') {
          // For TXT/CSV, add as text part
          contents.push({
            text: `[Attached File: ${file.name}]\n${file.data}\n[End of File]`
          });
        } else {
          // For Images/PDF/Binary, add as inlineData
          // We clean the base64 string just in case
          contents.push({
            inlineData: {
              mimeType: file.mimeType,
              data: cleanBase64(file.data)
            }
          });
        }
      }
      contents.push({ text: `Reference Context: Please analyze the attached files above and use them to guide the generation based on the user's request below.\n\nUser Input: ${userInput}` });
    } catch (e) {
      console.warn("Failed to process uploaded files", e);
      contents.push({ text: userInput });
    }
  } else {
    contents.push({ text: userInput });
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: contents },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text?.trim() || "生成失敗。";
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    throw error;
  }
};

export const generateImageFromPrompt = async (
  prompt: string,
  aspectRatio: AspectRatioType,
  uploadedFiles: UploadedFile[] = []
): Promise<string> => {
  const ai = getAiClient();
  const modelId = IMAGE_MODEL_ID;

  const parts: any[] = [];

  // If reference images exist, add them to parts
  // Note: For Image Generation model, only Images are typically supported as reference for style/composition.
  // We filter only 'image' type files here.
  const imageFiles = uploadedFiles.filter(f => f.type === 'image');

  if (imageFiles.length > 0) {
    try {
      for (const img of imageFiles) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: cleanBase64(img.data)
          }
        });
      }
    } catch (e) {
      console.error("Invalid reference image data", e);
    }
  }

  // Add text prompt
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      }
    });

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts) throw new Error("No content in response");

    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

/**
 * Analyzes uploaded images and generates a high-quality prompt in Traditional Chinese.
 * Only accepts image files.
 */
export const analyzeImageToPrompt = async (uploadedFiles: UploadedFile[]): Promise<string> => {
  const ai = getAiClient();
  const modelId = TEXT_MODEL_ID;

  const imageFiles = uploadedFiles.filter(f => f.type === 'image');

  if (imageFiles.length === 0) return "未提供圖片檔案 (PDF/Text 無法用於此功能)";

  try {
    const parts: any[] = [];

    for (const img of imageFiles) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: cleanBase64(img.data)
        }
      });
    }

    parts.push({ text: "請分析這些圖片，並產生能生成類似風格圖片的詳細繁體中文提示詞。" });

    const systemInstruction = `
    You are an expert AI art prompt engineer. 
    Your task is to analyze the provided image(s) and write a detailed, high-quality image generation prompt in **Traditional Chinese (繁體中文)** that could be used to recreate this style and content.
    
    1. **Format**: Return ONLY the comma-separated prompt text. No introduction, no markdown code blocks.
    2. **Content to Analyze**:
       - **Subject**: Who or what is in the images?
       - **Style**: What is the art style? (e.g., Japanese Anime, Oil Painting, 3D Render, Photorealistic)
       - **Composition**: Camera angle, framing.
       - **Lighting**: Description of light.
       - **Color Palette**: Dominant colors and mood.
    3. **Language**: Use professional art direction terms in Traditional Chinese.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
      }
    });

    return response.text?.trim() || "無法分析圖片。";

  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};