"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RTChannel } from "./realtime";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type VideoState = "off" | "requesting" | "incoming" | "connecting" | "on";

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn.split(","),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

/**
 * Consent-based video call over WebRTC. Signalling (offer/answer/ICE) travels over the
 * same realtime room channel as the chat. Video starts only after the other side accepts.
 */
export function useVideoCall(channel: RTChannel | null, myId: string, onSystem: (key: string) => void) {
  const [state, setState] = useState<VideoState>("off");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sysRef = useRef(onSystem);
  sysRef.current = onSystem;

  const send = useCallback((event: string, payload: any = {}) => channel?.send(event, { ...payload, from: myId }), [channel, myId]);

  const cleanup = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    pendingIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMicOn(true);
    setCamOn(true);
    setState("off");
  }, []);

  const startMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
    local.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeer = useCallback(
    (stream: MediaStream) => {
      const peer = new RTCPeerConnection({ iceServers: iceServers() });
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      peer.onicecandidate = (e) => {
        if (e.candidate) send("rtc", { kind: "ice", data: e.candidate.toJSON() });
      };
      peer.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        setState("on");
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          sysRef.current("video-failed");
          send("video-end");
          cleanup();
        }
      };
      pc.current = peer;
      return peer;
    },
    [send, cleanup],
  );

  const flushIce = useCallback(async () => {
    for (const c of pendingIce.current) await pc.current?.addIceCandidate(c).catch(() => {});
    pendingIce.current = [];
  }, []);

  useEffect(() => {
    if (!channel) return;
    channel.on("video-request", (m) => {
      if (m.from === myId) return;
      if (stateRef.current === "off") setState("incoming");
    });
    channel.on("video-decline", (m) => {
      if (m.from === myId) return;
      sysRef.current("video-declined");
      cleanup();
    });
    channel.on("video-end", (m) => {
      if (m.from === myId) return;
      if (stateRef.current !== "off") sysRef.current("video-ended");
      cleanup();
    });
    channel.on("video-cancel", (m) => {
      if (m.from === myId) return;
      cleanup();
    });
    channel.on("video-accept", async (m) => {
      if (m.from === myId || stateRef.current !== "requesting") return;
      setState("connecting");
      try {
        const stream = local.current ?? (await startMedia());
        const peer = createPeer(stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        send("rtc", { kind: "offer", data: offer });
      } catch {
        sysRef.current("camera-error");
        send("video-end");
        cleanup();
      }
    });
    channel.on("rtc", async (m) => {
      if (m.from === myId) return;
      const peer = pc.current;
      if (!peer) return;
      if (m.kind === "offer") {
        await peer.setRemoteDescription(m.data);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        send("rtc", { kind: "answer", data: answer });
        await flushIce();
      } else if (m.kind === "answer") {
        await peer.setRemoteDescription(m.data);
        await flushIce();
      } else if (m.kind === "ice") {
        if (peer.remoteDescription) await peer.addIceCandidate(m.data).catch(() => {});
        else pendingIce.current.push(m.data);
      }
    });
    return cleanup;
  }, [channel, myId, cleanup, createPeer, flushIce, send, startMedia]);

  return {
    state,
    localStream,
    remoteStream,
    micOn,
    camOn,
    request: () => {
      setState("requesting");
      send("video-request");
    },
    cancel: () => {
      send("video-cancel");
      cleanup();
    },
    accept: async () => {
      setState("connecting");
      try {
        const stream = await startMedia();
        createPeer(stream);
        send("video-accept");
      } catch {
        sysRef.current("camera-error");
        send("video-decline");
        cleanup();
      }
    },
    decline: () => {
      send("video-decline");
      setState("off");
    },
    end: () => {
      send("video-end");
      cleanup();
    },
    toggleMic: () => {
      local.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setMicOn((v) => !v);
    },
    toggleCam: () => {
      local.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setCamOn((v) => !v);
    },
  };
}
