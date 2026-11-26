import { buildPushPayload } from '@block65/webcrypto-web-push';

const PUSH_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com'];
const PUSH_DOMAINS = ['push.apple.com', 'notify.windows.com'];

export function parseSubscription(data) {
  if (typeof data?.endpoint !== 'string' || data.endpoint.length > 2000) return null;
  let endpoint;
  try { endpoint = new URL(data.endpoint); } catch { return null; }
  const hostname = endpoint.hostname;
  const knownHost = PUSH_HOSTS.includes(hostname) || PUSH_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
  if (!knownHost || endpoint.protocol !== 'https:' || endpoint.port || endpoint.username || endpoint.password || endpoint.hash) return null;

  const { p256dh, auth } = data.keys ?? {};
  if (typeof p256dh !== 'string' || !/^[\w-]{87}$/.test(p256dh) ||
      typeof auth !== 'string' || !/^[\w-]{22}$/.test(auth)) return null;

  return { endpoint: endpoint.href, expirationTime: null, keys: { p256dh, auth } };
}

export async function deliverPush(subscription, notification, env) {
  const options = await buildPushPayload(
    { data: JSON.stringify(notification), options: { ttl: 900, urgency: 'normal' } },
    subscription,
    {
      subject: 'https://uvmlaundry.com/',
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    }
  );
  const response = await fetch(subscription.endpoint, {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(8_000),
  });
  await response.body?.cancel();
  if (response.ok) return 'accepted';
  if (response.status >= 400 && response.status < 500 && ![408, 425, 429].includes(response.status)) return 'failed';
  return 'retry';
}
