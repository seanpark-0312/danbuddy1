"use client";
import type { Profile } from "./types";

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
    return { ...p, id: getSessionId() };
  } catch {
    return null;
  }
}

export function hasSessionProfile(): boolean {
  return !!sessionStorage.getItem(PROFILE_KEY);
}

export function saveProfile(p: Profile) {
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
