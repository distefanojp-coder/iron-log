import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────
function buildExercises(sets = []) {
  const map = {};
  for (const s of sets) {
    if (!map[s.exercise]) map[s.exercise] = [];
    map[s.exercise].push(s);
  }
  return Object.entries(map).map(([name, rows]) => ({
    name,
    sets: rows
      .sort((a, b) => a.set_number - b.set_number)
      .map(r => ({ reps: r.reps, weight: r.weight, unit: r.unit })),
  }));
}

// ── GET — all sessions with their sets ────────────────────────────────────────
async function getSessions(supabase, res) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*, sets(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const workouts = (data || []).map(s => ({
    id:           s.id,
    date:         s.date,
    name:         s.name,
    muscleGroups: s.muscle_groups ? s.muscle_groups.split(",") : [],
    notes:        s.notes || "",
    createdAt:    s.created_at,
    exercises:    buildExercises(s.sets),
  }));

  return res.status(200).json(workouts);
}

// ── POST — insert a session and its sets ──────────────────────────────────────
async function postSession(supabase, req, res) {
  const session = req.body;

  if (!session?.id || !session?.name) {
    return res.status(400).json({ error: "Missing required session fields." });
  }

  // 1. Insert session row
  const { error: sessionError } = await supabase.from("sessions").insert({
    id:            session.id,
    date:          session.date,
    name:          session.name,
    muscle_groups: (session.muscleGroups || []).join(","),
    notes:         session.notes || "",
  });
  if (sessionError) throw sessionError;

  // 2. Build and insert set rows
  const setRows = [];
  for (const exercise of (session.exercises || [])) {
    if (!exercise.name?.trim()) continue;
    exercise.sets.forEach((s, i) => {
      setRows.push({
        session_id: session.id,
        exercise:   exercise.name,
        set_number: i + 1,
        reps:       s.reps   || "",
        weight:     s.weight || "",
        unit:       s.unit   || "lbs",
      });
    });
  }

  if (setRows.length > 0) {
    const { error: setsError } = await supabase.from("sets").insert(setRows);
    if (setsError) throw setsError;
  }

  // Return the saved session in the same shape the frontend expects
  const { data: saved, error: fetchError } = await supabase
    .from("sessions")
    .select("*, sets(*)")
    .eq("id", session.id)
    .single();

  if (fetchError) throw fetchError;

  return res.status(200).json({
    id:           saved.id,
    date:         saved.date,
    name:         saved.name,
    muscleGroups: saved.muscle_groups ? saved.muscle_groups.split(",") : [],
    notes:        saved.notes || "",
    createdAt:    saved.created_at,
    exercises:    buildExercises(saved.sets),
  });
}

// ── handler ────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars." });
  }

  try {
    const supabase = getSupabase();
    if (req.method === "GET")  return await getSessions(supabase, res);
    if (req.method === "POST") return await postSession(supabase, req, res);
    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[api/sessions]", err);
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
}
