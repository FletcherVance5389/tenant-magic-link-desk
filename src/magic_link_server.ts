import { createServer } from "node:http";
import { z } from "zod";
import { createInfraiClient, InfraiEnvelopeError } from "./infrai_mail_auth.ts";
import { issueMagicLink } from "./issue_magic_link.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const requestBody = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  email: z.string().email(),
  tenantState: z.enum(["active", "suspended"]),
  isAdmin: z.boolean(),
  returnTo: z.string().url(),
});

const { infrai } = createInfraiClient(apiKey);

function sendJson(response: import("node:http").ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/magic-links") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  let raw = "";
  for await (const chunk of request) raw += chunk;
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    sendJson(response, 400, { error: "Request body must be JSON" });
    return;
  }
  const parsed = requestBody.safeParse(payload);
  if (!parsed.success) {
    sendJson(response, 400, { error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await issueMagicLink(parsed.data, parsed.data.returnTo, infrai);
    if (!result.allowed) {
      sendJson(response, 403, result);
      return;
    }
    sendJson(response, 201, result);
  } catch (error) {
    if (error instanceof InfraiEnvelopeError && error.status >= 400 && error.status < 500) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    sendJson(response, 502, { error: "Unable to issue a sign-in link" });
  }
});

server.listen(3000, () => console.log("Magic-link service listening on http://localhost:3000"));
