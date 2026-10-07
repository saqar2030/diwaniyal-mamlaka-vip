import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PeerMap = Record<string, RTCPeerConnection>;

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
    { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" },
  ],
};

/**
 * WebRTC mesh voice chat between the users currently on mic in a room.
 * Signaling goes through a Supabase realtime broadcast channel.
 */
export function useVoiceRoom(roomId: string, userId: string | undefined, onMic: boolean) {
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [camOn, setCamOn] = useState(false);
  const [videos, setVideos] = useState<Record<string, MediaStream>>({});
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<PeerMap>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioEls = useRef<Record<string, HTMLAudioElement>>({});

  const cleanupPeer = useCallback((id: string) => {
    peers.current[id]?.close();
    delete peers.current[id];
    audioEls.current[id]?.remove();
    delete audioEls.current[id];
    setVideos((v) => { const n = { ...v }; delete n[id]; return n; });
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
    setCamOn(false);
    setVideos({});
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
        const stream = e.streams[0]!;
        if (e.track.kind === "video") {
          setVideos((v) => ({ ...v, [peerId]: stream }));
          e.track.addEventListener("ended", () => setVideos((v) => { const n = { ...v }; delete n[peerId]; return n; }));
          stream.addEventListener("removetrack", () => {
            if (stream.getVideoTracks().length === 0) setVideos((v) => { const n = { ...v }; delete n[peerId]; return n; });
          });
          return;
        }
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

      void initiator;
      {
        pc.onnegotiationneeded = async () => {
          if (pc.signalingState !== "stable") return;
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

  const toggleCam = useCallback(async () => {
    const stream = localStream.current;
    if (!stream) return false;
    const current = stream.getVideoTracks()[0];
    if (current) {
      current.stop();
      stream.removeTrack(current);
      Object.values(peers.current).forEach((pc) => {
        pc.getSenders().forEach((s) => { if (s.track === current || s.track?.kind === "video") pc.removeTrack(s); });
      });
      setCamOn(false);
      if (userId) setVideos((v) => { const n = { ...v }; delete n[userId]; return n; });
      channelRef.current?.send({ type: "broadcast", event: "cam-off", payload: { from: userId } });
      return true;
    }
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: "user" } });
      const track = cam.getVideoTracks()[0]!;
      stream.addTrack(track);
      Object.values(peers.current).forEach((pc) => pc.addTrack(track, stream));
      setCamOn(true);
      if (userId) setVideos((v) => ({ ...v, [userId]: new MediaStream([track]) }));
      return true;
    } catch {
      return false;
    }
  }, [userId]);

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
      .on("broadcast", { event: "cam-off" }, ({ payload }) =>
        setVideos((v) => { const n = { ...v }; delete n[payload.from]; return n; }))
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

  return { micOn, speaking, toggleMute, camOn, toggleCam, videos };
}
