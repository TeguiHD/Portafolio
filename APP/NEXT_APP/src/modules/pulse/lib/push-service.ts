import { createHash } from "node:crypto";
import webpush from "web-push";
import { getRedisClient, isRedisAvailable } from "@/lib/redis";
import type { PulseNewsItem } from "@/modules/pulse/types";
import type { PushSubscription as WebPushSubscription } from "web-push";

const SUBSCRIPTION_SET_KEY = "pulse:push:subscriptions";
const SUBSCRIPTION_PREFIX = "pulse:push:subscription:";
const NOTIFIED_PREFIX = "pulse:push:notified:";
const NOTIFY_TTL_SECONDS = 60 * 60 * 24 * 2;

export interface PulsePushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function subscriptionId(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

function getVapidConfig() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const contact = process.env.WEB_PUSH_CONTACT_EMAIL || "contact@nicoholas.dev";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, contact };
}

export function isPulsePushConfigured() {
  return Boolean(getVapidConfig());
}

export function getPulsePushPublicKey() {
  return getVapidConfig()?.publicKey ?? "";
}

function configureWebPush() {
  const config = getVapidConfig();
  if (!config) {
    throw new Error("Web Push no configurado");
  }

  webpush.setVapidDetails(`mailto:${config.contact}`, config.publicKey, config.privateKey);
}

export async function savePulseSubscription(subscription: PulsePushSubscription) {
  if (!(await isRedisAvailable())) {
    throw new Error("Redis no disponible para suscripciones push");
  }

  const client = await getRedisClient();
  const id = subscriptionId(subscription.endpoint);

  await client.sAdd(SUBSCRIPTION_SET_KEY, id);
  await client.set(`${SUBSCRIPTION_PREFIX}${id}`, JSON.stringify(subscription));
}

export async function removePulseSubscription(endpoint: string) {
  if (!(await isRedisAvailable())) {
    return;
  }

  const client = await getRedisClient();
  const id = subscriptionId(endpoint);

  await client.del(`${SUBSCRIPTION_PREFIX}${id}`);
  await client.sRem(SUBSCRIPTION_SET_KEY, id);
}

export async function listPulseSubscriptions() {
  if (!(await isRedisAvailable())) {
    return [] as PulsePushSubscription[];
  }

  const client = await getRedisClient();
  const ids = await client.sMembers(SUBSCRIPTION_SET_KEY);
  const subscriptions: PulsePushSubscription[] = [];

  for (const id of ids) {
    const raw = await client.get(`${SUBSCRIPTION_PREFIX}${id}`);
    if (!raw) {
      await client.sRem(SUBSCRIPTION_SET_KEY, id);
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as PulsePushSubscription;
      subscriptions.push(parsed);
    } catch {
      await client.del(`${SUBSCRIPTION_PREFIX}${id}`);
      await client.sRem(SUBSCRIPTION_SET_KEY, id);
    }
  }

  return subscriptions;
}

async function markNotificationAsSent(itemId: string) {
  const client = await getRedisClient();
  const result = await client.set(`${NOTIFIED_PREFIX}${itemId}`, "1", {
    EX: NOTIFY_TTL_SECONDS,
    NX: true,
  });

  return result === "OK";
}

export async function notifySubscribersAboutNews(items: PulseNewsItem[]) {
  if (!isPulsePushConfigured() || !(await isRedisAvailable())) {
    return { sent: 0, skipped: items.length };
  }

  configureWebPush();

  const subscriptions = await listPulseSubscriptions();
  if (!subscriptions.length) {
    return { sent: 0, skipped: items.length };
  }

  let sent = 0;

  for (const item of items.slice(0, 3)) {
    const shouldSend = await markNotificationAsSent(item.id);
    if (!shouldSend) {
      continue;
    }

    const payload = JSON.stringify({
      title: item.title,
      body: item.excerpt || `${item.source} reporta una nueva actualización.`,
      url: item.url || "/blog",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      image: item.imageUrl || "/icon-512.png",
      tag: item.id,
      source: item.source,
    });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(subscription as WebPushSubscription, payload)
      )
    );

    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const subscription = subscriptions[index];

      if (result.status === "fulfilled") {
        sent += 1;
        continue;
      }

      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await removePulseSubscription(subscription.endpoint);
      }
    }
  }

  return { sent, skipped: Math.max(0, items.length - sent) };
}
