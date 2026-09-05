import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PeerMap = Record<string, RTCPeerConnection>;

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

/**
 * WebRTC mesh voice chat between the users currently on mic in a room.
 * Signaling goes through a Supabase realtime broadcast channel.
 */
export function useVoiceRoom(roomId: string, userId: string | undefined, onMic: boolean) {
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<PeerMap>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioEls = useRef<Record<string, HTMLAudioElement>>({});

  const cleanupPeer = useCallback((id: string) => {
    peers.current[id]?.close();
    delete peers.current[id];
    audioEls.current[id]?.remove();
    delete audioEls.current[id];
    setSpeaking((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });
  }, []);

  const stopMic = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    Object.keys(peers.current).forEach(cleanupPeer);
    setMicOn(false);
  }, [cleanupPeer]);

  const createPeer = useCallback(
    (peerId: string, initiator: boolean) => {
      if (peers.current[peerId]) return peers.current[peerId];
      const pc = new RTCPeerConnection(ICE);
      peers.current[peerId] = pc;

      localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          channelRef.current?.send({
            type: "broadcast",
            event: "signal",
            payload: { to: peerId, from: userId, kind: "ice", data: e.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (e) => {
        let el = audioEls.current[peerId];
        if (!el) {
          el = document.createElement("audio");
          el.autoplay = true;
          audioEls.current[peerId] = el;
          document.body.appendChild(el);
        }
        el.srcObject = e.streams[0]!;
        el.play().catch(() => {});
        monitorLevel(e.streams[0]!, peerId);
      };

      if (initiator) {
        pc.onnegotiationneeded = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channelRef.current?.send({
            type: "broadcast",
            event: "signal",
            payload: { to: peerId, from: userId, kind: "offer", data: offer },
          });
        };
      }
      return pc;
    },
    [userId],
  );

  const monitorLevel = useCallback((stream: MediaStream, id: string) => {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setSpeaking((s) => (s[id] === avg > 12 ? s : { ...s, [id]: avg > 12 }));
        raf = requestAnimationFrame(tick);
      };
      tick();
      stream.getTracks()[0]?.addEventListener("ended", () => {
        cancelAnimationFrame(raf);
        ctx.close().catch(() => {});
      });
    } catch {
      /* ignore */
    }
  }, []);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStream.current = stream;
      setMicOn(true);
      if (userId) monitorLevel(stream, userId);
      channelRef.current?.send({
        type: "broadcast",
        event: "voice-join",
        payload: { from: userId },
      });
    } catch {
      setMicOn(false);
    }
  }, [monitorLevel, userId]);

  const toggleMute = useCallback(() => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  useEffect(() => {
    if (!roomId || !userId) return;
    const channel = supabase.channel(`voice:${roomId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "voice-join" }, async ({ payload }) => {
        const from = payload.from as string;
        if (!from || from === userId || !localStream.current) return;
        createPeer(from, true);
      })
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        const { to, from, kind, data } = payload as {
          to: string;
          from: string;
          kind: string;
          data: any;
        };
        if (to !== userId) return;
        const pc = createPeer(from, false);
        if (kind === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "signal",
            payload: { to: from, from: userId, kind: "answer", data: answer },
          });
        } else if (kind === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (kind === "ice") {
          await pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
        }
      })
      .on("broadcast", { event: "voice-leave" }, ({ payload }) => cleanupPeer(payload.from))
      .subscribe();

    return () => {
      channel.send({ type: "broadcast", event: "voice-leave", payload: { from: userId } });
      supabase.removeChannel(channel);
      channelRef.current = null;
      stopMic();
    };
  }, [roomId, userId, createPeer, cleanupPeer, stopMic]);

  useEffect(() => {
    if (onMic && !localStream.current) startMic();
    if (!onMic && localStream.current) {
      channelRef.current?.send({ type: "broadcast", event: "voice-leave", payload: { from: userId } });
      stopMic();
    }
  }, [onMic, startMic, stopMic, userId]);

  return { micOn, speaking, toggleMute };
}
