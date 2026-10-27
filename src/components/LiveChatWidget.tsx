import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  User,
  CheckCheck,
  Minimize2,
  Edit2,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import {
  ChatConversation,
  ChatMessage,
  VisitorProfile,
  fetchChatConversation,
  startChatConversation,
  sendChatMessage,
  markConversationRead,
  getStoredVisitorProfile,
  setStoredVisitorProfile,
  getActiveChatId,
  setActiveChatId,
  REDYCAKES_CONTACT_EMAIL,
  createChatMailtoLink,
} from "@/lib/chatService";

// Gentle audio chime using Web Audio API when admin replies
function playChatNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio permission or playback restrictions
  }
}

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile | null>(null);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Form states for onboarding
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formInitialMessage, setFormInitialMessage] = useState("");
  const [formError, setFormError] = useState("");

  // Message input state for active chat
  const [messageText, setMessageText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);

  // Load visitor profile and active chat on mount
  useEffect(() => {
    const profile = getStoredVisitorProfile();
    if (profile) {
      setVisitorProfile(profile);
      setFormName(profile.name);
      setFormEmail(profile.email);
      setFormPhone(profile.phone);
    }

    const activeId = getActiveChatId();
    if (activeId) {
      loadConversation(activeId);
    }
  }, []);

  // Poll conversation updates & listen to broadcast events
  useEffect(() => {
    const activeId = activeConversation?.id || getActiveChatId();
    if (!activeId) return;

    let isMounted = true;

    const checkUpdates = async () => {
      const conv = await fetchChatConversation(activeId);
      if (isMounted && conv) {
        setActiveConversation((prev) => {
          // Play chime if new admin message arrived
          if (prev && conv.messages.length > prev.messages.length) {
            const lastMsg = conv.messages[conv.messages.length - 1];
            if (lastMsg && lastMsg.sender === "admin") {
              playChatNotificationChime();
            }
          }
          return conv;
        });

        if (conv.unreadVisitor && !isOpen) {
          setUnreadCount(1);
        }
      }
    };

    // Polling interval (every 3.5s while active)
    const interval = setInterval(checkUpdates, 3500);

    // Listen to custom cross-tab or current-tab events
    const handleBroadcast = (e: any) => {
      const convId = e?.detail?.conversationId;
      if (!convId || convId === activeId) {
        checkUpdates();
      }
    };

    window.addEventListener("redycakes_chat_event", handleBroadcast);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("redycakes_chat_event", handleBroadcast);
    };
  }, [activeConversation?.id, isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && activeConversation?.messages) {
      if (activeConversation.messages.length > prevMessagesCountRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      prevMessagesCountRef.current = activeConversation.messages.length;
    }
  }, [activeConversation?.messages, isOpen]);

  // Mark conversation read when window is opened
  useEffect(() => {
    if (isOpen && activeConversation) {
      setUnreadCount(0);
      if (activeConversation.unreadVisitor) {
        markConversationRead(activeConversation.id, "visitor");
      }
    }
  }, [isOpen, activeConversation?.id]);

  const loadConversation = async (id: string) => {
    const conv = await fetchChatConversation(id);
    if (conv) {
      setActiveConversation(conv);
      if (conv.unreadVisitor && !isOpen) {
        setUnreadCount(1);
      }
    }
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const name = formName.trim();
    const email = formEmail.trim();
    const phone = formPhone.trim();
    const message = formInitialMessage.trim();

    if (!name) {
      setFormError("Please enter your name.");
      return;
    }
    if (!email || !email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!phone || phone.length < 7) {
      setFormError("Please enter a valid phone number.");
      return;
    }
    if (!message) {
      setFormError("Please enter your message or question.");
      return;
    }

    setIsStartingChat(true);
    try {
      const profile: VisitorProfile = { name, email, phone };
      setVisitorProfile(profile);

      const conv = await startChatConversation(profile, message);
      setActiveConversation(conv);
      setFormInitialMessage("");
      setIsEditingProfile(false);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to start chat", err);
      setFormError("Failed to initiate chat. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeConversation || isSendingMessage) return;

    const textToSend = messageText.trim();
    setMessageText("");
    setIsSendingMessage(true);

    try {
      const newMsg = await sendChatMessage({
        conversationId: activeConversation.id,
        sender: "visitor",
        senderName: visitorProfile?.name || "Visitor",
        text: textToSend,
      });

      if (newMsg) {
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                lastMessage: textToSend,
                lastMessageAt: newMsg.createdAt,
                messages: [...prev.messages, newMsg],
              }
            : null
        );
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    const email = formEmail.trim();
    const phone = formPhone.trim();
    if (!name || !email || !phone) return;

    const updatedProfile: VisitorProfile = { name, email, phone };
    setVisitorProfile(updatedProfile);
    setStoredVisitorProfile(updatedProfile);
    setIsEditingProfile(false);
  };

  const handleStartNewChat = () => {
    if (confirm("Would you like to start a brand new conversation? Your previous messages are safely stored.")) {
      setActiveChatId(null);
      setActiveConversation(null);
      setFormInitialMessage("");
    }
  };

  const handleQuickQuestion = (question: string) => {
    if (activeConversation) {
      setMessageText(question);
    } else {
      setFormInitialMessage(question);
    }
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Close live chat" : "Open live chat with Redycakes Studio"}
          className={`relative group flex items-center gap-2.5 rounded-full px-5 py-3.5 font-semibold text-sm shadow-2xl transition-all duration-300 transform active:scale-95 ${
            isOpen
              ? "bg-foreground text-background hover:opacity-90"
              : "bg-gradient-to-r from-primary via-purple-600 to-primary text-white hover:shadow-primary/30 hover:scale-105"
          }`}
        >
          {isOpen ? (
            <>
              <X className="h-5 w-5" />
              <span className="hidden sm:inline">Close</span>
            </>
          ) : (
            <>
              <div className="relative">
                <MessageCircle className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <span className="tracking-wide">Chat with us</span>
            </>
          )}

          {/* Unread badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-lg animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* CHAT POPUP WINDOW */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[580px] max-h-[85vh] flex flex-col rounded-3xl border border-border/90 bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 backdrop-blur-md">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-primary/15 via-accent/30 to-background border-b border-border/80 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-10 w-10 rounded-2xl bg-primary/20 border border-primary/30 p-1 flex items-center justify-center shrink-0 shadow-soft">
                <img src="/redycakes_logo.png" alt="Redycakes" className="h-full w-full object-contain" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-sm font-bold truncate text-foreground">
                    Redycakes Studio
                  </h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Typically replies in minutes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              {activeConversation && (
                <button
                  type="button"
                  onClick={() => loadConversation(activeConversation.id)}
                  title="Refresh chat"
                  className="p-1.5 rounded-xl hover:bg-accent hover:text-foreground transition-colors"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-1.5 rounded-xl hover:bg-accent hover:text-foreground transition-colors"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* EMAIL COPY DISCLAIMER BANNER */}
          <div className="bg-primary/5 border-b border-border/60 px-3.5 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                All chats are emailed to <strong className="text-foreground">{REDYCAKES_CONTACT_EMAIL}</strong> & CC sender
              </span>
            </span>
          </div>

          {/* BODY: ONBOARDING FORM vs ACTIVE THREAD */}
          {!activeConversation ? (
            /* ONBOARDING FORM (NAME, EMAIL, PHONE) */
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>Welcome to Redycakes Cake Studio!</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Please tell us who you are so our cake decorators can assist you. You don't need an account—just your name, email, and phone number.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleStartChat} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <User className="h-3 w-3 text-primary" /> Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Jessica Sterling"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <Mail className="h-3 w-3 text-primary" /> Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="jessica@example.com"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <Phone className="h-3 w-3 text-primary" /> Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+44 7123 456789"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    How can we help today? *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formInitialMessage}
                    onChange={(e) => setFormInitialMessage(e.target.value)}
                    placeholder="e.g. Inquiring about a 3-tier rustic wedding cake for July 18th in Surrey..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                {/* Quick suggestions */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Quick suggestions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "🎂 Wedding cake quote & dates",
                      "📦 Order tasting sample box",
                      "🌱 Vegan & gluten-free options",
                      "🚚 London delivery & setup",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleQuickQuestion(suggestion)}
                        className="text-[11px] rounded-lg border border-border bg-accent/30 hover:bg-primary/10 hover:border-primary/40 px-2 py-1 text-foreground transition-colors text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isStartingChat}
                  className="w-full mt-2 btn btn-primary py-2.5 text-xs font-semibold shadow-soft hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isStartingChat ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting with Studio...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Start Chat
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ACTIVE CHAT THREAD */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Visitor Contact Header Chip */}
              <div className="px-3.5 py-2 bg-secondary/30 border-b border-border/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                  <span>Chatting as</span>
                  <strong className="text-foreground truncate">{visitorProfile?.name}</strong>
                  <span className="text-[11px] opacity-70 truncate">({visitorProfile?.email})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile((p) => !p)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                    title="Edit contact details"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <span className="text-muted-foreground/30">•</span>
                  <button
                    type="button"
                    onClick={handleStartNewChat}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    title="Start fresh conversation"
                  >
                    New
                  </button>
                </div>
              </div>

              {/* In-line Profile Edit Form */}
              {isEditingProfile && (
                <form
                  onSubmit={handleUpdateProfile}
                  className="p-3 bg-card border-b border-border/80 space-y-2 text-xs animate-in slide-in-from-top-2"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="rounded-lg border border-border px-2 py-1 text-xs"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="rounded-lg border border-border px-2 py-1 text-xs"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="rounded-lg border border-border px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="text-[11px] text-muted-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Save Info
                    </button>
                  </div>
                </form>
              )}

              {/* MESSAGES SCROLL AREA */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {/* Studio Welcome Automated Message */}
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    R
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-accent/40 border border-border/60 p-3 text-xs text-foreground shadow-soft space-y-1">
                    <p className="font-semibold text-[11px] text-primary">Redycakes Studio Concierge</p>
                    <p className="leading-relaxed">
                      Hi {visitorProfile?.name || "there"}! 👋 Thank you for messaging us. How can we make your upcoming celebration special today?
                    </p>
                    <p className="text-[9px] text-muted-foreground text-right">Just now</p>
                  </div>
                </div>

                {/* Conversation Messages */}
                {activeConversation.messages.map((msg) => {
                  const isVisitor = msg.sender === "visitor";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-soft space-y-1 ${
                          isVisitor
                            ? "rounded-tr-sm bg-primary text-primary-foreground"
                            : "rounded-tl-sm bg-accent/50 text-foreground border border-border/80"
                        }`}
                      >
                        {!isVisitor && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-primary mb-0.5">
                            <span>{msg.senderName || "Redycakes Admin"}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-primary/15">Team</span>
                          </div>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] ${
                            isVisitor ? "text-primary-foreground/75" : "text-muted-foreground"
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isVisitor && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* QUICK CHIP SUGGESTIONS BAR */}
              <div className="px-3 py-1.5 bg-accent/10 border-t border-border/40 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold shrink-0">Ask:</span>
                {[
                  "Delivery availability?",
                  "Price quote inquiry",
                  "Book tasting box",
                  "Dietary/Allergies",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setMessageText(chip)}
                    className="whitespace-nowrap px-2 py-0.5 rounded-full border border-border/80 bg-background hover:bg-primary/10 hover:border-primary/40 text-foreground text-[10px] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* MESSAGE INPUT BAR */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-card border-t border-border/80 flex items-end gap-2 shrink-0"
              >
                <div className="relative flex-1">
                  <textarea
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send)"
                    className="w-full max-h-24 min-h-[38px] rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!messageText.trim() || isSendingMessage}
                  className="h-[38px] w-[38px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-40 shrink-0 shadow-soft"
                  title="Send message"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>

              {/* FOOTER DIRECT EMAIL FALLBACK */}
              <div className="px-3 py-1.5 bg-secondary/40 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Emailed to {REDYCAKES_CONTACT_EMAIL}</span>
                <a
                  href={createChatMailtoLink(activeConversation)}
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                  title="Send transcript via email app"
                >
                  Email copy <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
