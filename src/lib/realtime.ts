"use client";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (payload: any) => void;

/**
 * A small realtime channel: broadcast events + presence.
 * With Supabase env vars set, it runs over Supabase Realtime (works across devices).
 * Without them it falls back to a BroadcastChannel "demo mode" that connects tabs
 * of the same browser, so the app can be tried with no backend at all.
 */
export interface RTChannel {
  on(event: string, cb: Handler): void;
  onPresence(cb: (states: any[]) => void): void;
  subscribe(): Promise<void>;
  send(event: string, payload: any): void;
  track(state: any): void;
  close(): void;
}

let supabase: SupabaseClient | null | undefined;
function getSupabase() {
  if (supabase !== undefined) return supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return supabase;
}

export function isDemoMode() {
  return !getSupabase();
}

export function openChannel(name: string, selfKey: string): RTChannel {
  const sb = getSupabase();
  return sb ? new SupabaseRT(sb, name, selfKey) : new LocalRT(name, selfKey);
}

class SupabaseRT implements RTChannel {
  private ch: RealtimeChannel;
  private ready = false;
  private pendingTrack: any = null;
  private presenceCb: ((s: any[]) => void) | null = null;

  constructor(private sb: SupabaseClient, name: string, selfKey: string) {
    this.ch = sb.channel(name, {
      config: { broadcast: { self: false }, presence: { key: selfKey } },
    });
  }
  on(event: string, cb: Handler) {
    this.ch.on("broadcast", { event }, ({ payload }) => cb(payload));
  }
  onPresence(cb: (states: any[]) => void) {
    this.presenceCb = cb;
    this.ch.on("presence", { event: "sync" }, () => {
      const state = this.ch.presenceState();
      const list = Object.values(state).map((arr: any) => arr[arr.length - 1]);
      this.presenceCb?.(list);
    });
  }
  subscribe() {
    return new Promise<void>((resolve) => {
      this.ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.ready = true;
          if (this.pendingTrack) this.ch.track(this.pendingTrack);
          resolve();
        }
      });
    });
  }
  send(event: string, payload: any) {
    this.ch.send({ type: "broadcast", event, payload });
  }
  track(state: any) {
    this.pendingTrack = state;
    if (this.ready) this.ch.track(state);
  }
  close() {
    this.sb.removeChannel(this.ch);
  }
}

const HEARTBEAT_MS = 1500;
const STALE_MS = 5000;

class LocalRT implements RTChannel {
  private bc: BroadcastChannel;
  private handlers = new Map<string, Handler[]>();
  private presenceCb: ((s: any[]) => void) | null = null;
  private peers = new Map<string, { state: any; ts: number }>();
  private myState: any = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(name: string, private selfKey: string) {
    this.bc = new BroadcastChannel(`danbuddy:${name}`);
    this.bc.onmessage = (e) => this.receive(e.data);
  }
  private receive(msg: any) {
    if (!msg || msg.key === this.selfKey) return;
    if (msg.kind === "event") {
      for (const h of this.handlers.get(msg.event) ?? []) h(msg.payload);
    } else if (msg.kind === "presence") {
      const isNew = !this.peers.has(msg.key);
      this.peers.set(msg.key, { state: msg.state, ts: Date.now() });
      if (isNew && this.myState) this.post({ kind: "presence", state: this.myState });
      this.emitPresence();
    } else if (msg.kind === "leave") {
      if (this.peers.delete(msg.key)) this.emitPresence();
    }
  }
  private post(msg: any) {
    this.bc.postMessage({ ...msg, key: this.selfKey });
  }
  private emitPresence() {
    const list = [...this.peers.values()].map((p) => p.state);
    if (this.myState) list.push(this.myState);
    this.presenceCb?.(list);
  }
  on(event: string, cb: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), cb]);
  }
  onPresence(cb: (states: any[]) => void) {
    this.presenceCb = cb;
  }
  async subscribe() {
    this.timer = setInterval(() => {
      if (this.myState) this.post({ kind: "presence", state: this.myState });
      let changed = false;
      for (const [k, p] of this.peers) {
        if (Date.now() - p.ts > STALE_MS) {
          this.peers.delete(k);
          changed = true;
        }
      }
      if (changed) this.emitPresence();
    }, HEARTBEAT_MS);
  }
  send(event: string, payload: any) {
    this.post({ kind: "event", event, payload });
  }
  track(state: any) {
    this.myState = state;
    this.post({ kind: "presence", state });
    this.emitPresence();
  }
  close() {
    if (this.timer) clearInterval(this.timer);
    this.post({ kind: "leave" });
    this.bc.close();
  }
}
