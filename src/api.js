const BASE = "/api";

export async function fetchWorkouts() {
  const res = await fetch(`${BASE}/sessions`);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to fetch workouts");
  }
  return res.json();
}

export async function saveWorkout(session) {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to save workout");
  }
  return res.json();
}
