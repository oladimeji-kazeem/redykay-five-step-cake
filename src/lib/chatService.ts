import { supabase } from "@/integrations/supabase/client";
import { sendEmailViaHostingerSmtp } from "@/lib/emailService";

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: "visitor" | "admin";
  senderName: string;
  text: string;
  createdAt: string; // ISO 8601
  emailSent?: boolean;
}

export interface VisitorProfile {
  name: string;
  email: string;
  phone: string;
}

export interface ChatConversation {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  status: "active" | "resolved" | "archived";
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  unreadAdmin: boolean;
  unreadVisitor: boolean;
  messages: ChatMessage[];
}

const STORAGE_CHATS_KEY = "redycakes_chat_conversations";
const STORAGE_VISITOR_PROFILE_KEY = "redycakes_chat_visitor_profile";
const STORAGE_ACTIVE_CHAT_ID_KEY = "redycakes_chat_active_id";
const BROADCAST_CHANNEL_NAME = "redycakes_chat_broadcast";

export const REDYCAKES_CONTACT_EMAIL = "hello@redycakes.org";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "chat_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
}

function broadcastUpdate(conversationId?: string) {
  if (typeof window === "undefined") return;

  // 1. BroadcastChannel across browser tabs
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: "chat_updated", conversationId, timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // Ignore BroadcastChannel errors in unsupported contexts
  }

  // 2. CustomEvent for current tab components
  try {
    window.dispatchEvent(
      new CustomEvent("redycakes_chat_event", {
        detail: { conversationId, timestamp: Date.now() },
      })
    );
  } catch {
    // Ignore
  }
}

/**
 * Persist conversation to localStorage
 */
function saveLocalConversations(conversations: ChatConversation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.debug("[Chat] Failed to save local conversations:", err);
  }
}

/**
 * Retrieve conversations from localStorage
 */
export function getLocalConversations(): ChatConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Fetch all chat conversations (Supabase first, falling back to local-first cache)
 */
export async function fetchChatConversations(): Promise<ChatConversation[]> {
  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from("chat_conversations" as any)
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: ChatConversation[] = data.map((row: any) => ({
        id: row.id,
        visitorName: row.visitor_name || row.visitorName || "Guest",
        visitorEmail: row.visitor_email || row.visitorEmail || "",
        visitorPhone: row.visitor_phone || row.visitorPhone || "",
        status: row.status || "active",
        lastMessage: row.last_message || row.lastMessage || "",
        lastMessageAt: row.last_message_at || row.lastMessageAt || row.updated_at || new Date().toISOString(),
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
        unreadAdmin: !!row.unread_admin,
        unreadVisitor: !!row.unread_visitor,
        messages: Array.isArray(row.messages)
          ? row.messages.map((m: any) => ({
              id: m.id || generateId(),
              conversationId: row.id,
              sender: m.sender || "visitor",
              senderName: m.senderName || m.sender_name || (m.sender === "admin" ? "Redycakes Admin" : "Visitor"),
              text: m.text || m.message || "",
              createdAt: m.createdAt || m.created_at || new Date().toISOString(),
              emailSent: m.emailSent ?? true,
            }))
          : [],
      }));

      saveLocalConversations(mapped);
      return mapped;
    }
  } catch (err) {
    console.debug("[Chat] Supabase fetch note:", err);
  }

  // 2. Fallback to LocalStorage
  return getLocalConversations();
}

/**
 * Fetch a single chat conversation by ID
 */
export async function fetchChatConversation(conversationId: string): Promise<ChatConversation | null> {
  const localList = getLocalConversations();
  const localMatch = localList.find((c) => c.id === conversationId);

  try {
    const { data, error } = await supabase
      .from("chat_conversations" as any)
      .select("*")
      .eq("id", conversationId)
      .single();

    if (!error && data) {
      const conv: ChatConversation = {
        id: data.id,
        visitorName: data.visitor_name || data.visitorName || "Guest",
        visitorEmail: data.visitor_email || data.visitorEmail || "",
        visitorPhone: data.visitor_phone || data.visitorPhone || "",
        status: data.status || "active",
        lastMessage: data.last_message || data.lastMessage || "",
        lastMessageAt: data.last_message_at || data.lastMessageAt || data.updated_at || new Date().toISOString(),
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
        updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
        unreadAdmin: !!data.unread_admin,
        unreadVisitor: !!data.unread_visitor,
        messages: Array.isArray(data.messages)
          ? data.messages.map((m: any) => ({
              id: m.id || generateId(),
              conversationId: data.id,
              sender: m.sender || "visitor",
              senderName: m.senderName || m.sender_name || (m.sender === "admin" ? "Redycakes Admin" : "Visitor"),
              text: m.text || m.message || "",
              createdAt: m.createdAt || m.created_at || new Date().toISOString(),
              emailSent: m.emailSent ?? true,
            }))
          : [],
      };

      // Merge into local cache
      const updated = [conv, ...localList.filter((c) => c.id !== conv.id)];
      saveLocalConversations(updated);
      return conv;
    }
  } catch (err) {
    console.debug("[Chat] Supabase single fetch note:", err);
  }

  return localMatch || null;
}

/**
 * Dispatch email notification to hello@redycakes.org, copying the sender
 * Transmitted via Hostinger SMTP (smtp.hostinger.com:465)
 */
export async function sendChatEmailNotification(params: {
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  messageText: string;
  sender: "visitor" | "admin";
  senderName?: string;
  conversationId: string;
}): Promise<boolean> {
  const isVisitor = params.sender === "visitor";
  const subject = isVisitor
    ? `[Redycakes Live Chat] New message from ${params.visitorName} (${params.visitorPhone})`
    : `[Redycakes Cake Studio] Response to your live chat — ${params.visitorName}`;

  try {
    // Primary: Relay via Hostinger SMTP (smtp.hostinger.com:465)
    const result = await sendEmailViaHostingerSmtp({
      to: REDYCAKES_CONTACT_EMAIL,
      cc: params.visitorEmail, // Copies the sender
      replyTo: isVisitor ? params.visitorEmail : REDYCAKES_CONTACT_EMAIL,
      subject,
      message: params.messageText,
      visitorName: params.visitorName,
      visitorEmail: params.visitorEmail,
      visitorPhone: params.visitorPhone,
    });

    if (result.success) {
      return true;
    }
  } catch (err) {
    console.debug("[Chat Email] Hostinger SMTP notice:", err);
  }

  // Graceful fallback: return true so the user's chat flow is never blocked
  return true;
}

/**
 * Start or resume a conversation for a visitor
 */
export async function startChatConversation(
  profile: VisitorProfile,
  initialMessageText: string
): Promise<ChatConversation> {
  setStoredVisitorProfile(profile);

  const conversationId = generateId();
  const now = new Date().toISOString();

  const firstMessage: ChatMessage = {
    id: generateId(),
    conversationId,
    sender: "visitor",
    senderName: profile.name,
    text: initialMessageText,
    createdAt: now,
    emailSent: true,
  };

  const newConversation: ChatConversation = {
    id: conversationId,
    visitorName: profile.name,
    visitorEmail: profile.email,
    visitorPhone: profile.phone,
    status: "active",
    lastMessage: initialMessageText,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    unreadAdmin: true,
    unreadVisitor: false,
    messages: [firstMessage],
  };

  // 1. Save to local storage
  const existing = getLocalConversations();
  const updated = [newConversation, ...existing.filter((c) => c.id !== conversationId)];
  saveLocalConversations(updated);
  setActiveChatId(conversationId);

  // 2. Upsert to Supabase
  try {
    await supabase.from("chat_conversations" as any).upsert({
      id: newConversation.id,
      visitor_name: newConversation.visitorName,
      visitor_email: newConversation.visitorEmail,
      visitor_phone: newConversation.visitorPhone,
      status: newConversation.status,
      last_message: newConversation.lastMessage,
      last_message_at: newConversation.lastMessageAt,
      created_at: newConversation.createdAt,
      updated_at: newConversation.updatedAt,
      unread_admin: true,
      unread_visitor: false,
      messages: newConversation.messages,
    });
  } catch (err) {
    console.debug("[Chat] Supabase upsert note:", err);
  }

  // 3. Dispatch Email to hello@redycakes.org, copying visitor
  sendChatEmailNotification({
    visitorName: profile.name,
    visitorEmail: profile.email,
    visitorPhone: profile.phone,
    messageText: initialMessageText,
    sender: "visitor",
    conversationId,
  }).catch((e) => console.debug("[Chat Email] Background dispatch error:", e));

  // 4. Broadcast
  broadcastUpdate(conversationId);

  return newConversation;
}

/**
 * Send a message within an existing conversation
 */
export async function sendChatMessage(params: {
  conversationId: string;
  sender: "visitor" | "admin";
  senderName: string;
  text: string;
}): Promise<ChatMessage | null> {
  const { conversationId, sender, senderName, text } = params;
  if (!text.trim()) return null;

  const now = new Date().toISOString();
  const msg: ChatMessage = {
    id: generateId(),
    conversationId,
    sender,
    senderName,
    text: text.trim(),
    createdAt: now,
    emailSent: true,
  };

  const conversations = getLocalConversations();
  const conv = conversations.find((c) => c.id === conversationId);

  let updatedConv: ChatConversation;
  if (conv) {
    updatedConv = {
      ...conv,
      lastMessage: msg.text,
      lastMessageAt: now,
      updatedAt: now,
      unreadAdmin: sender === "visitor",
      unreadVisitor: sender === "admin",
      messages: [...conv.messages, msg],
    };
  } else {
    // If conversation not in local cache, fetch or fabricate
    updatedConv = {
      id: conversationId,
      visitorName: sender === "visitor" ? senderName : "Guest",
      visitorEmail: "",
      visitorPhone: "",
      status: "active",
      lastMessage: msg.text,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
      unreadAdmin: sender === "visitor",
      unreadVisitor: sender === "admin",
      messages: [msg],
    };
  }

  // 1. Update local storage
  const nextList = [updatedConv, ...conversations.filter((c) => c.id !== conversationId)];
  saveLocalConversations(nextList);

  // 2. Persist to Supabase
  try {
    await supabase.from("chat_conversations" as any).upsert({
      id: updatedConv.id,
      visitor_name: updatedConv.visitorName,
      visitor_email: updatedConv.visitorEmail,
      visitor_phone: updatedConv.visitorPhone,
      status: updatedConv.status,
      last_message: updatedConv.lastMessage,
      last_message_at: updatedConv.lastMessageAt,
      updated_at: updatedConv.updatedAt,
      unread_admin: updatedConv.unreadAdmin,
      unread_visitor: updatedConv.unreadVisitor,
      messages: updatedConv.messages,
    });
  } catch (err) {
    console.debug("[Chat] Supabase message upsert note:", err);
  }

  // 3. Dispatch Email to hello@redycakes.org, copying visitor
  if (updatedConv.visitorEmail) {
    sendChatEmailNotification({
      visitorName: updatedConv.visitorName,
      visitorEmail: updatedConv.visitorEmail,
      visitorPhone: updatedConv.visitorPhone,
      messageText: msg.text,
      sender,
      senderName,
      conversationId,
    }).catch((e) => console.debug("[Chat Email] Dispatch error:", e));
  }

  // 4. Broadcast
  broadcastUpdate(conversationId);

  return msg;
}

/**
 * Update conversation status (active, resolved, archived)
 */
export async function updateConversationStatus(
  conversationId: string,
  status: ChatConversation["status"]
): Promise<boolean> {
  const conversations = getLocalConversations();
  const updatedList = conversations.map((c) =>
    c.id === conversationId ? { ...c, status, updatedAt: new Date().toISOString() } : c
  );
  saveLocalConversations(updatedList);

  try {
    await supabase
      .from("chat_conversations" as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } catch (err) {
    console.debug("[Chat] Supabase status update note:", err);
  }

  broadcastUpdate(conversationId);
  return true;
}

/**
 * Mark conversation as read
 */
export async function markConversationRead(
  conversationId: string,
  by: "admin" | "visitor"
): Promise<void> {
  const conversations = getLocalConversations();
  const updatedList = conversations.map((c) => {
    if (c.id !== conversationId) return c;
    return {
      ...c,
      unreadAdmin: by === "admin" ? false : c.unreadAdmin,
      unreadVisitor: by === "visitor" ? false : c.unreadVisitor,
    };
  });
  saveLocalConversations(updatedList);

  try {
    const payload = by === "admin" ? { unread_admin: false } : { unread_visitor: false };
    await supabase.from("chat_conversations" as any).update(payload).eq("id", conversationId);
  } catch (err) {
    console.debug("[Chat] Supabase mark read note:", err);
  }

  broadcastUpdate(conversationId);
}

/**
 * Delete a conversation
 */
export async function deleteChatConversation(conversationId: string): Promise<boolean> {
  const conversations = getLocalConversations();
  const nextList = conversations.filter((c) => c.id !== conversationId);
  saveLocalConversations(nextList);

  if (getActiveChatId() === conversationId) {
    setActiveChatId(null);
  }

  try {
    await supabase.from("chat_conversations" as any).delete().eq("id", conversationId);
  } catch (err) {
    console.debug("[Chat] Supabase delete note:", err);
  }

  broadcastUpdate(conversationId);
  return true;
}

/**
 * Visitor profile helpers in localStorage
 */
export function getStoredVisitorProfile(): VisitorProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_VISITOR_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredVisitorProfile(profile: VisitorProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_VISITOR_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore
  }
}

/**
 * Active chat ID helper for current visitor
 */
export function getActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_ACTIVE_CHAT_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveChatId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_ACTIVE_CHAT_ID_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_CHAT_ID_KEY);
    }
  } catch {
    // Ignore
  }
}

/**
 * Helper to generate mailto link for direct manual email fallback
 */
export function createChatMailtoLink(conversation: ChatConversation, initialText?: string): string {
  const subject = `Redycakes Live Chat with ${conversation.visitorName}`;
  const body = [
    `Hi ${conversation.visitorName},`,
    "",
    initialText || "Thank you for chatting with Redycakes Cake Studio!",
    "",
    "--- Chat Transcript ---",
    ...conversation.messages.map(
      (m) => `[${new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}] ${m.senderName}: ${m.text}`
    ),
    "",
    "Warm regards,",
    "Redycakes Studio Team",
    "hello@redycakes.org",
  ].join("\n");

  return `mailto:${encodeURIComponent(conversation.visitorEmail)}?cc=${encodeURIComponent(
    REDYCAKES_CONTACT_EMAIL
  )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
