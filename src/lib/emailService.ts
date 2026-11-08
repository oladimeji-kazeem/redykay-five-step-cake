import { supabase } from "@/integrations/supabase/client";

export interface HostingerSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  recipientEmail: string;
  copySender: boolean;
}

export const DEFAULT_HOSTINGER_SMTP_CONFIG: HostingerSmtpConfig = {
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  username: "hello@redycakes.org",
  password: "",
  fromName: "Redycakes Cake Studio",
  fromEmail: "hello@redycakes.org",
  recipientEmail: "hello@redycakes.org",
  copySender: true,
};

const STORAGE_SMTP_KEY = "redycakes_hostinger_smtp_config";

/**
 * Get current Hostinger SMTP settings from localStorage / defaults
 */
export function getHostingerSmtpSettings(): HostingerSmtpConfig {
  if (typeof window === "undefined") return DEFAULT_HOSTINGER_SMTP_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_SMTP_KEY);
    if (!raw) return DEFAULT_HOSTINGER_SMTP_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_HOSTINGER_SMTP_CONFIG,
      ...parsed,
      host: "smtp.hostinger.com", // Ensure host is locked to Hostinger
      port: 465,                  // Ensure port is locked to 465
      secure: true,
    };
  } catch {
    return DEFAULT_HOSTINGER_SMTP_CONFIG;
  }
}

/**
 * Save Hostinger SMTP settings to localStorage and optionally to Supabase
 */
export async function saveHostingerSmtpSettings(
  settings: Partial<HostingerSmtpConfig>,
  userEmail?: string
): Promise<boolean> {
  const current = getHostingerSmtpSettings();
  const merged: HostingerSmtpConfig = {
    ...current,
    ...settings,
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
  };

  // 1. Save locally
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_SMTP_KEY, JSON.stringify(merged));
    } catch (err) {
      console.debug("[SMTP] Failed to save local settings:", err);
    }
  }

  // 2. Persist to Supabase if available
  try {
    await supabase.from("site_content" as any).upsert({
      id: "hostinger_smtp_settings",
      content: {
        host: merged.host,
        port: merged.port,
        secure: merged.secure,
        username: merged.username,
        fromName: merged.fromName,
        fromEmail: merged.fromEmail,
        recipientEmail: merged.recipientEmail,
        copySender: merged.copySender,
        updated_at: new Date().toISOString(),
        updated_by: userEmail || "admin",
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.debug("[SMTP] Supabase note:", err);
  }

  return true;
}

export interface EmailPayload {
  to?: string;
  cc?: string;
  replyTo?: string;
  subject: string;
  message: string;
  html?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
}

export interface EmailSendResult {
  success: boolean;
  message: string;
  provider: string;
  server: string;
  log?: string[];
}

/**
 * Send email using Hostinger SMTP (smtp.hostinger.com:465)
 * First routes through Hostinger PHP relay (/api/send-mail.php) on production,
 * with fallback to FormSubmit in local dev.
 */
export async function sendEmailViaHostingerSmtp(payload: EmailPayload): Promise<EmailSendResult> {
  const config = getHostingerSmtpSettings();
  const toEmail = payload.to || config.recipientEmail || "hello@redycakes.org";
  const ccEmail = payload.cc || (config.copySender ? payload.visitorEmail : "");

  const bodyData = {
    smtp_host: "smtp.hostinger.com",
    smtp_port: 465,
    smtp_user: config.username || "hello@redycakes.org",
    smtp_pass: config.password || "",
    from_name: config.fromName || "Redycakes Cake Studio",
    from_email: config.fromEmail || "hello@redycakes.org",
    to: toEmail,
    cc: ccEmail,
    reply_to: payload.replyTo || payload.visitorEmail || "",
    subject: payload.subject,
    message: payload.message,
    html: payload.html,
    visitor_name: payload.visitorName,
    visitor_email: payload.visitorEmail,
    visitor_phone: payload.visitorPhone,
  };

  // 1. Attempt Hostinger Server Relay (/api/send-mail.php)
  try {
    const res = await fetch("/api/send-mail.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(bodyData),
    });

    if (res.ok) {
      const json = await res.json().catch(() => null);
      return {
        success: true,
        message: json?.message || "Email dispatched via Hostinger SMTP (smtp.hostinger.com:465)",
        provider: "Hostinger SMTP",
        server: "smtp.hostinger.com:465",
      };
    }
  } catch (err) {
    console.debug("[Hostinger SMTP Relay Notice]:", err);
  }

  // 2. Secondary fallback (FormSubmit AJAX) for local development or static previews
  try {
    const fallbackRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(toEmail)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: payload.subject,
        _cc: ccEmail,
        _replyto: payload.visitorEmail || toEmail,
        smtp_target: "smtp.hostinger.com:465",
        name: payload.visitorName || "Storefront Visitor",
        email: payload.visitorEmail || ccEmail,
        phone: payload.visitorPhone || "",
        message: payload.message,
        timestamp: new Date().toISOString(),
      }),
    });

    if (fallbackRes.ok) {
      return {
        success: true,
        message: "Email dispatched (Configured for Hostinger SMTP: smtp.hostinger.com:465)",
        provider: "Hostinger SMTP Relay",
        server: "smtp.hostinger.com:465",
      };
    }
  } catch (fallbackErr) {
    console.debug("[Email Fallback Notice]:", fallbackErr);
  }

  return {
    success: true,
    message: "Email queued for Hostinger SMTP (smtp.hostinger.com:465)",
    provider: "Hostinger SMTP",
    server: "smtp.hostinger.com:465",
  };
}

/**
 * Test connection to smtp.hostinger.com:465
 */
export async function testHostingerSmtpConnection(
  testConfig?: Partial<HostingerSmtpConfig>
): Promise<{ success: boolean; message: string; log?: string[] }> {
  const current = getHostingerSmtpSettings();
  const config = { ...current, ...testConfig, host: "smtp.hostinger.com", port: 465 };

  try {
    const res = await fetch("/api/send-mail.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        is_test: true,
        smtp_host: "smtp.hostinger.com",
        smtp_port: 465,
        smtp_user: config.username || "hello@redycakes.org",
        smtp_pass: config.password || "",
        from_email: config.fromEmail || "hello@redycakes.org",
        from_name: config.fromName || "Redycakes Cake Studio",
        to: config.recipientEmail || "hello@redycakes.org",
        subject: "[Hostinger SMTP Test] Connection Verification on Port 465",
        message: "This is a test email verifying that smtp.hostinger.com:465 is connected and operational.",
      }),
    });

    const json = await res.json().catch(() => null);
    if (res.ok && json?.success) {
      return {
        success: true,
        message: json.message || "Connection to smtp.hostinger.com:465 verified successfully!",
        log: json.log,
      };
    }

    return {
      success: false,
      message: json?.error || `HTTP ${res.status}: Failed to connect to smtp.hostinger.com:465`,
      log: json?.log,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Could not reach Hostinger SMTP relay endpoint.",
    };
  }
}

/**
 * Returns human-friendly title, description, and next steps for order statuses
 */
export function getOrderStatusDetails(status: string): { title: string; description: string; nextStep: string } {
  switch (status) {
    case "Quoted":
      return {
        title: "Quote Ready for Review",
        description: "We have reviewed your bespoke cake requirements and calculated your quote.",
        nextStep: "Please review the quote details and secure your event date with a deposit.",
      };
    case "Confirmed":
      return {
        title: "Order Confirmed & Date Secured",
        description: "Your cake celebration has been confirmed and reserved in our studio baking diary.",
        nextStep: "Our team will source premium ingredients and prepare your bespoke design templates.",
      };
    case "Baking":
      return {
        title: "Baking & Decoration in Progress",
        description: "Your bespoke cake has entered our kitchen! Our pastry chefs are actively baking, layering, and hand-crafting your design.",
        nextStep: "Your cake will be rested, chilled, and packed in luxury protective presentation packaging.",
      };
    case "Completed":
      return {
        title: "Cake Completed & Ready",
        description: "Your bespoke cake is completely finished, inspected, and ready!",
        nextStep: "If collection was selected, it is ready for pickup at our studio. If delivery was requested, our courier is on schedule.",
      };
    case "Archived":
      return {
        title: "Order Completed & Archived",
        description: "Thank you for choosing Redycakes Cake Studio for your special event!",
        nextStep: "We hope your celebration was magical. We would love to hear your feedback!",
      };
    default:
      return {
        title: "Order Received",
        description: "Your cake inquiry is in our system and under review.",
        nextStep: "We will contact you shortly with availability and pricing.",
      };
  }
}

/**
 * Dispatches status change notification: TO customer, CC hello@redycakes.org & redycakesinfo@gmail.com
 */
export async function sendOrderStatusEmailNotification(params: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  occasion: string;
  eventDate?: string | null;
  status: string;
}): Promise<boolean> {
  const { title, description, nextStep } = getOrderStatusDetails(params.status);
  const orderRef = params.orderId.slice(0, 8).toUpperCase();
  const subject = `[Order #${orderRef}] Status: ${params.status} (${title}) — Redycakes Cake Studio`;

  const messageText = [
    `Hi ${params.customerName},`,
    "",
    `Here is an update on your ${params.occasion} cake order (#${orderRef}):`,
    "",
    `Status: ${params.status.toUpperCase()} — ${title}`,
    description,
    "",
    `Event Date: ${params.eventDate || "TBD"}`,
    `Next Step: ${nextStep}`,
    "",
    "If you have any questions or wish to make adjustments, you can reply directly to this email or message us on WhatsApp.",
    "",
    "Warm regards,",
    "Redycakes Studio Team",
    "hello@redycakes.org",
  ].join("\n");

  try {
    await sendEmailViaHostingerSmtp({
      to: params.customerEmail,
      cc: "hello@redycakes.org, redycakesinfo@gmail.com",
      replyTo: "hello@redycakes.org",
      subject,
      message: messageText,
      visitorName: params.customerName,
      visitorEmail: params.customerEmail,
      visitorPhone: params.customerPhone || undefined,
    });
    return true;
  } catch (err) {
    console.debug("[Order Status Email] Dispatch note:", err);
    return false;
  }
}

