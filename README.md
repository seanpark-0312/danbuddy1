# DanBuddy 단버디

단국대 유학생과 한국 학생을 AI로 이어 주는 1:1 버디 매칭 웹앱 (2026 CTL Championship ⑤ 글로벌 출품작).

## 기능
- **화면 언어**: 한국어·English·日本語·中文 (AI 번역·주제 추천도 선택 언어로)
- **프로필**: 한국 학생 / 유학생, 국가, 언어 수준, 관심사, 원하는 도움 (브라우저에만 저장)
- **로비**: 접속 중인 버디를 궁합 점수 순으로 표시, **AI 추천 이유**와 첫 마디 제안
- **매칭**: 원하는 상대에게 대화 신청(수락/거절) 또는 **랜덤 매칭**(한국 학생 ↔ 유학생 우선)
- **1:1 채팅**: 입력 중 표시, 메시지별 **AI 번역 + 표현 팁**, 내 글을 상대 언어로 **바꿔 쓰기**, **AI 대화 주제 추천**
- **화상 전환**: 한쪽이 요청하고 상대가 수락할 때만 WebRTC 화상 연결, 마이크/카메라 끄기, 언제든 텍스트로 복귀
- **안전**: 대화 서버 미저장, 신고·차단, 검색엔진 노출 차단(noindex)
- **AI 연습 버디**: 접속자가 없을 때 AI(Emma / 민준)와 대화 연습

## 구조
- Next.js 15 (App Router) + Tailwind CSS 4
- 실시간: Supabase Realtime (broadcast + presence). 환경변수가 없으면 같은 브라우저의 탭끼리 연결되는 **데모 모드**(BroadcastChannel)로 동작
- 화상: WebRTC (P2P, STUN 기본, TURN 선택)
- AI: Claude API (`/api/ai/*`)

## 로컬 실행
```bash
npm install
cp .env.example .env.local   # 값은 비워 둬도 데모 모드로 실행됨
npm run dev
```
브라우저 창 두 개에서 각각 한국 학생 / 유학생 프로필을 만들면 서로 매칭됩니다.

## 심사용 배포 (Vercel + Supabase, 모두 무료 요금제)
1. **Supabase**: supabase.com에서 새 프로젝트 생성 → Project Settings → API에서 `Project URL`과 `anon public` 키 복사. (테이블 생성 불필요, Realtime은 기본 활성화)
2. **Claude API 키**: console.anthropic.com → API Keys에서 발급
3. **Vercel**: GitHub 저장소를 Import → Environment Variables에 아래 입력 후 Deploy
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (나중에 넣어도 됨. 넣은 뒤 Redeploy)
4. 배포된 `https://<프로젝트>.vercel.app` 주소를 제출

학교·회사 네트워크처럼 P2P가 막힌 환경에서 화상이 연결되지 않으면 TURN 서버(예: Metered 무료 요금제)를 `NEXT_PUBLIC_TURN_*`에 넣어 주세요.
