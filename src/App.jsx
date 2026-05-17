import { useState, useEffect } from "react";
import { fetchWorkouts, saveWorkout } from "./api";

// ─── constants ───────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps",
  "Triceps", "Legs", "Core", "Full Body", "Cardio",
];
const UNITS = ["lbs", "kg", "bodyweight", "minutes", "meters"];

// ─── helpers ─────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function newSet()      { return { id: uid(), reps: "", weight: "", unit: "lbs" }; }
function newExercise() { return { id: uid(), name: "", sets: [newSet()] }; }
function newSession()  {
  return {
    id: uid(),
    name: "",
    date: new Date().toISOString().split("T")[0],
    muscleGroups: [],
    exercises: [newExercise()],
    notes: "",
  };
}

function totalSets(workout) {
  return workout.exercises.reduce((n, e) => n + e.sets.length, 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ─── sub-components ──────────────────────────────────────────────────────────
function SetRow({ set, exId, onUpdate, onRemove, canRemove }) {
  return (
    <div className="set-row">
      <span className="set-num">SET</span>
      <input
        className="set-input"
        type="number"
        min="0"
        placeholder="reps"
        value={set.reps}
        onChange={e => onUpdate(exId, set.id, "reps", e.target.value)}
      />
      <span className="set-sep">×</span>
      <input
        className="set-input"
        type="number"
        min="0"
        step="0.5"
        placeholder="weight"
        value={set.weight}
        onChange={e => onUpdate(exId, set.id, "weight", e.target.value)}
      />
      <select
        className="set-select"
        value={set.unit}
        onChange={e => onUpdate(exId, set.id, "unit", e.target.value)}
      >
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      {canRemove && (
        <button className="btn-icon remove-set" onClick={() => onRemove(exId, set.id)} title="Remove set">
          ×
        </button>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, onUpdate, onRemove, onAddSet, onRemoveSet, onUpdateSet, canRemove }) {
  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <input
          className="exercise-name-input"
          type="text"
          placeholder="Exercise name"
          value={exercise.name}
          onChange={e => onUpdate(exercise.id, "name", e.target.value)}
        />
        {canRemove && (
          <button className="btn-icon remove-exercise" onClick={() => onRemove(exercise.id)} title="Remove exercise">
            ×
          </button>
        )}
      </div>
      <div className="sets-list">
        {exercise.sets.map(s => (
          <SetRow
            key={s.id}
            set={s}
            exId={exercise.id}
            onUpdate={onUpdateSet}
            onRemove={onRemoveSet}
            canRemove={exercise.sets.length > 1}
          />
        ))}
      </div>
      <button className="btn-ghost add-set-btn" onClick={() => onAddSet(exercise.id)}>
        + Add Set
      </button>
    </div>
  );
}

function WorkoutCard({ workout, expanded, onToggle }) {
  return (
    <div className={`workout-card ${expanded ? "expanded" : ""}`}>
      <div className="workout-card-header" onClick={onToggle}>
        <div className="workout-card-meta">
          <span className="workout-card-date">{formatDate(workout.date)}</span>
          {workout.muscleGroups?.length > 0 && (
            <div className="tag-group">
              {workout.muscleGroups.map(m => (
                <span key={m} className="tag small">{m}</span>
              ))}
            </div>
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
          {workout.exercises.map((ex, ei) => (
            <div key={ei} className="history-exercise">
              <div className="history-exercise-name">{ex.name}</div>
              <div className="history-sets">
                {ex.sets.map((s, si) => (
                  <span key={si} className="history-set">
                    {s.reps && s.weight
                      ? `${s.reps} × ${s.weight} ${s.unit}`
                      : s.reps
                      ? `${s.reps} reps`
                      : "—"}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {workout.notes && (
            <div className="history-notes">
              <span className="history-notes-label">Notes</span>
              <p>{workout.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]         = useState("log");
  const [session, setSession]   = useState(newSession());
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);   // { msg, type }
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchWorkouts()
      .then(data => setWorkouts(data))
      .catch(() => showToast("Couldn't load workouts — check your connection.", "error"))
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── session mutators ────────────────────────────────────────────────────────
  function updateField(key, val) {
    setSession(s => ({ ...s, [key]: val }));
  }

  function toggleMuscle(m) {
    setSession(s => ({
      ...s,
      muscleGroups: s.muscleGroups.includes(m)
        ? s.muscleGroups.filter(x => x !== m)
        : [...s.muscleGroups, m],
    }));
  }

  function addExercise() {
    setSession(s => ({ ...s, exercises: [...s.exercises, newExercise()] }));
  }

  function removeExercise(exId) {
    setSession(s => ({ ...s, exercises: s.exercises.filter(e => e.id !== exId) }));
  }

  function updateExercise(exId, key, val) {
    setSession(s => ({
      ...s,
      exercises: s.exercises.map(e => e.id === exId ? { ...e, [key]: val } : e),
    }));
  }

  function addSet(exId) {
    setSession(s => ({
      ...s,
      exercises: s.exercises.map(e =>
        e.id === exId ? { ...e, sets: [...e.sets, newSet()] } : e
      ),
    }));
  }

  function removeSet(exId, setId) {
    setSession(s => ({
      ...s,
      exercises: s.exercises.map(e =>
        e.id === exId
          ? { ...e, sets: e.sets.filter(st => st.id !== setId) }
          : e
      ),
    }));
  }

  function updateSet(exId, setId, key, val) {
    setSession(s => ({
      ...s,
      exercises: s.exercises.map(e =>
        e.id === exId
          ? { ...e, sets: e.sets.map(st => st.id === setId ? { ...st, [key]: val } : st) }
          : e
      ),
    }));
  }

  // ── stop / save ─────────────────────────────────────────────────────────────
  async function handleStop() {
    if (!session.name.trim()) {
      showToast("Name this session before finishing.", "error");
      return;
    }
    const namedExercises = session.exercises.filter(e => e.name.trim());
    if (namedExercises.length === 0) {
      showToast("Log at least one exercise.", "error");
      return;
    }

    const payload = { ...session, exercises: namedExercises };

    setSaving(true);
    try {
      const saved = await saveWorkout(payload);
      setWorkouts(w => [saved, ...w]);
      setSession(newSession());
      showToast("Session saved to Google Sheets ✓", "ok");
    } catch (err) {
      showToast(`Save failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-logo">
          <span className="logo-iron">IRON</span>
          <span className="logo-log">LOG</span>
        </div>
        <nav className="header-nav">
          <button
            className={`nav-btn ${view === "log" ? "active" : ""}`}
            onClick={() => setView("log")}
          >
            Log
          </button>
          <button
            className={`nav-btn ${view === "history" ? "active" : ""}`}
            onClick={() => setView("history")}
          >
            History {workouts.length > 0 && <span className="nav-badge">{workouts.length}</span>}
          </button>
        </nav>
      </header>

      <main className="main">
        {/* ── LOG VIEW ── */}
        {view === "log" && (
          <div className="log-view">
            {/* session meta */}
            <div className="section">
              <input
                className="session-name-input"
                type="text"
                placeholder="Session name (e.g. Push Day)"
                value={session.name}
                onChange={e => updateField("name", e.target.value)}
              />
              <input
                className="date-input"
                type="date"
                value={session.date}
                onChange={e => updateField("date", e.target.value)}
              />
            </div>

            {/* muscle group tags */}
            <div className="section">
              <div className="section-label">Muscle Groups</div>
              <div className="tag-group">
                {MUSCLE_GROUPS.map(m => (
                  <button
                    key={m}
                    className={`tag ${session.muscleGroups.includes(m) ? "active" : ""}`}
                    onClick={() => toggleMuscle(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* exercises */}
            <div className="section">
              <div className="section-label">Exercises</div>
              {session.exercises.map(ex => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  canRemove={session.exercises.length > 1}
                  onUpdate={updateExercise}
                  onRemove={removeExercise}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                  onUpdateSet={updateSet}
                />
              ))}
              <button className="btn-ghost add-exercise-btn" onClick={addExercise}>
                + Add Exercise
              </button>
            </div>

            {/* notes */}
            <div className="section">
              <div className="section-label">Notes</div>
              <textarea
                className="notes-input"
                placeholder="How did it go? PRs, fatigue, notes..."
                value={session.notes}
                onChange={e => updateField("notes", e.target.value)}
                rows={3}
              />
            </div>

            {/* stop button */}
            <button
              className={`stop-btn ${saving ? "loading" : ""}`}
              onClick={handleStop}
              disabled={saving}
            >
              {saving ? "Saving…" : "⬛ STOP WORKOUT"}
            </button>
          </div>
        )}

        {/* ── HISTORY VIEW ── */}
        {view === "history" && (
          <div className="history-view">
            {loading ? (
              <div className="empty-state">
                <div className="spinner" />
                <p>Loading your history…</p>
              </div>
            ) : workouts.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">No sessions yet.</p>
                <p className="empty-sub">Log your first workout and it'll show up here.</p>
              </div>
            ) : (
              workouts.map(w => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  expanded={expandedId === w.id}
                  onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
