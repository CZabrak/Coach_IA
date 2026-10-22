"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatClock, loadJSON, removeKey, saveJSON } from "@/lib/storage";

const TIMER_KEY = "coach-ia:timer";
const REST_KEY = "coach-ia:rest";
const FINISHED_DISPLAY_MS = 8000;

type StoredTimer = { endAt: number; total: number };

type WakeLockSentinelLike = { release: () => Promise<void> };

export type RestTimer = ReturnType<typeof useRestTimer>;

export function useRestTimer() {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(90);
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState(false);
  const [defaultRest, setDefaultRestState] = useState(90);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  const audioRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
  }, []);

  const acquireWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      };
      if (nav.wakeLock && !wakeLockRef.current) {
        wakeLockRef.current = await nav.wakeLock.request("screen");
      }
    } catch {
      wakeLockRef.current = null;
    }
  }, []);

  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    [0, 0.25, 0.5].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = index === 2 ? 1175 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
  }, []);

  const complete = useCallback(() => {
    setEndAt(null);
    setFinished(true);
    removeKey(TIMER_KEY);
    releaseWakeLock();
    beep();
    if (typeof navigator.vibrate === "function") navigator.vibrate([200, 100, 200, 100, 400]);

    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.ready
        .then((registration) =>
          registration.showNotification("Repos terminé", {
            body: "C'est reparti pour la prochaine série.",
            tag: "rest-timer",
            icon: "/pwa-icon-192",
          }),
        )
        .catch(() => undefined);
    }
  }, [beep, releaseWakeLock]);

  // Restauration au chargement (minuteur en cours, durée par défaut, permission)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const rest = loadJSON<number>(REST_KEY, 90);
    setDefaultRestState(rest);
    setTotal(rest);
    setNotifPermission("Notification" in window ? Notification.permission : "unsupported");

    const stored = loadJSON<StoredTimer | null>(TIMER_KEY, null);
    const current = Date.now();
    if (stored && stored.endAt > current) {
      setTotal(stored.total);
      setEndAt(stored.endAt);
      setNow(current);
    } else if (stored) {
      removeKey(TIMER_KEY);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Tic-tac : recalcule à partir de l'horodatage, donc exact même après une mise en veille
  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= endAt) complete();
    };
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [endAt, complete]);

  // Le verrou d'écran est relâché par le navigateur quand l'onglet est masqué
  useEffect(() => {
    if (endAt === null) return;
    const reacquire = () => {
      if (!document.hidden) void acquireWakeLock();
    };
    document.addEventListener("visibilitychange", reacquire);
    return () => document.removeEventListener("visibilitychange", reacquire);
  }, [endAt, acquireWakeLock]);

  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(() => setFinished(false), FINISHED_DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [finished]);

  const remaining = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));
  const running = endAt !== null;

  useEffect(() => {
    const base = "Coach IA";
    document.title = running ? `${formatClock(remaining)} · Repos` : base;
  }, [running, remaining]);

  const start = useCallback(
    (seconds: number) => {
      const duration = Math.max(5, Math.round(seconds));
      if (!audioRef.current && "AudioContext" in window) {
        audioRef.current = new AudioContext();
      }
      void audioRef.current?.resume();
      const current = Date.now();
      const target = current + duration * 1000;
      setFinished(false);
      setTotal(duration);
      setNow(current);
      setEndAt(target);
      saveJSON(TIMER_KEY, { endAt: target, total: duration } satisfies StoredTimer);
      void acquireWakeLock();
    },
    [acquireWakeLock],
  );

  const adjust = useCallback(
    (delta: number) => {
      if (endAt === null) return;
      const target = endAt + delta * 1000;
      if (target - Date.now() <= 1000) {
        complete();
        return;
      }
      setEndAt(target);
      setTotal((t) => Math.max(5, t + delta));
      saveJSON(TIMER_KEY, { endAt: target, total: total + delta } satisfies StoredTimer);
    },
    [endAt, total, complete],
  );

  const stop = useCallback(() => {
    setEndAt(null);
    setFinished(false);
    removeKey(TIMER_KEY);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const setDefaultRest = useCallback((seconds: number) => {
    setDefaultRestState(seconds);
    saveJSON(REST_KEY, seconds);
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!("Notification" in window)) return;
    setNotifPermission(await Notification.requestPermission());
  }, []);

  return {
    running,
    finished,
    remaining,
    total,
    progress: running && total > 0 ? Math.min(1, remaining / total) : 0,
    defaultRest,
    notifPermission,
    start,
    adjust,
    stop,
    setDefaultRest,
    enableNotifications,
  };
}
