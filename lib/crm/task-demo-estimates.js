/** Demo-only fallback estimates when static TASKS rows omit `estimateHours`. */
export const DEMO_TASK_ESTIMATE_HOURS = /** @type {Record<string, number>} */ ({
  "t-nv-q2-report": 12,
  "t-vf-hours": 4,
  "t-vf-meta": 8,
  "t-ff-feed": 6,
  "t-brygg-reel": 5,
  "t-torv-drip": 10,
  "t-axel-blog": 3,
  "t-kyst-landing": 14,
  "t-helio-bid-cap": 6,
  "t-norden-copy": 4,
  "t-blaa-donation": 2,
  "t-edge-landing": 16,
  "t-matr-casestudy": 8,
  "t-lava-ugc": 5,
  "t-polar-shopping": 7,
  "t-sund-ga4": 4,
  "t-hof-catalog": 9,
  "t-kerne-calendar": 3,
  "t-vind-whitepaper": 11,
  "t-nv-call": 1,
  "t-pe-technical": 6,
  "t-vaerft-qa": 2,
});

/**
 * @param {{ id?: string; estimateHours?: number | null }} task
 */
export function resolveDemoTaskEstimateHours(task) {
  if (typeof task.estimateHours === "number" && Number.isFinite(task.estimateHours)) {
    return task.estimateHours;
  }
  const id = typeof task.id === "string" ? task.id : "";
  const fallback = id ? DEMO_TASK_ESTIMATE_HOURS[id] : undefined;
  return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : undefined;
}

/**
 * @param {Record<string, unknown>} task
 */
export function enrichDemoTaskRow(task) {
  const estimateHours = resolveDemoTaskEstimateHours(
    /** @type {{ id?: string; estimateHours?: number | null }} */ (task),
  );
  return estimateHours != null ? { ...task, estimateHours } : task;
}
