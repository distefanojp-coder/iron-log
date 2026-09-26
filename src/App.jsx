import { useState, useEffect, useRef } from "react";
import { fetchWorkouts, saveWorkout } from "./api";

// ─── constants ────────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = [
  "Chest","Back","Shoulders","Biceps","Triceps","Legs","Core","Full Body","Cardio",
];
const UNITS = ["lbs","kg","bodyweight","minutes","meters"];

// Rest times in seconds per block type
const REST_TIMES = { prehab: 30, core: 45, main: 90, accessories: 60, default: 60 };

// ─── Phase 1 plan ─────────────────────────────────────────────────────────────
const PREHAB = [
  { name: "Band pull-aparts",      sets: 2, target: "15", unit: "bodyweight", rest: "prehab" },
  { name: "Face pulls (band)",      sets: 2, target: "15", unit: "bodyweight", rest: "prehab" },
];

const PHASE1 = {
  name: "Phase 1 — Return to Training",
  subtitle: "20–25 min · Push / Pull / Legs · A/B/C Split",
  note: "Prehab warm-up is mandatory every session — shoulder health before any pressing or pulling.",
  days: [
    {
      id: "A", label: "Day A", focus: "Push + Core",
      muscles: ["Chest","Shoulders","Core"],
      core: {
        early: [
          { name: "Plank hold",  sets: 3, target: "20", unit: "bodyweight", note: "20 sec", rest: "core" },
          { name: "Dead bug",    sets: 2, target: "8",  unit: "bodyweight", note: "each side", rest: "core" },
        ],
        late: [
          { name: "Plank hold",  sets: 3, target: "30", unit: "bodyweight", note: "30 sec", rest: "core" },
          { name: "Dead bug",    sets: 2, target: "10", unit: "bodyweight", note: "each side", rest: "core" },
        ],
      },
      main: {
        early: [
          { name: "Flat barbell bench press", sets: 3, target: "8",  unit: "lbs", rest: "main" },
          { name: "Seated barbell OHP",        sets: 3, target: "8",  unit: "lbs", rest: "main" },
          { name: "Glute bridge",              sets: 3, target: "15", unit: "bodyweight", note: "slow and controlled", rest: "accessories" },
        ],
        late: [
          { name: "Flat barbell bench press", sets: 3, target: "8",  unit: "lbs", rest: "main" },
          { name: "Seated barbell OHP",        sets: 3, target: "8",  unit: "lbs", rest: "main" },
          { name: "Glute bridge",              sets: 3, target: "15", unit: "lbs", note: "add weight when 15 feels easy", rest: "accessories" },
        ],
      },
      accessories: { early: [], late: [] },
    },
    {
      id: "B", label: "Day B", focus: "Pull + Glutes",
      muscles: ["Back","Biceps","Legs","Core"],
      core: {
        early: [
          { name: "Bird dog", sets: 2, target: "8", unit: "bodyweight", note: "each side", rest: "core" },
        ],
        late: [
          { name: "Bird dog", sets: 3, target: "10", unit: "bodyweight", note: "each side", rest: "core" },
        ],
      },
      main: {
        early: [
          { name: "Lat pulldown",                sets: 3, target: "10", unit: "lbs", rest: "main" },
          { name: "Single-arm DB row",            sets: 3, target: "10", unit: "lbs", note: "each arm", rest: "main" },
          { name: "Goblet squat",                 sets: 3, target: "12", unit: "lbs", rest: "accessories" },
          { name: "Romanian deadlift (light DB)", sets: 2, target: "10", unit: "lbs", note: "light — stop if back talks", rest: "accessories" },
        ],
        late: [
          { name: "Lat pulldown",                sets: 3, target: "10", unit: "lbs", rest: "main" },
          { name: "Single-arm DB row",            sets: 3, target: "10", unit: "lbs", note: "each arm", rest: "main" },
          { name: "Goblet squat",                 sets: 3, target: "15", unit: "lbs", rest: "accessories" },
          { name: "Romanian deadlift (light DB)", sets: 3, target: "10", unit: "lbs", note: "light — stop if back talks", rest: "accessories" },
        ],
      },
      accessories: { early: [], late: [] },
    },
    {
      id: "C", label: "Day C", focus: "Legs + Carries",
      muscles: ["Legs","Core"],
      core: { early: [], late: [] }, // carries cover trunk work on this day
      main: {
        early: [
          { name: "Rear-foot-elevated split squat", sets: 3, target: "8",  unit: "lbs", note: "each leg · DB each hand · rear foot on bench", rest: "main" },
          { name: "Romanian deadlift (light DB)",   sets: 3, target: "10", unit: "lbs", note: "light — 3-sec lowering", rest: "main" },
        ],
        late: [
          { name: "Rear-foot-elevated split squat", sets: 3, target: "10", unit: "lbs", note: "each leg · add weight once 10 is clean", rest: "main" },
          { name: "Romanian deadlift (light DB)",   sets: 3, target: "10", unit: "lbs", note: "light — 3-sec lowering", rest: "main" },
        ],
      },
      accessories: {
        early: [
          { name: "Farmer carry", sets: 3, target: "50", unit: "lbs", note: "~50 ft · weight is per hand · grip is the limiter", rest: "accessories", maxWeight: 52.5 },
        ],
        late: [
          { name: "Farmer carry", sets: 4, target: "60", unit: "lbs", note: "~60 ft · add distance before weight", rest: "accessories", maxWeight: 52.5 },
        ],
      },
    },
  ],
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function newSet()      { return { id: uid(), reps: "", weight: "", unit: "lbs", done: false }; }
function newExercise() { return { id: uid(), name: "", sets: [newSet()] }; }
function newSession()  {
  return { id: uid(), name: "", date: new Date().toISOString().split("T")[0], muscleGroups: [], exercises: [newExercise()], notes: "" };
}
function totalSets(w) { return w.exercises.reduce((n, e) => n + e.sets.length, 0); }
function formatDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]} ${+d}, ${y}`;
}
function youtubeUrl(name) {
  return `https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(name)}+exercise+form`;
}
// PYRAMID_STEP: lbs added per set when ramping. This is a convention (ramp into
// working weight), not an evidence-backed number — tune it to whatever feels right.
const PYRAMID_STEP = 5;

function roundToHalf(n) { return Math.round(n * 2) / 2; }

// Finds the most recent past session with a matching exercise name and returns
// its logged weights in set order. Returns null if nothing usable is found —
// never guess a starting weight from nothing.
function getLastWeights(workouts, name) {
  const target = (name || "").trim().toLowerCase();
  if (!target) return null;
  for (const w of workouts) { // API returns newest-first
    const match = w.exercises?.find(e => e.name?.trim().toLowerCase() === target);
    if (match) {
      const weights = match.sets.map(s => parseFloat(s.weight)).filter(n => !isNaN(n) && n > 0);
      if (weights.length) return weights;
    }
  }
  return null;
}

function buildSessionFromPlan(day, phase, workouts = []) {
  const makeEx = ex => {
    const lastWeights = getLastWeights(workouts, ex.name);
    const sets = Array.from({ length: ex.sets }, (_, i) => {
      let weight = "";
      if (lastWeights) {
        let w = roundToHalf(lastWeights[0] + 5 + PYRAMID_STEP * i);
        if (ex.maxWeight) w = Math.min(w, ex.maxWeight); // e.g. SelectTech tops out at 52.5
        weight = String(w);
      }
      return { id: uid(), reps: ex.target || "", weight, unit: ex.unit || "lbs", done: false };
    });
    return { id: uid(), name: ex.name, sets, restType: ex.rest || "default" };
  };
  return {
    id: uid(), name: `${day.label} — ${day.focus}`,
    date: new Date().toISOString().split("T")[0],
    muscleGroups: day.muscles, notes: "",
    exercises: [
      ...PREHAB.map(makeEx),
      ...day.core[phase].map(makeEx),
      ...day.main[phase].map(makeEx),
      ...(day.accessories[phase] || []).map(makeEx),
    ],
  };
}

// ─── Rest Timer component ─────────────────────────────────────────────────────
function RestTimer({ seconds, onDismiss }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(intervalRef.current); onDismiss(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const pct = (remaining / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="rest-timer" onClick={onDismiss}>
      <div className="rest-timer-inner">
        <div className="rest-label">REST</div>
        <div className="rest-countdown">{mins > 0 ? `${mins}:${secs.toString().padStart(2,"0")}` : `${remaining}s`}</div>
        <div className="rest-bar-track">
          <div className="rest-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="rest-dismiss">tap to skip</div>
      </div>
    </div>
  );
}

// ─── Log view components ──────────────────────────────────────────────────────
function SetRow({ set, exId, onUpdate, onRemove, onLogSet, canRemove }) {
  return (
    <div className={`set-row ${set.done ? "done" : ""}`}>
      <span className="set-num">SET</span>
      <input className="set-input" type="number" min="0" placeholder="reps" value={set.reps} disabled={set.done} onChange={e => onUpdate(exId, set.id, "reps", e.target.value)} />
      <span className="set-sep">×</span>
      <input className="set-input" type="number" min="0" step="0.5" placeholder="weight" value={set.weight} disabled={set.done} onChange={e => onUpdate(exId, set.id, "weight", e.target.value)} />
      <select className="set-select" value={set.unit} disabled={set.done} onChange={e => onUpdate(exId, set.id, "unit", e.target.value)}>
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <button className={`btn-done ${set.done ? "checked" : ""}`} onClick={() => onLogSet(exId, set.id)} title={set.done ? "Tap to undo" : "Done — start rest timer"}>✓</button>
      {canRemove && <button className="btn-icon" onClick={() => onRemove(exId, set.id)}>×</button>}
    </div>
  );
}

function ExerciseCard({ exercise, onUpdate, onRemove, onAddSet, onRemoveSet, onUpdateSet, onLogSet, canRemove }) {
  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <input className="exercise-name-input" type="text" placeholder="Exercise name" value={exercise.name} onChange={e => onUpdate(exercise.id, "name", e.target.value)} />
        {canRemove && <button className="btn-icon" onClick={() => onRemove(exercise.id)}>×</button>}
      </div>
      <div className="sets-list">
        {exercise.sets.map(s => (
          <SetRow key={s.id} set={s} exId={exercise.id}
            onUpdate={onUpdateSet} onRemove={onRemoveSet}
            onLogSet={onLogSet}
            canRemove={exercise.sets.length > 1} />
        ))}
      </div>
      <button className="btn-ghost add-set-btn" onClick={() => onAddSet(exercise.id)}>+ Add Set</button>
    </div>
  );
}

// ─── History view component ───────────────────────────────────────────────────
function WorkoutCard({ workout, expanded, onToggle }) {
  return (
    <div className={`workout-card ${expanded ? "expanded" : ""}`}>
      <div className="workout-card-header" onClick={onToggle}>
        <div className="workout-card-meta">
          <span className="workout-card-date">{formatDate(workout.date)}</span>
          {workout.muscleGroups?.length > 0 && (
            <div className="tag-group">{workout.muscleGroups.map(m => <span key={m} className="tag small">{m}</span>)}</div>
          )}
        </div>
        <div className="workout-card-right">
          <span className="workout-card-name">{workout.name || "Untitled"}</span>
          <span className="workout-card-sets">{totalSets(workout)} sets</span>
          <span className="expand-icon">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div className="workout-card-body">
          {workout.exercises.map((ex, i) => (
            <div key={i} className="history-exercise">
              <div className="history-exercise-name">{ex.name}</div>
              <div className="history-sets">
                {ex.sets.map((s, j) => (
                  <span key={j} className="history-set">
                    {s.reps && s.weight ? `${s.reps} × ${s.weight} ${s.unit}` : s.reps ? `${s.reps} reps` : "—"}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {workout.notes && <div className="history-notes"><span className="history-notes-label">Notes</span><p>{workout.notes}</p></div>}
        </div>
      )}
    </div>
  );
}

// ─── Plans view component ─────────────────────────────────────────────────────
function PlansView({ onLoadPlan }) {
  const [activeDay, setActiveDay] = useState("A");
  const [phase, setPhase]         = useState("early");
  const day = PHASE1.days.find(d => d.id === activeDay);

  const renderBlock = (exercises, label, mandatory = false) => {
    if (!exercises || exercises.length === 0) return null;
    return (
      <div className="plan-block">
        <div className="plan-block-label">
          {label} {mandatory && <span className="mandatory-badge">MANDATORY</span>}
        </div>
        {exercises.map((ex, i) => (
          <div key={i} className="plan-exercise-row">
            <div className="plan-exercise-left">
              <a className="plan-exercise-name" href={youtubeUrl(ex.name)} target="_blank" rel="noopener noreferrer" title="Watch on YouTube">
                {ex.name} <span className="yt-icon">▶</span>
              </a>
              <div className="plan-exercise-meta">
                {ex.note && <span className="plan-exercise-note">{ex.note}</span>}
                <span className="plan-exercise-rest">
                  {REST_TIMES[ex.rest || "default"]}s rest
                </span>
              </div>
            </div>
            <span className="plan-exercise-target">{ex.sets}×{ex.target}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="plans-view">
      <div className="plan-header">
        <div className="plan-title">{PHASE1.name}</div>
        <div className="plan-subtitle">{PHASE1.subtitle}</div>
        <div className="plan-alert">{PHASE1.note}</div>
      </div>
      <div className="plan-tab-row">
        {PHASE1.days.map(d => (
          <button key={d.id} className={`plan-tab ${activeDay === d.id ? "active" : ""}`} onClick={() => setActiveDay(d.id)}>
            <span className="plan-tab-label">{d.label}</span>
            <span className="plan-tab-focus">{d.focus}</span>
          </button>
        ))}
      </div>
      <div className="plan-phase-toggle">
        <button className={`phase-btn ${phase === "early" ? "active" : ""}`} onClick={() => setPhase("early")}>Weeks 1–2</button>
        <button className={`phase-btn ${phase === "late" ? "active" : ""}`} onClick={() => setPhase("late")}>Weeks 3–4</button>
      </div>
      {renderBlock(PREHAB, "Prehab Warm-Up", true)}
      {renderBlock(day.core[phase], "Core")}
      {renderBlock(day.main[phase], "Main Work")}
      {renderBlock(day.accessories[phase], "Accessories")}
      <button className="load-plan-btn" onClick={() => onLoadPlan(day, phase)}>
        ▶ Load {day.label} into Logger
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]             = useState("log");
  const [session, setSession]       = useState(newSession());
  const [workouts, setWorkouts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [restTimer, setRestTimer]   = useState(null); // { seconds }

  useEffect(() => {
    fetchWorkouts().then(setWorkouts).catch(() => showToast("Couldn't load workouts.", "error")).finally(() => setLoading(false));
  }, []);

  function showToast(msg, type = "ok") { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }
  function updateField(key, val)    { setSession(s => ({ ...s, [key]: val })); }
  function toggleMuscle(m) {
    setSession(s => ({ ...s, muscleGroups: s.muscleGroups.includes(m) ? s.muscleGroups.filter(x => x !== m) : [...s.muscleGroups, m] }));
  }
  function addExercise()        { setSession(s => ({ ...s, exercises: [...s.exercises, newExercise()] })); }
  function removeExercise(exId) { setSession(s => ({ ...s, exercises: s.exercises.filter(e => e.id !== exId) })); }
  function updateExercise(exId, key, val) { setSession(s => ({ ...s, exercises: s.exercises.map(e => e.id === exId ? { ...e, [key]: val } : e) })); }
  function addSet(exId) { setSession(s => ({ ...s, exercises: s.exercises.map(e => e.id === exId ? { ...e, sets: [...e.sets, newSet()] } : e) })); }
  function removeSet(exId, setId) { setSession(s => ({ ...s, exercises: s.exercises.map(e => e.id === exId ? { ...e, sets: e.sets.filter(st => st.id !== setId) } : e) })); }
  function updateSet(exId, setId, key, val) { setSession(s => ({ ...s, exercises: s.exercises.map(e => e.id === exId ? { ...e, sets: e.sets.map(st => st.id === setId ? { ...st, [key]: val } : st) } : e) })); }

  function handleLogSet(exId, setId) {
    const ex = session.exercises.find(e => e.id === exId);
    const set = ex?.sets.find(s => s.id === setId);
    if (!set) return;
    const nowDone = !set.done;
    updateSet(exId, setId, "done", nowDone);
    if (nowDone) {
      const restType = ex?.restType || "default";
      const secs = REST_TIMES[restType] || REST_TIMES.default;
      setRestTimer({ seconds: secs });
    }
  }

  function handleLoadPlan(day, phase) { setSession(buildSessionFromPlan(day, phase, workouts)); setView("log"); showToast(`${day.label} loaded — weights prefilled from last time.`); }

  async function handleStop() {
    if (!session.name.trim()) { showToast("Name this session before finishing.", "error"); return; }
    const namedExercises = session.exercises.filter(e => e.name.trim());
    if (!namedExercises.length) { showToast("Log at least one exercise.", "error"); return; }
    setSaving(true);
    try {
      const saved = await saveWorkout({ ...session, exercises: namedExercises });
      setWorkouts(w => [saved, ...w]);
      setSession(newSession());
      showToast("Session saved ✓");
    } catch (err) { showToast(`Save failed: ${err.message}`, "error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo"><span className="logo-iron">IRON</span><span className="logo-log">LOG</span></div>
        <nav className="header-nav">
          <button className={`nav-btn ${view === "log" ? "active" : ""}`} onClick={() => setView("log")}>Log</button>
          <button className={`nav-btn ${view === "plans" ? "active" : ""}`} onClick={() => setView("plans")}>Plans</button>
          <button className={`nav-btn ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}>
            History {workouts.length > 0 && <span className="nav-badge">{workouts.length}</span>}
          </button>
        </nav>
      </header>

      <main className="main">
        {view === "log" && (
          <div className="log-view">
            <div className="section">
              <input className="session-name-input" type="text" placeholder="Session name (e.g. Push Day)" value={session.name} onChange={e => updateField("name", e.target.value)} />
              <input className="date-input" type="date" value={session.date} onChange={e => updateField("date", e.target.value)} />
            </div>
            <div className="section">
              <div className="section-label">Muscle Groups</div>
              <div className="tag-group">
                {MUSCLE_GROUPS.map(m => <button key={m} className={`tag ${session.muscleGroups.includes(m) ? "active" : ""}`} onClick={() => toggleMuscle(m)}>{m}</button>)}
              </div>
            </div>
            <div className="section">
              <div className="section-label">Exercises</div>
              {session.exercises.map(ex => (
                <ExerciseCard key={ex.id} exercise={ex} canRemove={session.exercises.length > 1}
                  onUpdate={updateExercise} onRemove={removeExercise}
                  onAddSet={addSet} onRemoveSet={removeSet} onUpdateSet={updateSet}
                  onLogSet={handleLogSet} />
              ))}
              <button className="btn-ghost add-exercise-btn" onClick={addExercise}>+ Add Exercise</button>
            </div>
            <div className="section">
              <div className="section-label">Notes</div>
              <textarea className="notes-input" rows={3} placeholder="How did it go? PRs, fatigue, notes..." value={session.notes} onChange={e => updateField("notes", e.target.value)} />
            </div>
            <button className={`stop-btn ${saving ? "loading" : ""}`} onClick={handleStop} disabled={saving}>
              {saving ? "Saving…" : "⬛ STOP WORKOUT"}
            </button>
          </div>
        )}
        {view === "plans" && <PlansView onLoadPlan={handleLoadPlan} />}
        {view === "history" && (
          <div className="history-view">
            {loading ? (
              <div className="empty-state"><div className="spinner" /><p>Loading your history…</p></div>
            ) : workouts.length === 0 ? (
              <div className="empty-state"><p className="empty-title">No sessions yet.</p><p className="empty-sub">Log your first workout and it'll show up here.</p></div>
            ) : (
              workouts.map(w => <WorkoutCard key={w.id} workout={w} expanded={expandedId === w.id} onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)} />)
            )}
          </div>
        )}
      </main>

      {restTimer && <RestTimer seconds={restTimer.seconds} onDismiss={() => setRestTimer(null)} />}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
