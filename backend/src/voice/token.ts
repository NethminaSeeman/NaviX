/**
 * Mint LiveKit access tokens (HS256 JWT) for the browser voice client.
 * Uses Web Crypto so it runs on Cloudflare Workers without Node polyfills.
 */

import { Env, HttpError } from "../types";

export interface VoiceTokenResult {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

interface VoiceMeta {
  navixToken?: string;
  lat?: number | null;
  lon?: number | null;
}

function requireLiveKit(env: Env): { url: string; apiKey: string; apiSecret: string } {
  const url = (env.LIVEKIT_URL || "").trim();
  const apiKey = (env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (env.LIVEKIT_API_SECRET || "").trim();
  if (!url || !apiKey || !apiSecret) {
    throw new HttpError(
      503,
      "LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET."
    );
  }
  return { url, apiKey, apiSecret };
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    bytes = data;
  } else {
    bytes = new Uint8Array(data);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signHs256(secret: string, signingInput: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput)
  );
  return base64UrlEncode(sig);
}

export async function mintLiveKitToken(
  env: Env,
  params: {
    identity: string;
    name?: string;
    roomName: string;
    metadata: VoiceMeta;
    ttlSeconds?: number;
  }
): Promise<VoiceTokenResult> {
  const { url, apiKey, apiSecret } = requireLiveKit(env);
  const ttl = params.ttlSeconds ?? 60 * 60;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const claims = {
    iss: apiKey,
    sub: params.identity,
    name: params.name || params.identity,
    nbf: now - 10,
    exp: now + ttl,
    metadata: JSON.stringify(params.metadata),
    video: {
      roomJoin: true,
      room: params.roomName,
      roomCreate: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    // Explicit agent dispatch (matches voice-agent agent_name="navix-guide")
    roomConfig: {
      agents: [{ agentName: "navix-guide" }],
    },
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHs256(apiSecret, signingInput);
  const token = `${signingInput}.${signature}`;

  return {
    token,
    url,
    roomName: params.roomName,
    identity: params.identity,
  };
}
