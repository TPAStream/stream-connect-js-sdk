/**
 * Cross-origin SSE consumer.
 *
 * The browser's native EventSource has two limits we couldn't live
 * with: it doesn't support custom request headers, and it doesn't
 * expose an AbortController-style cancellation handle. We use
 * fetch + ReadableStream instead, which gives us the same wire
 * protocol (SSE event/data frames over a text/event-stream response)
 * with the headers and abort semantics React effect cleanup needs.
 *
 * The current auth path for `subscribeToProgress` puts a short-lived
 * task JWT in the `?token=` query string (audience `sdk:sse:progress`,
 * minted per task), so the SDK runs SSE with no Authorization headers
 * at all — but `consumeSSE` is still header-capable for future SSE
 * consumers that need them.
 *
 * The frame parser handles:
 *  - `event: <name>\n` (single-line event type)
 *  - `data: <payload>\n` (single line; multi-line `data:` is folded
 *    with `\n` joins per spec)
 *  - blank line dispatches the accumulated frame
 *  - `\r\n` and `\n` line endings, mixed
 */

export interface SSEFrame {
  event: string;
  data: string;
}

export interface SSEConsumerArgs {
  url: string;
  headers: Record<string, string>;
  signal?: AbortSignal;
  onMessage: (frame: SSEFrame) => void;
  onError?: (err: unknown) => void;
  /** Called when the stream closes cleanly via reader EOF (server /
   * proxy / network closed without the caller calling abort()).
   * Returns true if the consumer should treat the close as
   * "expected" (e.g. saw a SUCCESS/FAILURE/timeout). Returns false
   * to surface the close as an error via onError. Defaults to false
   * so a clean close without a higher-level terminal signal is
   * treated as a problem. */
  shouldSuppressCloseError?: () => boolean;
}

export const consumeSSE = async ({
  url,
  headers,
  signal,
  onMessage,
  onError,
  shouldSuppressCloseError
}: SSEConsumerArgs): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...headers
      },
      signal,
      // No credentials: the SDK auth is header-based, not cookie. The
      // backend SDK sub-app has allow_credentials=false on its CORS
      // middleware to match.
      credentials: 'omit'
    });
  } catch (err) {
    // AbortController.abort() during normal cleanup (unmount or after
    // a validation reaches terminal state) rejects the in-flight
    // fetch with an AbortError. That's not a real failure — mirror
    // the reader-loop catch below and stay silent so callers don't
    // flip an intentionally-unsubscribed validation into pending_async.
    if ((err as { name?: string })?.name === 'AbortError') return;
    onError?.(err);
    return;
  }

  if (!response.ok || !response.body) {
    onError?.(new Error(`SSE request failed: ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let event = '';
  let data = '';

  const dispatch = () => {
    if (!event && !data) return;
    onMessage({ event: event || 'message', data });
    event = '';
    data = '';
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on \n; keep the trailing partial line in the buffer.
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');
        if (line === '') {
          dispatch();
          continue;
        }
        if (line.startsWith(':')) {
          // SSE comment line, used for keepalives by some servers.
          continue;
        }
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const field = line.slice(0, colonIdx);
        const valueRaw = line.slice(colonIdx + 1);
        const value = valueRaw.startsWith(' ') ? valueRaw.slice(1) : valueRaw;
        if (field === 'event') {
          event = value;
        } else if (field === 'data') {
          data = data ? `${data}\n${value}` : value;
        }
        // 'id' and 'retry' fields are ignored, we don't reconnect.
      }
    }
    // Clean EOF. The consumer (subscribeToProgress) knows which
    // higher-level state names count as terminal; ask it whether the
    // close was expected. If not, surface as a synthetic error so
    // ValidationStreamRunner.onError moves the validation into
    // pending_async instead of leaving it stuck on 'Connecting...'.
    if (!shouldSuppressCloseError?.()) {
      onError?.(new Error('SSE stream closed without a terminal state event'));
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return;
    onError?.(err);
  }
};
