import Anthropic from '@anthropic-ai/sdk';

const CLIENT_ID      = process.env.AICORE_CLIENT_ID      ?? 'sb-e0b5104e-420b-489b-91cc-0b0be0a405d4!b115451|aicore!b540';
const CLIENT_SECRET  = process.env.AICORE_CLIENT_SECRET  ?? 'b24080ac-d8b0-43c0-91af-a71d42b75628$L0fmFQimPJwvnNvnZuO4OIEkk928PKra-uSbykf_bU0=';
const TOKEN_URL      = process.env.AICORE_TOKEN_URL      ?? 'https://p9gsvmnxsg1mvz9k.authentication.eu10.hana.ondemand.com/oauth/token';
const AI_API_URL     = process.env.AICORE_API_URL        ?? 'https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com';
const DEPLOYMENT_ID  = process.env.AICORE_DEPLOYMENT_ID  ?? 'd0389113af96cc44';
const RESOURCE_GROUP = process.env.AICORE_RESOURCE_GROUP ?? 'default';

// AI Core uses the Bedrock-style invocation API — model name is fixed by the deployment
export const MODEL = 'anthropic--claude-4.6-sonnet';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 60_000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`AI Core OAuth error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.token;
}

// AI Core SSE omits `event:` lines. This transformer reads each `data: {...}` line,
// extracts the `type` field from the JSON, and prepends `event: <type>\n`.
function injectEventLines(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              let eventType: string | undefined;
              if (jsonStr && jsonStr !== '[DONE]') {
                try { eventType = (JSON.parse(jsonStr) as { type?: string }).type; } catch { /* ignore */ }
              }
              const out = eventType ? `event: ${eventType}\n${line}\n\n` : `${line}\n\n`;
              controller.enqueue(encoder.encode(out));
            } else if (line !== '') {
              controller.enqueue(encoder.encode(`${line}\n`));
            }
          }
        }
        if (buf.trim()) controller.enqueue(encoder.encode(`${buf}\n\n`));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export async function getAnthropicClient(): Promise<Anthropic> {
  const token = await getAccessToken();
  const baseUrl = `${AI_API_URL}/v2/inference/deployments/${DEPLOYMENT_ID}`;

  // Custom fetch: adapts Anthropic SDK calls to AI Core's Bedrock-style invoke endpoints.
  // /invoke          → full JSON response (non-streaming)
  // /invoke-with-response-stream → SSE streaming
  const customFetch: typeof globalThis.fetch = async (input, init) => {
    // Adapt body: remove 'model' (fixed by deployment), add 'anthropic_version',
    // detect 'stream' flag to choose the correct invoke path
    let isStreaming = false;
    let newInit = { ...init };
    if (init?.body && typeof init.body === 'string') {
      const body = JSON.parse(init.body);
      delete body.model;
      isStreaming = body.stream === true;
      delete body.stream;
      body.anthropic_version = 'bedrock-2023-05-31';
      newInit = { ...init, body: JSON.stringify(body) };
    }

    // Rewrite /v1/messages → /invoke or /invoke-with-response-stream
    const invokePath = isStreaming ? '/invoke-with-response-stream' : '/invoke';
    const url = String(input).replace(/\/v1\/messages(\?.*)?$/, `${invokePath}$1`);

    // Replace auth headers
    const headers = new Headers(newInit.headers);
    headers.delete('x-api-key');
    headers.delete('anthropic-version');
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('AI-Resource-Group', RESOURCE_GROUP);
    newInit.headers = headers;

    const rawResponse = await globalThis.fetch(url, newInit);

    // AI Core SSE has no `event:` lines — only `data:` lines.
    // The Anthropic SDK checks sse.event and skips data with event=null.
    // Inject `event: <type>\n` before each `data:` line using the JSON `type` field.
    if (isStreaming && rawResponse.body && rawResponse.headers.get('content-type')?.includes('text/event-stream')) {
      const transformedBody = injectEventLines(rawResponse.body);
      return new Response(transformedBody, { status: rawResponse.status, headers: rawResponse.headers });
    }

    return rawResponse;
  };

  return new Anthropic({
    apiKey: 'dummy',
    baseURL: baseUrl,
    fetch: customFetch,
  });
}
