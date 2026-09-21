// Single-instance prototype budget. A restart resets it; use shared limits before scaling.
let minuteStart = 0;
let minuteCount = 0;
let dayStart = 0;
let dayCount = 0;
export function takeAiRequest(now = Date.now()): boolean {
  if (now - minuteStart >= 60_000) { minuteStart = now; minuteCount = 0; }
  if (now - dayStart >= 86_400_000) { dayStart = now; dayCount = 0; }
  if (minuteCount >= 12 || dayCount >= 300) return false;
  minuteCount++; dayCount++;
  return true;
}
