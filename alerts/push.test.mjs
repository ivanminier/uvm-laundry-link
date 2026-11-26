import { generateKeyPairSync, randomBytes } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { parseSubscription } from './push.js';

function curveKeys() {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const { x, y, d } = keys.privateKey.export({ format: 'jwk' });
  return {
    publicKey: Buffer.concat([Buffer.from([4]), Buffer.from(x, 'base64url'), Buffer.from(y, 'base64url')]).toString('base64url'),
    privateKey: d,
  };
}

test('accepts supported browser endpoints and rejects external and local destinations', () => {
  const keys = { p256dh: curveKeys().publicKey, auth: randomBytes(16).toString('base64url') };
  for (const endpoint of ['https://fcm.googleapis.com/fcm/send/example', 'https://web.push.apple.com/Q/example', 'https://updates.push.services.mozilla.com/wpush/v2/example']) {
    assert.equal(parseSubscription({ endpoint, keys }).endpoint, endpoint);
  }
  for (const endpoint of ['https://127.0.0.1/', 'https://push.apple.com.other.net/', 'http://fcm.googleapis.com/', 'https://user@fcm.googleapis.com/']) {
    assert.equal(parseSubscription({ endpoint, keys }), null);
  }
});

test('encrypts a VAPID-authenticated push payload for a browser subscription', async () => {
  const subscription = parseSubscription({
    endpoint: 'https://fcm.googleapis.com/fcm/send/example',
    keys: { p256dh: curveKeys().publicKey, auth: randomBytes(16).toString('base64url') },
  });
  const payload = await buildPushPayload(
    { data: JSON.stringify({ title: 'Washer 45 has finished' }), options: { ttl: 900 } },
    subscription,
    { ...curveKeys(), subject: 'https://uvmlaundry.com/' }
  );
  const headers = new Headers(payload.headers);
  assert.match(headers.get('Authorization'), /^vapid /i);
  assert.equal(headers.get('Content-Encoding'), 'aes128gcm');
  assert.ok(payload.body);
});
