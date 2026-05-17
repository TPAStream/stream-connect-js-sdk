# Two-Factor Authentication (MFA)

When a carrier challenges a credential submission with a one-time code
(SMS, email, authenticator app), the SDK renders the prompt inline in
the validation hero element instead of opening a modal or taking over
the screen. The user picks a delivery method, types the code, and the
rest of the SDK stays interactive throughout.

This document covers what the user sees, what the SDK is doing under
the hood, and what failure modes to expect.

## The hero element

Every active validation owns a slot in the hero element pinned to the
top of the SDK view. As the SSE stream reports state transitions, the
hero re-renders with the right copy and the right input control:

| Hero state | What it looks like | What the user does |
|---|---|---|
| `pending` | "Connecting…" with a spinner | Wait |
| `method_choice` | "Choose a verification method" with a combobox | Pick SMS / email / app |
| `awaiting_code` | "Enter your code" with a numeric input | Type the code from their phone |
| `submitting` | "Working on it…" | Wait |
| `success` | "Connected!" (green) | Done; auto-dismisses after a short hold |
| `failure` | "Couldn't connect" (red) with the carrier message | Reconnect via the tile |
| `pending_async` | "Still working on it" | Come back later; SDK is no longer streaming live |

The hero is rendered by `ActiveValidationsHero` and lives alongside
the wizard step state, so the user can keep navigating
choose-payer / fix-credentials / etc. while the validation runs in
the background. A corner-panel chip (`ActiveValidationsPanel`)
mirrors the active validations so they're visible from any step.

## Backend mechanics

After cred submit, the backend dispatches a Celery task to validate
the credentials against the carrier. If the carrier challenges with
MFA:

1. The task emits a `WAITING_FOR_METHOD_CHOICE` state event over the
   SSE stream with a `method_list` payload (which delivery methods
   the carrier offers for that account).
2. The SDK reads the event, sets the validation to `method_choice`,
   and renders the method picker.
3. The user picks a method. The SDK posts to
   `PUT /sdk-api/validate-credentials/<phid>/<task_id>` with
   `{ method: 'sms' }` (or whatever the carrier called it).
4. The task moves to `TRIGGERING_TWO_FACTOR_AUTH` while it asks the
   carrier to send the code, then to `WAITING_FOR_TWO_FACTOR_CODE`
   once the carrier acknowledges.
5. The SDK sets the validation to `awaiting_code` and renders the
   code-entry input.
6. The user types the code. Same PUT endpoint with `{ code: '123456' }`.
   The task transitions to `ENTERING_CODE` while it submits the code
   to the carrier.
7. On success the task lands on `TWO_FACTOR_AUTH_COMPLETE`; the SDK
   refreshes the policy holder to confirm credentials are valid and
   shows the success hero.

The full wire-state set the SDK consumes is in
[`assets/sdk/services/progress-stream.ts`](../assets/sdk/services/progress-stream.ts)
(`TWO_FACTOR_STATES`); any state not in that set falls through to the
generic PENDING / STARTED / RETRY / SUCCESS / FAILURE mapping.

The SSE stream carries every transition in real time. The 5-second
polling cadence the 0.7.x SDK used is gone.

## What can go wrong

### Method picker submit failed

If the PUT to record the method choice rejects (network blip, carrier
backend error), the SDK reverts the validation from `submitting` back
to `method_choice` and renders the error message inline above the
picker:

> Couldn't reach the carrier. Please try again.

The picker stays interactive so the user can retry without losing
their place.

### Code entry rejected

If the carrier rejects the submitted code (wrong number, expired,
typo), the carrier-specific message is forwarded into the validation
state and surfaces inline above the code input. The user can re-enter
without re-running the entire credential flow.

### Stream times out (10-minute deadline)

The server-side SSE deadline is ~10 minutes per stream. If the user
takes longer than that to retrieve and enter the code, the stream
closes and the validation moves to `pending_async`. The hero shows
"Still working on it" and the validation stays visible. The user can
keep using the SDK; the task itself isn't cancelled. When they come
back later, the validation's terminal state will be reflected on the
next page load.

### Stream disconnects mid-2FA

A network blip, server-side close, or proxy drop during the validation
lands the validation in `pending_async` the same way the timeout does.
The backend task continues; the SDK just can't observe it live anymore.

`AbortController.abort()` is intentionally NOT treated as a disconnect:
the SDK aborts on unmount and on terminal-state cleanup, and surfacing
those as user-visible errors would flip cleanly-finished validations
into "Still working on it." `consumeSSE` filters `AbortError` from both
the initial-fetch and reader-loop catches.

## Multiple parallel 2FA flows

Multiple credentials can be validating at the same time, each in
their own MFA stage. The hero stacks them top-to-bottom in insertion
order (the order the user submitted them). Each owns its own SSE
subscription and its own method/code-entry state, so action on one
card doesn't disrupt the others.

## Implementation pointers

* Hero rendering + state machine:
  [`ActiveValidationsHero.tsx`](../assets/sdk/components/ActiveValidationsHero.tsx)
* SSE consumer and reconcile loop:
  [`ValidationStreamRunner.tsx`](../assets/sdk/contexts/ValidationStreamRunner.tsx)
* Reducer for validation state transitions:
  [`ActiveValidationsContext.tsx`](../assets/sdk/contexts/ActiveValidationsContext.tsx)
* MFA submit endpoint (backend):
  `/sdk-api/validate-credentials/<phid>/<task_id>` (PUT)

## See also

* [SDK Flow](./sdk-flow.md) for the broader real-time validation flow
  the 2FA path plugs into
* [Errors](./error.md) for the full error surface (SSE auth, JWT,
  cred-submit)
* [Fix Credentials](./fix-credentials.md) for the per-carrier tile
  view that surfaces in-flight 2FA validations as "Validating now"
