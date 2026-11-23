"use client";
import type { ChatMessage, Friend, Profile } from "./types";

const PROFILE_KEY = "danbuddy.profile";
const SESSION_ID_KEY = "danbuddy.sessionId";
const BLOCK_KEY = "danbuddy.blocked";

/** Each browser tab gets its own id, so two tabs can chat with each other in a demo. */
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export function loadProfile(): Profile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY) ?? localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    return { ...p, id: getSessionId(), uid: p.uid ?? newUid() };
  } catch {
    return null;
  }
}

export function hasSessionProfile(): boolean {
  return !!sessionStorage.getItem(PROFILE_KEY);
}

function newUid() {
  return "u-" + crypto.randomUUID().slice(0, 12);
}

export function saveProfile(p: Profile) {
  // A new tab that sets up a different person (another name) is a different user, so it gets its own id.
  let uid = p.uid;
  if (!hasSessionProfile()) {
    try {
      const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Profile | null;
      if (stored && stored.nickname !== p.nickname) uid = undefined;
      else uid = uid ?? stored?.uid;
    } catch {}
  }
  p = { ...p, uid: uid ?? newUid() };
  const json = JSON.stringify(p);
  sessionStorage.setItem(PROFILE_KEY, json);
  try {
    localStorage.setItem(PROFILE_KEY, json);
  } catch {}
}

export function getBlocked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BLOCK_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function block(id: string) {
  const list = new Set(getBlocked());
  list.add(id);
  localStorage.setItem(BLOCK_KEY, JSON.stringify([...list]));
}

export function setPartner(roomId: string, partner: Profile) {
  sessionStorage.setItem(`danbuddy.partner.${roomId}`, JSON.stringify(partner));
}

export function getPartner(roomId: string): Profile | null {
  try {
    const raw = sessionStorage.getItem(`danbuddy.partner.${roomId}`);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

/* ---------- friends (kept in this browser only) ---------- */

const friendsKey = (uid: string) => `danbuddy.friends.${uid}`;

export function getFriends(myUid: string | undefined): Friend[] {
  if (!myUid) return [];
  try {
    return JSON.parse(localStorage.getItem(friendsKey(myUid)) ?? "[]");
  } catch {
    return [];
  }
}

export function friendKey(p: Profile): string {
  return p.uid ?? p.id;
}

export function isFriend(myUid: string | undefined, p: Profile | null): boolean {
  return !!p && getFriends(myUid).some((f) => f.uid === friendKey(p));
}

export function addFriend(myUid: string | undefined, p: Profile, ai = false) {
  if (!myUid) return;
  const uid = friendKey(p);
  const list = getFriends(myUid).filter((f) => f.uid !== uid);
  list.unshift({ uid, profile: p, since: Date.now(), ...(ai ? { ai: true } : {}) });
  try {
    localStorage.setItem(friendsKey(myUid), JSON.stringify(list.slice(0, 100)));
  } catch {}
}

export function removeFriend(myUid: string | undefined, uid: string) {
  if (!myUid) return;
  try {
    localStorage.setItem(friendsKey(myUid), JSON.stringify(getFriends(myUid).filter((f) => f.uid !== uid)));
  } catch {}
}

/* ---------- chat log (this tab only, cleared when you leave the room) ---------- */

const logKey = (roomId: string) => `danbuddy.log.${roomId}`;

export function loadLog(roomId: string): ChatMessage[] {
  try {
    return JSON.parse(sessionStorage.getItem(logKey(roomId)) ?? "[]");
  } catch {
    return [];
  }
}

export function saveLog(roomId: string, messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(logKey(roomId), JSON.stringify(messages));
  } catch {
    // storage full (photos are large): keep the text and drop the oldest photos
    try {
      sessionStorage.setItem(
        logKey(roomId),
        JSON.stringify(messages.map((m, i) => (m.image && i < messages.length - 3 ? { ...m, image: undefined, text: m.text || "📷" } : m))),
      );
    } catch {}
  }
}

export function clearLog(roomId: string) {
  try {
    sessionStorage.removeItem(logKey(roomId));
  } catch {}
}
