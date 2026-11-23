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
}

export const AVATARS = ["🐻", "🦊", "🐼", "🐯", "🐰", "🐧", "🦁", "🐨", "🐸", "🐙", "🦄", "🐳"];

export const LEVELS: { key: Level; ko: string; en: string }[] = [
  { key: "none", ko: "못함", en: "None" },
  { key: "basic", ko: "기초", en: "Basic" },
  { key: "conversational", ko: "일상 대화", en: "Conversational" },
  { key: "fluent", ko: "유창함", en: "Fluent" },
  { key: "native", ko: "모국어", en: "Native" },
];

export const INTERESTS: { key: string; ko: string; en: string; icon: string }[] = [
  { key: "kpop", ko: "K-POP", en: "K-pop", icon: "🎤" },
  { key: "drama", ko: "드라마·영화", en: "Dramas & movies", icon: "🎬" },
  { key: "games", ko: "게임", en: "Games", icon: "🎮" },
  { key: "sports", ko: "운동·스포츠", en: "Sports", icon: "⚽" },
  { key: "travel", ko: "여행", en: "Travel", icon: "✈️" },
  { key: "food", ko: "맛집·요리", en: "Food & cooking", icon: "🍜" },
  { key: "music", ko: "음악", en: "Music", icon: "🎧" },
  { key: "study", ko: "공부·스터디", en: "Study groups", icon: "📚" },
  { key: "photo", ko: "사진", en: "Photography", icon: "📷" },
  { key: "fashion", ko: "패션·뷰티", en: "Fashion & beauty", icon: "👗" },
  { key: "tech", ko: "개발·IT", en: "Tech & coding", icon: "💻" },
  { key: "books", ko: "독서", en: "Books", icon: "📖" },
  { key: "anime", ko: "애니·웹툰", en: "Anime & webtoons", icon: "🎨" },
  { key: "cafe", ko: "카페 탐방", en: "Cafe hopping", icon: "☕" },
  { key: "career", ko: "진로·취업", en: "Careers & jobs", icon: "💼" },
  { key: "culture", ko: "전통문화", en: "Traditional culture", icon: "🏯" },
];

export const GOALS: Record<Role, { key: string; ko: string; en: string }[]> = {
  korean: [
    { key: "friend", ko: "외국인 친구 사귀기", en: "Make international friends" },
    { key: "english", ko: "영어 회화 연습", en: "Practice English conversation" },
    { key: "culture", ko: "다른 나라 문화 알기", en: "Learn about other cultures" },
    { key: "help", ko: "유학생 적응 도와주기", en: "Help international students settle in" },
    { key: "abroad", ko: "교환학생·해외 정보", en: "Info on exchange & studying abroad" },
  ],
  international: [
    { key: "friend", ko: "한국인 친구 사귀기", en: "Make Korean friends" },
    { key: "korean", ko: "한국어 연습", en: "Practice Korean" },
    { key: "school", ko: "수강신청·학교생활 도움", en: "Help with classes & campus life" },
    { key: "life", ko: "한국 생활 정보 (은행, 병원, 집)", en: "Daily life in Korea (bank, clinic, housing)" },
    { key: "culture", ko: "한국 문화 체험", en: "Experience Korean culture" },
  ],
};
