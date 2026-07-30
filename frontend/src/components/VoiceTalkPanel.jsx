import { Room, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiMic, FiMicOff, FiPhone, FiPhoneOff, FiRadio } from "react-icons/fi";
import { ceygoApi } from "@/services/ceygoApi";
import { useLocation } from "@/context/LocationContext";
import { normalizeError } from "@/utils/errorHandling";

const BAR_COUNT = 28;
const SPEAK_THRESHOLD = 0.08;
const SILENCE_MS = 900;

const phaseCopy = {
  idle: {
    title: "Ready to talk",
    hint: "Start a call, then speak naturally. NaviX answers when you pause.",
  },
  connecting: {
    title: "Connecting…",
    hint: "Joining a secure LiveKit room and waking the voice guide.",
  },
  waiting: {
    title: "Guide is joining…",
    hint: "First connect can take a few seconds on free tier. Keep this tab open.",
  },
  listening: {
    title: "Listening",
    hint: "Speak now. When you pause, NaviX will reply by voice.",
  },
  speaking: {
    title: "Hearing you…",
    hint: "Keep talking — the wave follows your voice. Pause when finished.",
  },
  processing: {
    title: "Got it — thinking…",
    hint: "You paused. NaviX is preparing a spoken reply.",
  },
  agent: {
    title: "NaviX is speaking",
    hint: "Listen to the reply. You can interrupt by talking again.",
  },
  error: {
    title: "Connection failed",
    hint: "Check that the Worker and voice agent are running, then try again.",
  },
};

const WaveBars = ({ levels, active, tone = "user" }) => {
  const color =
    tone === "agent"
      ? "bg-cyan-400"
      : tone === "process"
        ? "bg-amber-400"
        : "bg-teal-500";

  return (
    <div className="flex h-16 w-full max-w-md items-end justify-center gap-1 px-2">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className={`w-1.5 rounded-full ${color} ${active ? "opacity-100" : "opacity-35"}`}
          animate={{ height: Math.max(6, Math.round(level * 64)) }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        />
      ))}
    </div>
  );
};

const VoiceTalkPanel = () => {
  const { location } = useLocation();
  const roomRef = useRef(null);
  const audioElRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(0);
  const silenceTimerRef = useRef(null);
  const phaseRef = useRef("idle");
  const mutedRef = useRef(false);
  const animOnlyRef = useRef(0);

  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [levels, setLevels] = useState(() => Array(BAR_COUNT).fill(0.08));
  const [userCaption, setUserCaption] = useState("");
  const [agentCaption, setAgentCaption] = useState("");
  const [micLevel, setMicLevel] = useState(0);

  const setPhaseSafe = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  // Synthetic wave while agent speaks / thinks (mic analyser pauses for those phases).
  useEffect(() => {
    if (phase !== "agent" && phase !== "processing") {
      if (animOnlyRef.current) {
        cancelAnimationFrame(animOnlyRef.current);
        animOnlyRef.current = 0;
      }
      return undefined;
    }
    const tick = (t) => {
      setLevels(
        Array.from({ length: BAR_COUNT }, (_, i) => {
          const wave = Math.sin(t / 180 + i * 0.45);
          const base = phase === "processing" ? 0.18 : 0.28;
          return base + Math.abs(wave) * (phase === "processing" ? 0.35 : 0.55);
        })
      );
      animOnlyRef.current = requestAnimationFrame(tick);
    };
    animOnlyRef.current = requestAnimationFrame(tick);
    return () => {
      if (animOnlyRef.current) cancelAnimationFrame(animOnlyRef.current);
      animOnlyRef.current = 0;
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      void disconnectRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLevels(Array(BAR_COUNT).fill(0.08));
    setMicLevel(0);
  };

  const startMicMeter = (mediaStreamTrack) => {
    stopMeter();
    if (!mediaStreamTrack) return;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    audioCtxRef.current = ctx;
    const stream = new MediaStream([mediaStreamTrack]);
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      const node = analyserRef.current;
      if (!node) return;
      node.getByteFrequencyData(data);

      const slice = Array.from({ length: BAR_COUNT }, (_, i) => {
        const idx = Math.floor((i / BAR_COUNT) * data.length);
        return (data[idx] || 0) / 255;
      });
      const avg =
        slice.reduce((sum, v) => sum + v, 0) / Math.max(slice.length, 1);

      setLevels(slice);
      setMicLevel(avg);

      const current = phaseRef.current;
      if (
        !mutedRef.current &&
        (current === "listening" ||
          current === "speaking" ||
          current === "processing")
      ) {
        if (avg >= SPEAK_THRESHOLD) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          if (current !== "speaking" && current !== "agent") {
            setPhaseSafe("speaking");
          }
        } else if (current === "speaking") {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (phaseRef.current === "speaking") setPhaseSafe("processing");
            }, SILENCE_MS);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    void ctx.resume();
    rafRef.current = requestAnimationFrame(tick);
  };

  const disconnectRoom = async () => {
    stopMeter();
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
    setMuted(false);
    mutedRef.current = false;
    setUserCaption("");
    setAgentCaption("");
    setPhaseSafe("idle");
  };

  const attachRemoteAudio = (track) => {
    if (track.kind !== Track.Kind.Audio) return;
    const el = audioElRef.current;
    if (!el) return;
    track.attach(el);
    el.volume = 1;
    el.muted = false;
    void el.play().catch(() => {});
  };

  const connect = async () => {
    setError("");
    setUserCaption("");
    setAgentCaption("");
    setPhaseSafe("connecting");
    try {
      const { token, url } = await ceygoApi.voiceToken({
        lat: location?.lat,
        lon: location?.lng ?? location?.lon,
      });

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        attachRemoteAudio(track);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });
      room.on(RoomEvent.Disconnected, () => {
        stopMeter();
        setPhaseSafe("idle");
      });
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        if (!participant.identity?.startsWith("user-")) {
          setPhaseSafe("listening");
        }
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const localId = room.localParticipant.identity;
        const agentTalking = speakers.some(
          (p) => p.identity && p.identity !== localId
        );
        const userTalking = speakers.some((p) => p.identity === localId);

        if (agentTalking) {
          setPhaseSafe("agent");
          return;
        }
        if (
          !userTalking &&
          (phaseRef.current === "agent" || phaseRef.current === "processing")
        ) {
          setPhaseSafe("listening");
        }
      });
      room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        const text = segments
          .map((s) => s.text)
          .join(" ")
          .trim();
        if (!text) return;
        const isLocal = participant?.identity === room.localParticipant.identity;
        if (isLocal) setUserCaption(text);
        else setAgentCaption(text);
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      const micPub = room.localParticipant.getTrackPublication(
        Track.Source.Microphone
      );
      if (micPub?.track?.mediaStreamTrack) {
        startMicMeter(micPub.track.mediaStreamTrack);
      }

      const agentAlreadyHere = Array.from(room.remoteParticipants.values()).some(
        (p) => !p.identity?.startsWith("user-")
      );
      setPhaseSafe(agentAlreadyHere ? "listening" : "waiting");

      // Safety: if agent joins quietly, flip to listening after a short wait.
      setTimeout(() => {
        if (phaseRef.current === "waiting") setPhaseSafe("listening");
      }, 8000);
    } catch (err) {
      console.error(err);
      await disconnectRoom();
      setPhaseSafe("error");
      setError(normalizeError(err) || "Could not start the voice session.");
    }
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    mutedRef.current = next;
    setMuted(next);
    if (next && phaseRef.current === "speaking") setPhaseSafe("listening");
  };

  const copy = phaseCopy[phase] || phaseCopy.idle;
  const waveTone =
    phase === "agent" ? "agent" : phase === "processing" ? "process" : "user";
  const waveActive =
    phase === "speaking" ||
    phase === "agent" ||
    phase === "processing" ||
    (phase === "listening" && micLevel > 0.03);
  const displayLevels = levels;

  const ringClass =
    phase === "speaking"
      ? "border-teal-400 bg-teal-500/20 text-teal-700 shadow-[0_0_0_8px_rgba(45,212,191,0.15)]"
      : phase === "agent"
        ? "border-cyan-400 bg-cyan-500/20 text-cyan-700 shadow-[0_0_0_8px_rgba(34,211,238,0.15)]"
        : phase === "processing"
          ? "border-amber-400 bg-amber-500/15 text-amber-700"
          : phase === "listening" || phase === "waiting"
            ? "border-teal-300/80 bg-teal-500/10 text-teal-700"
            : "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400";

  return (
    <div className="tech-panel flex h-[74vh] flex-col overflow-hidden">
      <div className="border-b border-slate-200/70 bg-white/60 px-4 py-3 text-sm font-medium text-slate-600 backdrop-blur-xl dark:border-cyan-500/20 dark:bg-slate-900/50 dark:text-slate-200">
        Talk with NaviX — live speech with turn detection
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <motion.div
          animate={
            phase === "speaking" || phase === "agent"
              ? { scale: [1, 1.06, 1] }
              : { scale: 1 }
          }
          transition={{
            duration: phase === "speaking" ? 0.7 : 1.2,
            repeat: phase === "speaking" || phase === "agent" ? Infinity : 0,
          }}
          className={`flex h-32 w-32 items-center justify-center rounded-full border-2 transition-colors ${ringClass} dark:text-teal-100`}
        >
          {muted ? (
            <FiMicOff className="text-4xl" />
          ) : phase === "agent" ? (
            <FiRadio className="text-4xl" />
          ) : (
            <FiMic className="text-4xl" />
          )}
        </motion.div>

        <WaveBars
          levels={displayLevels}
          active={waveActive && !muted}
          tone={waveTone}
        />

        <div>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {copy.title}
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {copy.hint}
          </p>
        </div>

        {(userCaption || agentCaption) && (
          <div className="w-full max-w-lg space-y-2 text-left">
            {userCaption && (
              <p className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                <span className="mono-label mr-2 text-[10px] text-teal-600">
                  YOU
                </span>
                {userCaption}
              </p>
            )}
            {agentCaption && (
              <p className="rounded-lg border border-cyan-200/70 bg-cyan-50/80 px-3 py-2 text-sm text-slate-700 dark:border-cyan-500/20 dark:bg-cyan-950/30 dark:text-slate-200">
                <span className="mono-label mr-2 text-[10px] text-cyan-600">
                  NAVIX
                </span>
                {agentCaption}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="max-w-md rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {phase === "idle" || phase === "error" ? (
            <button
              type="button"
              onClick={connect}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_6px_16px_rgba(45,212,191,0.35)]"
            >
              <FiPhone />
              Start talking
            </button>
          ) : phase === "connecting" ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 opacity-60"
            >
              <FiPhone />
              Connecting…
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {muted ? <FiMicOff /> : <FiMic />}
                {muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={() => void disconnectRoom()}
                className="inline-flex items-center gap-2 rounded-md border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200"
              >
                <FiPhoneOff />
                End call
              </button>
            </>
          )}
        </div>
      </div>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioElRef} autoPlay playsInline className="hidden" />
    </div>
  );
};

export default VoiceTalkPanel;
