

export enum StyleCategory {
  MANGA = 'MANGA',
  INSTRUCTION_MANUAL = 'INSTRUCTION_MANUAL',
  POSTER = 'POSTER',
  BUSINESS_CARD = 'BUSINESS_CARD',
  ID_PHOTO = 'ID_PHOTO',
  ADVERTISEMENT = 'ADVERTISEMENT',
  COPYWRITING = 'COPYWRITING',
  PHOTOREALISTIC = 'PHOTOREALISTIC',
  CINEMATIC_3D = 'CINEMATIC_3D',
  DIGITAL_ART = 'DIGITAL_ART',
  LOGO_DESIGN = 'LOGO_DESIGN',
  PIXEL_ART = 'PIXEL_ART',
  LINE_STICKER = 'LINE_STICKER'
}

export type MangaLayoutType = 'SINGLE' | 'FOUR_PANEL' | 'SIX_PANEL' | 'EIGHT_PANEL' | 'TEN_PANEL' | 'COVER';
export type MangaColorMode = 'BW' | 'COLOR';
export type MangaStyleType = 'JAPANESE' | 'WUXIA' | 'AMERICAN' | 'KOREAN' | 'SHOJO' | 'PIXEL' | 'RAW';
export type ManualStyleMode = 'CARTOON' | 'REALISTIC' | 'GUIDE_MAP' | 'INFOGRAPHIC';
export type PosterType = 'MOVIE' | 'EVENT' | 'PRODUCT';
export type CardType = 'MINIMALIST' | 'LUXURY' | 'CREATIVE';
export type LogoStyleType = 'LINE_ART' | 'SKETCH' | 'ILLUSTRATION' | 'CARTOON' | '3D' | 'ARTISTIC' | 'CUTE';
export type IdPhotoLayoutType = 'SINGLE' | 'SHEET_8';
export type IdPhotoSizeType = '1_INCH' | '2_INCH';
export type AspectRatioType = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

// Sticker Types
export type StickerLayoutType = 'SINGLE' | 'SHEET_8' | 'SHEET_16' | 'SHEET_24' | 'SHEET_32' | 'SHEET_40';

// Cinematic 3D Types
export type Cinematic3DStyleType = 'HYPER_REALISTIC' | 'DISNEY' | 'PIXAR' | 'CYBERPUNK' | 'WASTELAND' | 'DARK_FANTASY' | 'SPIDER_VERSE' | 'PAINTERLY' | 'CEL_SHADED';

// Advertisement Types
export type AdMode = 'HAND_MODEL' | 'FULL_MODEL' | 'PODIUM';
export type AdHandType = 'MALE_HAND' | 'FEMALE_HAND';
export type AdModelType = 'MALE' | 'FEMALE' | 'CHILD_BOY' | 'CHILD_GIRL';
export type AdRegion = 'ASIAN' | 'EUROPEAN';
export type AdPodiumType = 'WOODEN' | 'SILK' | 'WHITE_PLATFORM';

// Copywriting Types
export type CopywritingMode = 'SOCIAL_MEDIA' | 'AD_COPY' | 'ARTICLE' | 'QA_HELPER';
export type CopywritingTone = 'PROFESSIONAL' | 'HUMOROUS' | 'EMOTIONAL' | 'DIRECT';

export interface CategoryDetails {
  id: StyleCategory;
  label: string;
  description: string;
  icon: string; // Emoji or simple icon representation
  baseSystemPrompt: string; // The instruction to the LLM on how to format prompts for this style
}

export interface GeneratedData {
  enhancedPrompt: string;
  explanation: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  data: string; // Base64 for binaries, raw text for txt/csv
  type: 'image' | 'document' | 'text'; 
}

export type GenerationStatus = 'idle' | 'enhancing' | 'generating_image' | 'success' | 'error';