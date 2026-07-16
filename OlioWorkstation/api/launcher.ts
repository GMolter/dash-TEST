import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceConfig } from './_utils/supabaseConfig.js';
import {
  asBytea,
  formatDisplayCode,
  generateDisplayCode,
  generateRequestId,
  generateSecret,
  isSecret,
  isUuid,
  normalizeDeviceName,
  normalizeDisplayCode,
  safeState,
  sha256,
  sourceActor,
  userActor,
} from './_utils/launcherProtocol.js';

type ServiceClient = {
  rpc: (name: string, arguments_?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  auth: {
    getUser: (accessToken: string) => Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
};

function firstRow(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || !value[0] || typeof value[0] !== 'object') return null;
  return value[0] as Record<string, unknown>;
}

function send(res: VercelResponse, status: number, body: Record<string, unknown>) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
}

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
}

function bearer(req: VercelRequest): string | null {
  const raw = String(req.headers.authorization ?? '');
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() || null : null;
}

async function authenticatedUser(req: VercelRequest, client: ServiceClient): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

async function handleCreate(req: VercelRequest, res: VercelResponse, client: ServiceClient, actorKey: string) {
  const body = bodyOf(req);
  const deviceId = body.device_id;
  const deviceName = normalizeDeviceName(body.device_name);
  const pairingSecret = body.pairing_secret;
  if (!isUuid(deviceId) || !deviceName || !isSecret(pairingSecret)) {
    return send(res, 400, { state: 'invalid' });
  }

  const requestId = generateRequestId();
  const displayCode = generateDisplayCode();
  const { data, error } = await client.rpc('create_launcher_pairing', {
    p_request_id: requestId,
    p_device_identifier: deviceId,
    p_device_name: deviceName,
    p_pairing_secret_hash: asBytea(sha256(pairingSecret)),
    p_approval_code_hash: asBytea(sha256(displayCode)),
    p_actor_hash: sourceActor(req, 'create', actorKey),
  });
  const result = !error ? firstRow(data) : null;
  const state = safeState(result?.outcome);
  if (!result || state !== 'waiting') return send(res, state === 'rate_limited' ? 429 : 400, { state });
  return send(res, 200, {
    state: 'waiting',
    request_id: result.created_request_id,
    display_code: formatDisplayCode(displayCode),
    expires_at: result.created_expires_at,
    poll_interval: 3,
  });
}

async function handlePoll(req: VercelRequest, res: VercelResponse, client: ServiceClient, actorKey: string) {
  const body = bodyOf(req);
  if (!isUuid(body.request_id) || !isUuid(body.device_id) || !isSecret(body.pairing_secret)) {
    return send(res, 400, { state: 'invalid' });
  }
  const { data, error } = await client.rpc('poll_launcher_pairing', {
    p_request_id: body.request_id,
    p_device_identifier: body.device_id,
    p_pairing_secret_hash: asBytea(sha256(body.pairing_secret)),
    p_actor_hash: sourceActor(req, 'poll', actorKey),
  });
  const state = safeState(error ? 'invalid' : data);
  return send(res, state === 'rate_limited' ? 429 : 200, { state });
}

async function handleExchange(req: VercelRequest, res: VercelResponse, client: ServiceClient, actorKey: string) {
  const body = bodyOf(req);
  if (!isUuid(body.request_id) || !isUuid(body.device_id) || !isSecret(body.pairing_secret)) {
    return send(res, 400, { state: 'invalid' });
  }
  const credential = generateSecret();
  const deviceRecordId = generateRequestId();
  const { data, error } = await client.rpc('exchange_launcher_pairing', {
    p_request_id: body.request_id,
    p_device_identifier: body.device_id,
    p_pairing_secret_hash: asBytea(sha256(body.pairing_secret)),
    p_credential_hash: asBytea(sha256(credential)),
    p_device_record_id: deviceRecordId,
    p_actor_hash: sourceActor(req, 'exchange', actorKey),
  });
  const result = !error ? firstRow(data) : null;
  if (!result || safeState(result.outcome) !== 'connected') return send(res, 400, { state: 'invalid' });
  return send(res, 200, {
    state: 'connected',
    credential,
    device_record_id: result.connected_device_id,
    device_name: result.connected_device_name,
  });
}

async function handleCancel(req: VercelRequest, res: VercelResponse, client: ServiceClient) {
  const body = bodyOf(req);
  if (!isUuid(body.request_id) || !isUuid(body.device_id) || !isSecret(body.pairing_secret)) {
    return send(res, 400, { state: 'invalid' });
  }
  const { data, error } = await client.rpc('cancel_launcher_pairing', {
    p_request_id: body.request_id,
    p_device_identifier: body.device_id,
    p_pairing_secret_hash: asBytea(sha256(body.pairing_secret)),
  });
  return send(res, 200, { state: safeState(error ? 'invalid' : data) });
}

async function handleDeviceStatus(req: VercelRequest, res: VercelResponse, client: ServiceClient, actorKey: string) {
  const body = bodyOf(req);
  if (!isUuid(body.device_id) || !isSecret(body.credential)) {
    return send(res, 400, { state: 'invalid' });
  }
  const { data, error } = await client.rpc('validate_launcher_device', {
    p_device_identifier: body.device_id,
    p_credential_hash: asBytea(sha256(body.credential)),
    p_actor_hash: sourceActor(req, 'device-status', actorKey),
  });
  const result = !error ? firstRow(data) : null;
  const state = safeState(result?.outcome);
  if (!result || state !== 'connected') return send(res, state === 'rate_limited' ? 429 : 401, { state });
  return send(res, 200, {
    state,
    device_name: result.connected_device_name,
    connected_at: result.connected_at,
    last_used_at: result.last_used_at,
  });
}

async function handleDisconnect(req: VercelRequest, res: VercelResponse, client: ServiceClient) {
  const body = bodyOf(req);
  if (!isUuid(body.device_id) || !isSecret(body.credential)) {
    return send(res, 400, { state: 'invalid' });
  }
  const { data, error } = await client.rpc('disconnect_launcher_device', {
    p_device_identifier: body.device_id,
    p_credential_hash: asBytea(sha256(body.credential)),
  });
  return send(res, 200, { state: safeState(error ? 'invalid' : data) });
}

async function handleAuthorization(req: VercelRequest, res: VercelResponse, client: ServiceClient, action: string, actorKey: string) {
  const userId = await authenticatedUser(req, client);
  if (!userId) return send(res, 401, { state: 'unauthenticated' });
  const body = bodyOf(req);
  const code = normalizeDisplayCode(body.display_code);
  if (!isUuid(body.request_id) || !code) return send(res, 400, { state: 'invalid' });
  const actor = userActor(userId, action === 'inspect' ? 'inspect' : 'decision', actorKey);
  if (action === 'inspect') {
    const { data, error } = await client.rpc('inspect_launcher_pairing', {
      p_request_id: body.request_id,
      p_approval_code_hash: asBytea(sha256(code)),
      p_actor_hash: actor,
    });
    const result = !error ? firstRow(data) : null;
    const state = safeState(result?.outcome);
    if (!result || state !== 'waiting') return send(res, state === 'rate_limited' ? 429 : 400, { state });
    return send(res, 200, {
      state,
      device_name: result.safe_device_name,
      expires_at: result.request_expires_at,
    });
  }
  const { data, error } = await client.rpc('decide_launcher_pairing', {
    p_request_id: body.request_id,
    p_approval_code_hash: asBytea(sha256(code)),
    p_owner_id: userId,
    p_decision: action,
    p_actor_hash: actor,
  });
  const state = safeState(error ? 'invalid' : data);
  return send(res, state === 'rate_limited' ? 429 : 200, { state });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, 405, { state: 'invalid' });
  const config = getSupabaseServiceConfig();
  if (config.ok === false) return send(res, 503, { state: 'offline' });
  const client = createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as ServiceClient;
  const action = String(bodyOf(req).action ?? '');
  try {
    switch (action) {
      case 'create': return await handleCreate(req, res, client, config.serviceKey);
      case 'poll': return await handlePoll(req, res, client, config.serviceKey);
      case 'exchange': return await handleExchange(req, res, client, config.serviceKey);
      case 'cancel': return await handleCancel(req, res, client);
      case 'device-status': return await handleDeviceStatus(req, res, client, config.serviceKey);
      case 'disconnect': return await handleDisconnect(req, res, client);
      case 'inspect':
      case 'approve':
      case 'deny': return await handleAuthorization(req, res, client, action, config.serviceKey);
      default: return send(res, 400, { state: 'invalid' });
    }
  } catch {
    return send(res, 503, { state: 'offline' });
  }
}
