import { reconcileSnapshot, targetDates } from "./readings.mjs";
import { fetchReading } from "./readings-source.mjs";

export async function refreshReadings(
  previous,
  mode,
  now = new Date(),
  retrieve = fetchReading,
) {
  const incoming = [];
  const errors = [];
  let evaluated = false;
  // Sequential requests keep the small daily import gentle on the provider.
  for (const date of targetDates(mode, now)) {
    const result = await retrieve(date);
    if (result.record) {
      incoming.push(result.record);
      evaluated = true;
    } else {
      errors.push({
        date,
        message: result.message || "Source unavailable",
        kind: result.unavailable ? "unavailable" : "error",
      });
      if (result.unavailable) evaluated = true;
    }
  }
  if (!previous && !evaluated)
    throw new Error(
      "Readings bootstrap failed: no usable source response or previous snapshot",
    );
  return reconcileSnapshot(previous, incoming, mode, now, errors);
}
