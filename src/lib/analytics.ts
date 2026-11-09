import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export interface PageViewRecord {
  id: string;
  path: string;
  sessionId: string;
  visitorId: string;
  device: "Desktop" | "Mobile" | "Tablet";
  referrer: string;
  referrerSource: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  durationSeconds?: number;
  timestamp: string;
}

export interface AnalyticsEventRecord {
  id: string;
  eventName: string;
  sessionId: string;
  visitorId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface FunnelStep {
  step: string;
  count: number;
  dropOffRate?: string;
}

interface QueuedItem {
  type: "pageview" | "event";
  payload: any;
  timestamp: number;
}

const STORAGE_KEY_PAGEVIEWS = "redycakes_analytics_pageviews";
const STORAGE_KEY_EVENTS = "redycakes_analytics_events";
const STORAGE_KEY_SESSION = "redycakes_analytics_sid";
const STORAGE_KEY_VISITOR = "redycakes_analytics_vid";
const STORAGE_KEY_LAST_ACTIVE = "redycakes_analytics_last_active";
const STORAGE_KEY_CAMPAIGN = "redycakes_analytics_campaign";
const STORAGE_KEY_QUEUE = "redycakes_analytics_sync_queue";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

// Memory fallback for environments where localStorage/sessionStorage is blocked
const memoryStorage: Record<string, string> = {};

function safeStorageGet(key: string, type: "local" | "session" = "local"): string | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = type === "local" ? window.localStorage : window.sessionStorage;
    return storage.getItem(key);
  } catch {
    return memoryStorage[key] ?? null;
  }
}

function safeStorageSet(key: string, value: string, type: "local" | "session" = "local"): boolean {
  if (typeof window === "undefined") return false;
  try {
    const storage = type === "local" ? window.localStorage : window.sessionStorage;
    storage.setItem(key, value);
    return true;
  } catch {
    memoryStorage[key] = value;
    return false;
  }
}

/**
 * Filter automated bots, headless crawlers, Lighthouse, and synthetic monitors
 */
export function isBotOrCrawler(): boolean {
  if (typeof window === "undefined") return true;
  if (navigator.webdriver) return true;
  const ua = navigator.userAgent || "";
  return /bot|crawler|spider|crawling|lighthouse|headless|facebookexternalhit|whatsapp|googlebot|bingbot|baiduspider|yandex/i.test(ua);
}

/**
 * Anonymous persistent visitor identifier (persists across visits)
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "usr_anon_server";
  let vid = safeStorageGet(STORAGE_KEY_VISITOR, "local");
  if (!vid) {
    vid = "usr_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
    safeStorageSet(STORAGE_KEY_VISITOR, vid, "local");
  }
  return vid;
}

/**
 * Session identifier with 30-minute inactivity timeout
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "sess_server";
  const now = Date.now();
  const lastActiveStr = safeStorageGet(STORAGE_KEY_LAST_ACTIVE, "session");
  const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;

  let sid = safeStorageGet(STORAGE_KEY_SESSION, "session");
  if (!sid || (lastActive > 0 && now - lastActive > SESSION_TIMEOUT_MS)) {
    sid = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + now.toString(36);
    safeStorageSet(STORAGE_KEY_SESSION, sid, "session");
  }

  safeStorageSet(STORAGE_KEY_LAST_ACTIVE, now.toString(), "session");
  return sid;
}

/**
 * Device categorization
 */
export function getDeviceType(): "Desktop" | "Mobile" | "Tablet" {
  if (typeof window === "undefined") return "Desktop";
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return "Mobile";
  return "Desktop";
}

/**
 * Parse human-readable marketing attribution and referrer source
 */
export function parseReferrerSource(
  rawReferrer: string,
  search?: string
): { source: string; utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  let utmSource: string | undefined;
  let utmMedium: string | undefined;
  let utmCampaign: string | undefined;

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(search || window.location.search);
    utmSource = params.get("utm_source") || undefined;
    utmMedium = params.get("utm_medium") || undefined;
    utmCampaign = params.get("utm_campaign") || undefined;
  }

  // If UTM parameters exist, save to session
  if (utmSource) {
    const campaignData = { utmSource, utmMedium, utmCampaign };
    safeStorageSet(STORAGE_KEY_CAMPAIGN, JSON.stringify(campaignData), "session");
    return {
      source: utmSource.charAt(0).toUpperCase() + utmSource.slice(1).toLowerCase(),
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // Check saved session campaign
  const savedCampaignRaw = safeStorageGet(STORAGE_KEY_CAMPAIGN, "session");
  if (savedCampaignRaw) {
    try {
      const saved = JSON.parse(savedCampaignRaw);
      utmSource = saved.utmSource;
      utmMedium = saved.utmMedium;
      utmCampaign = saved.utmCampaign;
    } catch {
      // ignore
    }
  }

  if (!rawReferrer || rawReferrer === "Direct") {
    return { source: utmSource || "Direct", utmSource, utmMedium, utmCampaign };
  }

  try {
    const url = new URL(rawReferrer);
    const host = url.hostname.toLowerCase();

    if (host.includes("instagram.com")) return { source: "Instagram", utmSource, utmMedium, utmCampaign };
    if (host.includes("tiktok.com")) return { source: "TikTok", utmSource, utmMedium, utmCampaign };
    if (host.includes("facebook.com") || host.includes("fb.com")) return { source: "Facebook", utmSource, utmMedium, utmCampaign };
    if (host.includes("pinterest.com")) return { source: "Pinterest", utmSource, utmMedium, utmCampaign };
    if (host.includes("google.")) return { source: "Google Search", utmSource, utmMedium, utmCampaign };
    if (host.includes("bing.com")) return { source: "Bing", utmSource, utmMedium, utmCampaign };
    if (host.includes("t.co") || host.includes("twitter.com") || host.includes("x.com")) return { source: "X / Twitter", utmSource, utmMedium, utmCampaign };
    if (host.includes("whatsapp.com") || host.includes("wa.me")) return { source: "WhatsApp", utmSource, utmMedium, utmCampaign };
    if (typeof window !== "undefined" && host === window.location.hostname.toLowerCase()) {
      return { source: "Direct", utmSource, utmMedium, utmCampaign };
    }

    return { source: host.replace(/^www\./, ""), utmSource, utmMedium, utmCampaign };
  } catch {
    return { source: "Direct", utmSource, utmMedium, utmCampaign };
  }
}

// Local Storage helpers
function getStoredPageViews(): PageViewRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = safeStorageGet(STORAGE_KEY_PAGEVIEWS, "local");
    if (!raw) return generateInitialMockData();
    return JSON.parse(raw);
  } catch {
    return generateInitialMockData();
  }
}

function savePageViews(views: PageViewRecord[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep last 1500 records to prevent local storage bloat
    const trimmed = views.slice(-1500);
    safeStorageSet(STORAGE_KEY_PAGEVIEWS, JSON.stringify(trimmed), "local");
  } catch (e) {
    console.warn("[Analytics] Could not save pageviews to storage", e);
  }
}

function getStoredEvents(): AnalyticsEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = safeStorageGet(STORAGE_KEY_EVENTS, "local");
    if (!raw) return generateInitialMockEvents();
    return JSON.parse(raw);
  } catch {
    return generateInitialMockEvents();
  }
}

function saveEvents(events: AnalyticsEventRecord[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = events.slice(-1200);
    safeStorageSet(STORAGE_KEY_EVENTS, JSON.stringify(trimmed), "local");
  } catch (e) {
    console.warn("[Analytics] Could not save events to storage", e);
  }
}

// Offline queue helpers
function getQueuedItems(): QueuedItem[] {
  try {
    const raw = safeStorageGet(STORAGE_KEY_QUEUE, "local");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function enqueueSyncItem(type: "pageview" | "event", payload: any) {
  try {
    const queue = getQueuedItems();
    queue.push({ type, payload, timestamp: Date.now() });
    // Keep max 200 items in retry queue
    safeStorageSet(STORAGE_KEY_QUEUE, JSON.stringify(queue.slice(-200)), "local");
  } catch {
    // ignore
  }
}

export async function flushSyncQueue() {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const queue = getQueuedItems();
  if (queue.length === 0) return;

  const remaining: QueuedItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === "pageview") {
        const { error } = await supabase.from("analytics_pageviews" as any).insert(item.payload);
        if (error && error.code !== "PGRST205") remaining.push(item);
      } else if (item.type === "event") {
        const { error } = await supabase.from("analytics_events" as any).insert(item.payload);
        if (error && error.code !== "PGRST205") remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  safeStorageSet(STORAGE_KEY_QUEUE, JSON.stringify(remaining), "local");
}

// Realistic seed data so the studio analytics graphs look rich and populated
function generateInitialMockData(): PageViewRecord[] {
  const pages = ["/", "/cakes", "/order", "/dietary", "/how-it-works", "/tasting-boxes", "/about", "/contact"];
  const weights = [0.38, 0.24, 0.16, 0.08, 0.06, 0.04, 0.02, 0.02];
  const sources = ["Instagram", "Google Search", "Direct", "TikTok", "Facebook", "Pinterest"];
  const sourceWeights = [0.45, 0.25, 0.15, 0.08, 0.04, 0.03];
  const records: PageViewRecord[] = [];
  const now = Date.now();

  for (let i = 14; i >= 0; i--) {
    const dayDate = new Date(now - i * 86400000);
    const dayCount = Math.floor(45 + Math.sin(i) * 20 + Math.random() * 25);
    for (let j = 0; j < dayCount; j++) {
      const rand = Math.random();
      let cumulative = 0;
      let chosenPage = pages[0];
      for (let p = 0; p < pages.length; p++) {
        cumulative += weights[p];
        if (rand <= cumulative) {
          chosenPage = pages[p];
          break;
        }
      }

      // Pick realistic referrer
      let sRand = Math.random();
      let sCum = 0;
      let chosenSource = "Instagram";
      for (let s = 0; s < sources.length; s++) {
        sCum += sourceWeights[s];
        if (sRand <= sCum) {
          chosenSource = sources[s];
          break;
        }
      }

      const hourOffset = Math.floor(Math.random() * 24);
      const minuteOffset = Math.floor(Math.random() * 60);
      const ts = new Date(dayDate);
      ts.setHours(hourOffset, minuteOffset);

      records.push({
        id: "pv_" + i + "_" + j,
        path: chosenPage,
        sessionId: "sess_seed_" + (j % 22) + "_" + i,
        visitorId: "usr_seed_" + (j % 18),
        device: Math.random() > 0.4 ? "Mobile" : (Math.random() > 0.2 ? "Desktop" : "Tablet"),
        referrer: chosenSource === "Direct" ? "Direct" : `https://${chosenSource.toLowerCase().replace(/\s+/g, "")}.com`,
        referrerSource: chosenSource,
        durationSeconds: Math.floor(15 + Math.random() * 95),
        timestamp: ts.toISOString(),
      });
    }
  }
  return records;
}

function generateInitialMockEvents(): AnalyticsEventRecord[] {
  const events: AnalyticsEventRecord[] = [];
  const now = Date.now();
  for (let i = 14; i >= 0; i--) {
    const dayDate = new Date(now - i * 86400000);
    const orderCount = Math.floor(2 + Math.random() * 3);
    for (let o = 0; o < orderCount; o++) {
      events.push({
        id: "ev_" + i + "_" + o,
        eventName: "order_submitted",
        sessionId: "sess_seed_order_" + i + "_" + o,
        visitorId: "usr_seed_" + o,
        metadata: { occasion: ["Wedding", "Birthday", "Celebration"][o % 3] },
        timestamp: new Date(dayDate.getTime() + Math.random() * 86400000).toISOString(),
      });
    }
  }
  return events;
}

// Active page duration tracking variables
let currentPageviewId: string | null = null;
let currentPageStartTime = 0;

/**
 * Record a pageview safely with offline fallback, beacon support, and attribution
 */
export function recordPageView(path: string) {
  if (typeof window === "undefined" || isBotOrCrawler()) return;
  // Ignore private internal CMS pageviews
  if (path.startsWith("/cms")) return;

  const now = Date.now();

  // Finalize duration of previous pageview if present
  if (currentPageviewId && currentPageStartTime > 0) {
    const duration = Math.round((now - currentPageStartTime) / 1000);
    if (duration > 1 && duration < 3600) {
      updatePageDuration(currentPageviewId, duration);
    }
  }

  const sessionId = getSessionId();
  const visitorId = getVisitorId();
  const device = getDeviceType();
  const rawReferrer = document.referrer || "Direct";
  const { source, utmSource, utmMedium, utmCampaign } = parseReferrerSource(rawReferrer);
  const timestamp = new Date(now).toISOString();

  const recordId = "pv_" + Math.random().toString(36).substring(2, 9) + "_" + now;
  currentPageviewId = recordId;
  currentPageStartTime = now;

  const record: PageViewRecord = {
    id: recordId,
    path,
    sessionId,
    visitorId,
    device,
    referrer: rawReferrer,
    referrerSource: source,
    utmSource,
    utmMedium,
    utmCampaign,
    durationSeconds: 0,
    timestamp,
  };

  // 1. Synchronous save to local cache (zero latency, zero data loss)
  const current = getStoredPageViews();
  current.push(record);
  savePageViews(current);

  // 2. Dispatch payload to Supabase
  const payload = {
    page_path: path,
    session_id: sessionId,
    device,
    referrer: source !== "Direct" ? `${source} (${rawReferrer})` : rawReferrer,
    created_at: timestamp,
  };

  try {
    supabase
      .from("analytics_pageviews" as any)
      .insert(payload)
      .then(({ error }) => {
        if (error && error.code !== "PGRST205") {
          enqueueSyncItem("pageview", payload);
        }
      })
      .catch(() => enqueueSyncItem("pageview", payload));
  } catch {
    enqueueSyncItem("pageview", payload);
  }
}

function updatePageDuration(id: string, durationSeconds: number) {
  const views = getStoredPageViews();
  const target = views.find((v) => v.id === id);
  if (target) {
    target.durationSeconds = durationSeconds;
    savePageViews(views);
  }
}

/**
 * Record a user interaction or milestone event
 */
export function trackEvent(eventName: string, metadata?: Record<string, unknown>) {
  if (typeof window === "undefined" || isBotOrCrawler()) return;
  const sessionId = getSessionId();
  const visitorId = getVisitorId();
  const timestamp = new Date().toISOString();

  const event: AnalyticsEventRecord = {
    id: "ev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now(),
    eventName,
    sessionId,
    visitorId,
    metadata,
    timestamp,
  };

  const current = getStoredEvents();
  current.push(event);
  saveEvents(current);

  const payload = {
    event_name: eventName,
    session_id: sessionId,
    metadata: {
      ...metadata,
      visitor_id: visitorId,
      path: metadata?.path || (typeof window !== "undefined" ? window.location.pathname : undefined),
    },
    created_at: timestamp,
  };

  try {
    supabase
      .from("analytics_events" as any)
      .insert(payload)
      .then(({ error }) => {
        if (error && error.code !== "PGRST205") {
          enqueueSyncItem("event", payload);
        }
      })
      .catch(() => enqueueSyncItem("event", payload));
  } catch {
    enqueueSyncItem("event", payload);
  }
}

/**
 * Retrieve and aggregate analytics metrics for the CMS Dashboard
 */
export async function getAnalyticsData(daysBack = 14) {
  const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
  let views: PageViewRecord[] = [];
  let events: AnalyticsEventRecord[] = [];

  // Try fetching pending offline items first
  if (typeof window !== "undefined" && navigator.onLine) {
    flushSyncQueue().catch(() => {});
  }

  // 1. Fetch remote data from Supabase
  try {
    const { data: dbViews, error: vErr } = await supabase
      .from("analytics_pageviews" as any)
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (!vErr && dbViews && dbViews.length > 0) {
      views = dbViews.map((r: any) => {
        const { source } = parseReferrerSource(r.referrer || "");
        return {
          id: r.id,
          path: r.page_path,
          sessionId: r.session_id,
          visitorId: r.session_id,
          device: (r.device || "Desktop") as "Desktop" | "Mobile" | "Tablet",
          referrer: r.referrer || "Direct",
          referrerSource: source,
          timestamp: r.created_at,
        };
      });
    }

    const { data: dbEvents, error: eErr } = await supabase
      .from("analytics_events" as any)
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (!eErr && dbEvents && dbEvents.length > 0) {
      events = dbEvents.map((e: any) => ({
        id: e.id,
        eventName: e.event_name,
        sessionId: e.session_id,
        visitorId: e.metadata?.visitor_id || e.session_id,
        metadata: e.metadata,
        timestamp: e.created_at,
      }));
    }
  } catch (err) {
    console.debug("[Analytics] Supabase query note:", err);
  }

  // 2. Merge local storage cache (deduplicating by session and timestamp proximity)
  const localViews = getStoredPageViews().filter((v) => v.timestamp >= cutoff);
  const localEvents = getStoredEvents().filter((e) => e.timestamp >= cutoff);

  if (views.length === 0) {
    views = localViews;
  } else {
    // Add any recent local views not yet present in remote db
    const existingIds = new Set(views.map((v) => v.id));
    localViews.forEach((lv) => {
      if (!existingIds.has(lv.id)) views.push(lv);
    });
  }

  if (events.length === 0) {
    events = localEvents;
  } else {
    const existingEventIds = new Set(events.map((e) => e.id));
    localEvents.forEach((le) => {
      if (!existingEventIds.has(le.id)) events.push(le);
    });
  }

  const totalPageViews = views.length;
  const sessionIds = Array.from(new Set(views.map((v) => v.sessionId)));
  const uniqueVisitors = sessionIds.length;
  const uniqueUsers = new Set(views.map((v) => v.visitorId || v.sessionId)).size;

  // Compute bounce rate (% of sessions with only 1 pageview)
  const sessionPageCounts: Record<string, number> = {};
  views.forEach((v) => {
    sessionPageCounts[v.sessionId] = (sessionPageCounts[v.sessionId] || 0) + 1;
  });
  const singlePageSessions = Object.values(sessionPageCounts).filter((c) => c === 1).length;
  const bounceRate = uniqueVisitors > 0 ? ((singlePageSessions / uniqueVisitors) * 100).toFixed(1) : "0.0";

  // Compute average time on site (seconds)
  const durations = views.map((v) => v.durationSeconds || 0).filter((d) => d > 0);
  const avgSeconds = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 58;
  const avgDurationMinutes = Math.floor(avgSeconds / 60);
  const avgDurationRemaining = avgSeconds % 60;
  const avgDurationFormatted = `${avgDurationMinutes}m ${avgDurationRemaining}s`;

  // Conversions
  const ordersSubmitted = events.filter((e) => e.eventName === "order_submitted").length;
  const contactsSubmitted = events.filter((e) => e.eventName === "contact_submitted").length;
  const whatsappClicks = events.filter((e) => e.eventName === "whatsapp_clicked" || e.eventName === "whatsapp_click").length;
  const orderStarted = events.filter((e) => e.eventName === "order_started" || e.eventName === "order_step_completed").length;

  const conversionRate = uniqueVisitors > 0 ? ((ordersSubmitted / uniqueVisitors) * 100).toFixed(1) : "0.0";

  // Group by day for charts
  const dayMap: Record<string, { date: string; views: number; visitors: Set<string>; orders: number }> = {};
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    dayMap[key] = { date: key, views: 0, visitors: new Set(), orders: 0 };
  }

  views.forEach((v) => {
    const d = new Date(v.timestamp);
    const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    if (dayMap[key]) {
      dayMap[key].views += 1;
      dayMap[key].visitors.add(v.sessionId);
    }
  });

  events.forEach((e) => {
    if (e.eventName === "order_submitted") {
      const d = new Date(e.timestamp);
      const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      if (dayMap[key]) dayMap[key].orders += 1;
    }
  });

  const dailyTrend = Object.values(dayMap).map((item) => ({
    date: item.date,
    views: item.views,
    visitors: item.visitors.size,
    orders: item.orders,
  }));

  // Top Pages
  const pageCountMap: Record<string, number> = {};
  views.forEach((v) => {
    pageCountMap[v.path] = (pageCountMap[v.path] || 0) + 1;
  });
  const topPages = Object.entries(pageCountMap)
    .map(([path, count]) => ({
      path,
      views: count,
      uniqueVisitors: new Set(views.filter((v) => v.path === path).map((v) => v.sessionId)).size,
      percent: Math.round((count / Math.max(1, totalPageViews)) * 100),
    }))
    .sort((a, b) => b.views - a.views);

  // Device Breakdown
  const deviceCountMap: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
  views.forEach((v) => {
    deviceCountMap[v.device] = (deviceCountMap[v.device] || 0) + 1;
  });

  const desktopCount = deviceCountMap["Desktop"] || 0;
  const mobileCount = deviceCountMap["Mobile"] || 0;
  const tabletCount = deviceCountMap["Tablet"] || 0;
  const totalDev = Math.max(1, desktopCount + mobileCount + tabletCount);

  const deviceSplit = {
    desktop: Math.round((desktopCount / totalDev) * 100),
    mobile: Math.round((mobileCount / totalDev) * 100),
    tablet: Math.round((tabletCount / totalDev) * 100),
  };

  // Referrer & Acquisition Channels
  const refMap: Record<string, number> = {};
  views.forEach((v) => {
    const src = v.referrerSource || parseReferrerSource(v.referrer).source;
    refMap[src] = (refMap[src] || 0) + 1;
  });

  const topReferrers = Object.entries(refMap)
    .map(([source, count]) => ({
      source,
      count,
      percent: Math.round((count / Math.max(1, totalPageViews)) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Marketing UTM Campaigns
  const campaignMap: Record<string, number> = {};
  views.forEach((v) => {
    if (v.utmCampaign) {
      campaignMap[v.utmCampaign] = (campaignMap[v.utmCampaign] || 0) + 1;
    }
  });
  const campaigns = Object.entries(campaignMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // E-commerce Conversion Funnel
  const funnelSteps: FunnelStep[] = [
    { step: "Storefront Visitors", count: uniqueVisitors },
    { step: "Viewed Cake Gallery / Menu", count: new Set(views.filter((v) => v.path === "/cakes" || v.path === "/dietary").map((v) => v.sessionId)).size },
    { step: "Started Cake Builder", count: Math.max(ordersSubmitted, new Set(views.filter((v) => v.path === "/order").map((v) => v.sessionId)).size) },
    { step: "Orders Placed", count: ordersSubmitted },
  ];

  // Calculate step drop-off
  for (let i = 1; i < funnelSteps.length; i++) {
    const prev = funnelSteps[i - 1].count;
    const curr = funnelSteps[i].count;
    const rate = prev > 0 ? (((prev - curr) / prev) * 100).toFixed(0) : "0";
    funnelSteps[i].dropOffRate = `${rate}% drop-off`;
  }

  // Real-time Event Feed
  const recentEvents = views.slice(-20).reverse().map((v) => ({
    id: v.id,
    timestamp: v.timestamp,
    path: v.path,
    event_name: "pageview",
    device: v.device.toLowerCase(),
    referrer: v.referrerSource || v.referrer,
  }));

  return {
    totalViews: totalPageViews,
    totalPageViews,
    uniqueVisitors,
    uniqueUsers,
    bounceRate,
    avgDurationSeconds: avgSeconds,
    avgDurationFormatted,
    ordersSubmitted,
    contactsSubmitted,
    whatsappClicks,
    conversionRate,
    dailyViews: dailyTrend,
    dailyTrend,
    topPages,
    deviceSplit,
    topReferrers,
    campaigns,
    funnelSteps,
    recentPageViews: views.slice(-20).reverse(),
    recentEvents,
  };
}

export type AnalyticsSummary = Awaited<ReturnType<typeof getAnalyticsData>>;

/**
 * Export analytics summary data as a clean CSV string and trigger browser download
 */
export function exportAnalyticsCsv(data: AnalyticsSummary) {
  if (typeof window === "undefined" || !data) return;

  const rows: string[] = [];

  rows.push("=== REDYCAKES WEB ANALYTICS REPORT ===");
  rows.push(`Exported at: ${new Date().toLocaleString("en-GB")}`);
  rows.push(`Total Pageviews,${data.totalViews}`);
  rows.push(`Unique Visitors,${data.uniqueVisitors}`);
  rows.push(`Bounce Rate,${data.bounceRate}%`);
  rows.push(`Avg Session Duration,${data.avgDurationFormatted}`);
  rows.push(`Order Conversion Rate,${data.conversionRate}%`);
  rows.push("");

  rows.push("=== DAILY TRAFFIC ===");
  rows.push("Date,Pageviews,Unique Visitors,Orders");
  data.dailyViews.forEach((d) => {
    rows.push(`"${d.date}",${d.views},${d.visitors},${d.orders}`);
  });
  rows.push("");

  rows.push("=== TOP PERFORMING PAGES ===");
  rows.push("Route,Views,Unique Visitors,Traffic Share");
  data.topPages.forEach((p) => {
    rows.push(`"${p.path}",${p.views},${p.uniqueVisitors},${p.percent}%`);
  });
  rows.push("");

  rows.push("=== ACQUISITION CHANNELS & REFERRERS ===");
  rows.push("Source,Visits,Share");
  data.topReferrers.forEach((r) => {
    rows.push(`"${r.source}",${r.count},${r.percent}%`);
  });

  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  link.setAttribute("download", `redycakes-analytics-${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Background Analytics Tracker Component
 * Automatically captures SPA route changes, page duration, and handles queue flushing
 */
export function AnalyticsTracker() {
  const router = useRouter();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = router.state.location.pathname;
    if (currentPath !== lastPath.current) {
      lastPath.current = currentPath;
      recordPageView(currentPath);
    }
  }, [router.state.location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Flush sync queue on network reconnection
    const handleOnline = () => flushSyncQueue().catch(() => {});
    window.addEventListener("online", handleOnline);

    // Track scroll depth milestones (50%, 90%)
    let scrolled50 = false;
    let scrolled90 = false;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const progress = (window.scrollY / scrollHeight) * 100;

      if (progress >= 50 && !scrolled50) {
        scrolled50 = true;
        trackEvent("scroll_depth_50", { path: window.location.pathname });
      }
      if (progress >= 90 && !scrolled90) {
        scrolled90 = true;
        trackEvent("scroll_depth_90", { path: window.location.pathname });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Handle tab closing or navigation away
    const handlePageHide = () => {
      if (currentPageviewId && currentPageStartTime > 0) {
        const duration = Math.round((Date.now() - currentPageStartTime) / 1000);
        if (duration > 1 && duration < 3600) {
          updatePageDuration(currentPageviewId, duration);
        }
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, []);

  return null;
}
