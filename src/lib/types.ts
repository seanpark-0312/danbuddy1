export type Role = "korean" | "international";
export type Level = "none" | "basic" | "conversational" | "fluent" | "native";

export interface Profile {
  id: string;
  nickname: string;
  avatar: string;
  role: Role;
  country: string;
  major: string;
  koreanLevel: Level;
  englishLevel: Level;
  interests: string[];
  goals: string[];
  intro: string;
}

export interface ChatMessage {
  id: string;
  from: string; // profile id, or "system"
  text: string;
  ts: number;
  image?: string; // JPEG data URL, sent peer to peer and never stored
}

export const AVATARS = ["🐻", "🦊", "🐼", "🐯", "🐰", "🐧", "🦁", "🐨", "🐸", "🐙", "🦄", "🐳"];

export const LEVELS: { key: Level; ko: string; en: string; ja: string; zh: string }[] = [
  { key: "none", ko: "못함", en: "None", ja: "できない", zh: "不会" },
  { key: "basic", ko: "기초", en: "Basic", ja: "初級", zh: "基础" },
  { key: "conversational", ko: "일상 대화", en: "Conversational", ja: "日常会話", zh: "日常会话" },
  { key: "fluent", ko: "유창함", en: "Fluent", ja: "流暢", zh: "流利" },
  { key: "native", ko: "모국어", en: "Native", ja: "母語", zh: "母语" },
];

export const INTERESTS: { key: string; ko: string; en: string; ja: string; zh: string; icon: string }[] = [
  { key: "kpop", ko: "K-POP", en: "K-pop", ja: "K-POP", zh: "K-POP", icon: "🎤" },
  { key: "drama", ko: "드라마·영화", en: "Dramas & movies", ja: "ドラマ・映画", zh: "电视剧·电影", icon: "🎬" },
  { key: "games", ko: "게임", en: "Games", ja: "ゲーム", zh: "游戏", icon: "🎮" },
  { key: "sports", ko: "운동·스포츠", en: "Sports", ja: "運動・スポーツ", zh: "运动·体育", icon: "⚽" },
  { key: "travel", ko: "여행", en: "Travel", ja: "旅行", zh: "旅行", icon: "✈️" },
  { key: "food", ko: "맛집·요리", en: "Food & cooking", ja: "グルメ・料理", zh: "美食·烹饪", icon: "🍜" },
  { key: "music", ko: "음악", en: "Music", ja: "音楽", zh: "音乐", icon: "🎧" },
  { key: "study", ko: "공부·스터디", en: "Study groups", ja: "勉強・スタディ", zh: "学习·学习小组", icon: "📚" },
  { key: "photo", ko: "사진", en: "Photography", ja: "写真", zh: "摄影", icon: "📷" },
  { key: "fashion", ko: "패션·뷰티", en: "Fashion & beauty", ja: "ファッション・美容", zh: "时尚·美妆", icon: "👗" },
  { key: "tech", ko: "개발·IT", en: "Tech & coding", ja: "開発・IT", zh: "开发·IT", icon: "💻" },
  { key: "books", ko: "독서", en: "Books", ja: "読書", zh: "读书", icon: "📖" },
  { key: "anime", ko: "애니·웹툰", en: "Anime & webtoons", ja: "アニメ・ウェブトゥーン", zh: "动漫·网络漫画", icon: "🎨" },
  { key: "cafe", ko: "카페 탐방", en: "Cafe hopping", ja: "カフェ巡り", zh: "探店咖啡馆", icon: "☕" },
  { key: "career", ko: "진로·취업", en: "Careers & jobs", ja: "進路・就職", zh: "职业·就业", icon: "💼" },
  { key: "culture", ko: "전통문화", en: "Traditional culture", ja: "伝統文化", zh: "传统文化", icon: "🏯" },
];

export const GOALS: Record<Role, { key: string; ko: string; en: string; ja: string; zh: string }[]> = {
  korean: [
    { key: "friend", ko: "외국인 친구 사귀기", en: "Make international friends", ja: "外国人の友だちを作る", zh: "结交外国朋友" },
    { key: "english", ko: "영어 회화 연습", en: "Practice English conversation", ja: "英会話の練習", zh: "练习英语会话" },
    { key: "culture", ko: "다른 나라 문화 알기", en: "Learn about other cultures", ja: "他の国の文化を知る", zh: "了解其他国家的文化" },
    { key: "help", ko: "유학생 적응 도와주기", en: "Help international students settle in", ja: "留学生の生活をサポートする", zh: "帮助留学生适应" },
    { key: "abroad", ko: "교환학생·해외 정보", en: "Info on exchange & studying abroad", ja: "交換留学・海外の情報", zh: "交换生·海外信息" },
  ],
  international: [
    { key: "friend", ko: "한국인 친구 사귀기", en: "Make Korean friends", ja: "韓国人の友だちを作る", zh: "结交韩国朋友" },
    { key: "korean", ko: "한국어 연습", en: "Practice Korean", ja: "韓国語の練習", zh: "练习韩语" },
    { key: "school", ko: "수강신청·학교생활 도움", en: "Help with classes & campus life", ja: "履修登録・学校生活のサポート", zh: "选课·校园生活帮助" },
    { key: "life", ko: "한국 생활 정보 (은행, 병원, 집)", en: "Daily life in Korea (bank, clinic, housing)", ja: "韓国生活の情報（銀行・病院・住まい）", zh: "韩国生活信息（银行、医院、住房）" },
    { key: "culture", ko: "한국 문화 체험", en: "Experience Korean culture", ja: "韓国文化の体験", zh: "体验韩国文化" },
  ],
};
