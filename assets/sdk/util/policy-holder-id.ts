/** Resolve a policy holder's numeric id, accepting `policy_holder_id`
 * as an alias for `id`.
 *
 * Two real-world sources produce PH objects without `id`:
 * - The backend's single-PH GET (`policy_holder_sdk/policy_holder/<id>`)
 *   serializes `policy_holder_id` but not `id`, so anything that
 *   round-trips that response (including our own post-submit refresh)
 *   loses the `id` field.
 * - Customer portals that drive the wizard programmatically via the
 *   step callbacks (`doneStep2` → `choosePolicyHolder`) and pass their
 *   own PH-shaped objects keyed on `policy_holder_id`.
 *
 * Without the fallback, `policyHolder.id` interpolates as the literal
 * string "undefined" into request URLs (`.../policy_holder/undefined`),
 * which 404s at the routing layer — and worse, a credential submit
 * falls back from PUT (update-in-place) to POST (create), stranding
 * the original broken PH. Verified in production traffic 2026-07.
 */
export const resolvePolicyHolderId = (
  ph:
    | { id?: number | null; policy_holder_id?: number | null }
    | null
    | undefined
): number | null => ph?.id ?? ph?.policy_holder_id ?? null;
