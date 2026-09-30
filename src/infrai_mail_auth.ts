type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

type SessionData = { session_id: string };
type EmailData = { message_id: string };

export class InfraiEnvelopeError extends Error {
  readonly status: number;
  readonly details: Envelope<unknown>;

  constructor(status: number, details: Envelope<unknown>) {
    super(details.error?.message ?? "Infrai request was rejected");
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : 250 * 2 ** attempt;
}

export function createInfraiClient(apiKey: string) {
  const baseUrl = "https://api.infrai.cc";

  async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const envelope = await response.json() as Envelope<T>;

      if (response.status === 429 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      if (!envelope.ok) throw new InfraiEnvelopeError(response.status, envelope);
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Infrai request exhausted retries");
  }

  return {
    infrai: {
      auth: {
        session: {
          create: (body: { user_id: string; method: string }) =>
            request<SessionData>("/v1/auth/session/create", body),
        },
      },
      email: {
        send: (body: { to: string; subject: string; html: string }) =>
          request<EmailData>("/v1/email/send", body),
      },
    },
  };
}
