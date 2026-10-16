import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wake — Simple Alarm Clock" },
      { name: "description", content: "Set alarms in your browser with a clean, simple alarm clock." },
      { property: "og:title", content: "Wake — Simple Alarm Clock" },
      { property: "og:description", content: "Set alarms in your browser with a clean, simple alarm clock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Alarm = { id: number; time: string; label: string; on: boolean };

function Index() {
  const [now, setNow] = useState<Date | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");
  const [ringing, setRinging] = useState<Alarm | null>(null);
  const audio = useRef<{ ctx: AudioContext; osc: OscillatorNode; int: number } | null>(null);
  const lastFired = useRef("");

  useEffect(() => {
    const s = localStorage.getItem("alarms");
    if (s) setAlarms(JSON.parse(s));
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => localStorage.setItem("alarms", JSON.stringify(alarms)), [alarms]);

  useEffect(() => {
    if (!now || ringing) return;
    const hm = now.toTimeString().slice(0, 5);
    if (lastFired.current === hm) return;
    const a = alarms.find((x) => x.on && x.time === hm);
    if (a) {
      lastFired.current = hm;
      setRinging(a);
      startSound();
    }
  }, [now]);

  function startSound() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    osc.connect(gain).connect(ctx.destination);
    gain.gain.value = 0;
    osc.start();
    let on = false;
    const int = window.setInterval(() => {
      on = !on;
      gain.gain.value = on ? 0.15 : 0;
    }, 300);
    audio.current = { ctx, osc, int };
  }

  function stop() {
    if (audio.current) {
      clearInterval(audio.current.int);
      audio.current.osc.stop();
      audio.current.ctx.close();
      audio.current = null;
    }
    setRinging(null);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setAlarms((a) => [...a, { id: Date.now(), time, label: label || "Alarm", on: true }].sort((x, y) => x.time.localeCompare(y.time)));
    setLabel("");
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-16">
      <h1 className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Wake</h1>
      <div className="mt-6 font-mono text-7xl sm:text-8xl font-bold tabular-nums">
        {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
      </div>
      <p className="mt-2 text-muted-foreground">{now?.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>

      <form onSubmit={add} className="mt-12 flex w-full max-w-md gap-2">
        <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2" />
        <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1 rounded-md border border-input bg-card px-3 py-2" />
        <button className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90">Add</button>
      </form>

      <ul className="mt-8 w-full max-w-md space-y-2">
        {alarms.length === 0 && <li className="text-center text-muted-foreground">No alarms yet.</li>}
        {alarms.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className={a.on ? "" : "opacity-40"}>
              <div className="font-mono text-2xl">{a.time}</div>
              <div className="text-sm text-muted-foreground">{a.label}</div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setAlarms((l) => l.map((x) => (x.id === a.id ? { ...x, on: !x.on } : x)))} className="rounded-md border border-input px-3 py-1 text-sm">
                {a.on ? "On" : "Off"}
              </button>
              <button onClick={() => setAlarms((l) => l.filter((x) => x.id !== a.id))} className="text-sm text-destructive">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-muted-foreground">Keep this tab open for alarms to ring.</p>

      {ringing && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-primary text-primary-foreground animate-pulse">
          <div className="font-mono text-8xl font-bold">{ringing.time}</div>
          <div className="mt-2 text-2xl">{ringing.label}</div>
          <button onClick={stop} className="mt-10 rounded-full bg-background px-10 py-4 text-lg font-semibold text-foreground">Stop</button>
        </div>
      )}
    </main>
  );
}
