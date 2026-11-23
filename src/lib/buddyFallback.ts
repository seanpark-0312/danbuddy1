import { AI_BUDDIES, type BuddyKey } from "./aiBuddies";

// Prepared replies for the AI practice buddy, used when the AI API is not configured,
// over its free quota, or fails. The user's last message is matched to a topic by keywords.

interface Intent {
  keys: RegExp;
  emma: string[];
  minjun: { ko: string[]; en: string[] };
}

const INTENTS: Intent[] = [
  {
    keys: /\(added you as a friend\)/i,
    emma: ["Yay, we're friends now! 🥰 친구! Let's keep chatting, okay?", "Oh this makes me so happy! 친구 ☺️ Text me anytime!"],
    minjun: { ko: ["와, 친구 추가 고마워요! 🙌 앞으로 자주 얘기해요!"], en: ["Thanks for the friend add! 🙌 Let's talk often!"] },
  },
  {
    keys: /\(sent a photo\)/i,
    emma: ["Wow, nice photo! 📸 Where did you take this?", "Oh I love this! 😍 Is this near campus?"],
    minjun: { ko: ["오 사진 좋네요! 📸 어디서 찍었어요?"], en: ["Nice photo! 📸 Where was this taken?"] },
  },
  {
    keys: /\b(bye|see you|good night|gotta go)\b|잘\s?가|다음에|안녕히|들어가|잘\s?자/i,
    emma: ["It was so nice talking to you! 다음에 또 봐요 👋", "Bye bye! Let's grab a coffee on campus sometime ☕"],
    minjun: { ko: ["오늘 얘기 즐거웠어요! 다음에 또 봐요 👋"], en: ["Great talking to you! See you around campus 👋"] },
  },
  {
    keys: /\b(thank|thanks|thx)\b|고마|감사/i,
    emma: ["No, thank YOU! You're really helping me get used to Korea 🙏", "Merci! 고마워요! You're the best buddy 😊"],
    minjun: { ko: ["별말씀을요! 궁금한 거 있으면 언제든 물어보세요 😊"], en: ["No problem at all! Ask me anything anytime 😊"] },
  },
  {
    keys: /\b(camera|video|see you now|your face)\b|카메라|화상|얼굴/i,
    emma: ["Oh hi! 👋 So nice to finally see you! Is it late where you are, or are you on campus?"],
    minjun: { ko: ["오, 안녕하세요! 👋 얼굴 보니까 반가워요! 지금 학교예요?"], en: ["Oh hi! 👋 Nice to see you! Are you on campus right now?"] },
  },
  {
    keys: /where.*from|which country|your country|hometown|어디(서|에서)?\s?(왔|오셨|출신)|나라|고향|france|프랑스|lyon|리옹/i,
    emma: [
      "I'm from Lyon, France 🇫🇷 It's famous for food, haha. Have you ever been to France?",
      "Lyon! It's the second… or third biggest city in France 😄 What about you, are you from Yongin or Seoul?",
    ],
    minjun: { ko: ["저는 용인 토박이예요! 죽전 캠퍼스가 집이랑 가까워요. 어디서 왔어요?"], en: ["I'm from Yongin, right near the Jukjeon campus! Where are you from?"] },
  },
  {
    keys: /\b(major|study|studying|class|course)\b|전공|공부|수업|학과/i,
    emma: [
      "I study business! This semester I take marketing and a Korean language class. 한국어 너무 어려워요 😅 What's your major?",
      "Business administration. My team project is all in Korean… wish me luck 😂 What do you study?",
    ],
    minjun: { ko: ["소프트웨어학과예요! 요즘 팀 프로젝트 때문에 바빠요 😅 전공이 뭐예요?"], en: ["I study software engineering! Busy with team projects these days 😅 What's your major?"] },
  },
  {
    keys: /\b(food|eat|lunch|dinner|restaurant|hungry|tteokbokki|bibimbap|kimchi|bbq)\b|음식|먹|맛집|밥|점심|저녁|떡볶이|치킨|삼겹살/i,
    emma: [
      "Korean food is my favorite part of Korea 😋 I'm obsessed with tteokbokki! Any good 맛집 near Jukjeon?",
      "I tried 삼겹살 last week for the first time… amazing! What should I try next?",
    ],
    minjun: { ko: ["정문 앞 칼국수집 진짜 맛있어요! 매운 음식 잘 먹어요? 🌶️"], en: ["The kalguksu place by the main gate is so good! Can you handle spicy food? 🌶️"] },
  },
  {
    keys: /\b(drama|kdrama|k-drama|movie|netflix|series|actor)\b|드라마|영화|넷플|배우/i,
    emma: [
      "I'm watching a K-drama right now and I cry every episode 😭 Do you have a favorite drama?",
      "K-dramas are how I started learning Korean! 사랑해요 was my first word 😂 What do you watch?",
    ],
    minjun: { ko: ["요즘은 넷플릭스로 예능 많이 봐요 😆 좋아하는 드라마 있어요?"], en: ["I mostly watch variety shows on Netflix 😆 Any favorite K-dramas?"] },
  },
  {
    keys: /\b(cafe|coffee|latte|dessert)\b|카페|커피|라떼|디저트/i,
    emma: ["I love cafe hopping ☕ Korean cafes are so pretty! Do you know a cute one near campus?"],
    minjun: { ko: ["학교 근처에 조용한 카페 하나 알아요 ☕ 다음에 같이 가요!"], en: ["I know a quiet cafe near campus ☕ Let's go together sometime!"] },
  },
  {
    keys: /\b(weekend|saturday|sunday|free time|plan)\b|주말|토요일|일요일|계획|시간\s?있/i,
    emma: ["This weekend I want to go hiking near Seoul 🥾 Do you have plans? Maybe you can recommend a place!"],
    minjun: { ko: ["이번 주말엔 친구들이랑 PC방 가려고요 🎮 주말에 뭐 해요?"], en: ["Going to a PC bang with friends this weekend 🎮 What about you?"] },
  },
  {
    keys: /\b(korean language|hangul|learn korean|speak korean)\b|한국어|한글|한국말/i,
    emma: [
      "My Korean is still 기초 level 😅 Can you teach me one useful expression for campus?",
      "Hangul is easy to read, but speaking fast is so hard! How do you say 'see you later' casually?",
    ],
    minjun: { ko: ["한국어 정말 잘하시네요! 헷갈리는 표현 있으면 물어보세요 😊"], en: ["Want to practice Korean? I can help with any expression 😊"] },
  },
  {
    keys: /\b(english)\b|영어/i,
    emma: ["Your English is good! Don't worry about mistakes, I make many in Korean too 😄 Want to practice together?"],
    minjun: { ko: ["저도 영어 연습하고 싶어요! 영어로 얘기해 볼까요? 😄"], en: ["I want to practice English too! Let's keep chatting in English 😄"] },
  },
  {
    keys: /\b(difficult|hard|help|problem|bank|hospital|clinic|visa|arc|delivery|phone)\b|힘들|어려|도움|도와|은행|병원|비자|외국인등록|배달|폰/i,
    emma: [
      "Honestly, ordering 배달 on the app is so hard for me 😭 Everything is in Korean! Could you help me sometime?",
      "Opening a bank account took me 3 tries 😂 What was hard for you when you started university?",
    ],
    minjun: { ko: ["그거 처음엔 헷갈리죠! 제가 순서대로 알려 드릴게요. 어떤 게 제일 어려워요?"], en: ["That's confusing at first! I can walk you through it. What's the hardest part?"] },
  },
  {
    keys: /\b(campus|school|library|dorm|shuttle|dankook|jukjeon)\b|학교|캠퍼스|도서관|기숙사|셔틀|단국|죽전/i,
    emma: ["Jukjeon campus is so big, I got lost twice 😅 Where is your favorite spot on campus?"],
    minjun: { ko: ["도서관 4층이 제일 조용해요 📚 기숙사 살아요?"], en: ["The 4th floor of the library is the quietest 📚 Do you live in the dorm?"] },
  },
  {
    keys: /\b(hobby|hobbies|like to do|music|kpop|k-pop|game|sport|travel)\b|취미|음악|케이팝|게임|운동|여행/i,
    emma: ["I like K-pop, hiking and taking photos 📸 What do you do for fun?", "I want to travel to Busan and Jeju before I go back to France ✈️ Any tips?"],
    minjun: { ko: ["저는 게임이랑 노래방 좋아해요 🎤 취미가 뭐예요?"], en: ["I love games and karaoke 🎤 What are your hobbies?"] },
  },
  {
    keys: /\b(name)\b|이름/i,
    emma: ["I'm Emma! 엠마예요 😊 And your name? How do I say it correctly?"],
    minjun: { ko: ["민준이에요! 편하게 불러 주세요 😊"], en: ["I'm Minjun! Nice to meet you 😊"] },
  },
  {
    keys: /\b(hi|hello|hey|bonjour|nice to meet)\b|안녕|반가|처음\s?뵙/i,
    emma: ["Hi! 안녕하세요 😊 I'm Emma, an exchange student from France. How is your day going?"],
    minjun: { ko: ["안녕하세요! 반가워요 😊 오늘 하루 어땠어요?"], en: ["Hi! Nice to meet you 😊 How's your day going?"] },
  },
];

const DEFAULTS = {
  emma: [
    "Oh, interesting! Tell me more 😊",
    "Haha I see! In France it's a bit different. What do Korean students usually do?",
    "That's so cool! Can I ask you something about Korean culture?",
    "Wait, I didn't know that! 진짜요? 😮",
  ],
  minjun: {
    ko: ["오, 그렇군요! 더 얘기해 주세요 😊", "재밌네요 ㅎㅎ 학교생활은 어때요?", "진짜요? 저도 궁금했어요!"],
    en: ["Oh, interesting! Tell me more 😊", "Haha nice! How's campus life going?", "Really? I was curious about that too!"],
  },
};

// Yuki and Sofía have their own lines for who they are; otherwise they reuse Emma's lines
// with the country swapped (see AI_BUDDIES[...].swap).
const OWN: Partial<Record<BuddyKey, { keys: RegExp; lines: string[] }[]>> = {
  yuki: [
    { keys: /where.*from|which country|your country|hometown|어디(서|에서)?\s?(왔|오셨|출신)|나라|고향|japan|일본|tokyo|도쿄/i, lines: ["도쿄에서 왔어요 🇯🇵 시부야 근처예요! 일본 가 본 적 있어요?"] },
    { keys: /\b(major|study|studying|class|course)\b|전공|공부|수업|학과/i, lines: ["미디어커뮤니케이션 전공이에요 📸 요즘 영상 과제 때문에 바빠요. 전공이 뭐예요?"] },
    { keys: /\b(name)\b|이름/i, lines: ["유키예요! ゆき = 눈(snow)이라는 뜻이에요 ❄️ 이름이 뭐예요?"] },
    { keys: /\b(hi|hello|hey|nice to meet)\b|안녕|반가|처음\s?뵙|こんにちは/i, lines: ["안녕하세요! 저는 유키예요 😊 도쿄에서 온 교환학생이에요. 오늘 하루 어땠어요?"] },
    { keys: /\b(camera|video|your face)\b|카메라|화상|얼굴/i, lines: ["와, 안녕하세요! 👋 얼굴 보니까 반가워요! すごい, 화상 처음이라 떨려요 😆"] },
    { keys: /\(added you as a friend\)/i, lines: ["와 친구 추가 고마워요! 🥰 ありがとう! 앞으로 자주 얘기해요!"] },
  ],
  sofia: [
    { keys: /where.*from|which country|your country|hometown|어디(서|에서)?\s?(왔|오셨|출신)|나라|고향|spain|스페인|madrid|마드리드/i, lines: ["I'm from Madrid, Spain 🇪🇸 Have you ever been to Spain? The food is amazing!"] },
    { keys: /\b(major|study|studying|class|course)\b|전공|공부|수업|학과/i, lines: ["I study international relations 🌍 This semester I also take Korean 101… 어려워요 😅 What's your major?"] },
    { keys: /\b(name)\b|이름/i, lines: ["I'm Sofía! 소피아예요 😊 What's your name?"] },
    { keys: /\b(hi|hello|hey|hola|nice to meet)\b|안녕|반가|처음\s?뵙/i, lines: ["¡Hola! 안녕하세요 😊 I'm Sofía, an exchange student from Madrid. How's your day going?"] },
    { keys: /\b(camera|video|your face)\b|카메라|화상|얼굴/i, lines: ["¡Hola! 👋 So nice to see you! Are you on campus right now?"] },
    { keys: /\b(sport|football|soccer|gym)\b|축구|운동|헬스/i, lines: ["Football is my life ⚽ ¡Hala Madrid! Do you play any sports?"] },
    { keys: /\(added you as a friend\)/i, lines: ["¡Qué bien! We're friends now 🥳 친구! Let's grab 삼겹살 sometime!"] },
  ],
};

export function fallbackReply(bot: BuddyKey, userText: string, turn: number): string {
  const intent = INTENTS.find((i) => i.keys.test(userText));
  const hangul = /[가-힣]/.test(userText);
  const pick = <T,>(list: T[]) => list[turn % list.length];
  const own = OWN[bot]?.find((o) => o.keys.test(userText));
  if (own) return pick(own.lines);
  if (bot !== "minjun") {
    let line = pick(intent?.emma ?? DEFAULTS.emma);
    for (const [from, to] of AI_BUDDIES[bot].swap ?? []) line = line.replace(from, to);
    return line;
  }
  const set = intent?.minjun ?? DEFAULTS.minjun;
  return pick(hangul ? set.ko : set.en);
}
