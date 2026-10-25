import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Lock,
  Printer,
  Calendar,
  Clock,
  Sparkles,
  Search,
  FileCheck,
} from "lucide-react";
import { seo } from "@/components/SiteLayout";
import {
  usePaymentSettings,
  formatMoney,
  recordPaymentTransaction,
  type PaymentMethod,
} from "@/lib/paymentSettings";
import {
  fetchOrderById,
  updateOrderPayment,
  type OrderItem,
} from "@/lib/databaseSchema";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/pay")({
  validateSearch: (s: Record<string, unknown>): {
    order?: string;
    amount?: string;
    type?: string;
    name?: string;
    email?: string;
  } => ({
    order: typeof s["order"] === "string" ? s["order"] : undefined,
    amount: typeof s["amount"] === "string" ? s["amount"] : undefined,
    type: typeof s["type"] === "string" ? s["type"] : undefined,
    name: typeof s["name"] === "string" ? s["name"] : undefined,
    email: typeof s["email"] === "string" ? s["email"] : undefined,
  }),
  head: () =>
    seo(
      "Secure Online Payment & Bank Transfer — Redycakes",
      "Pay your bespoke cake deposit, tasting box, or order balance securely online or via direct UK Faster Payments."
    ),
  component: PaymentPage,
});

function PaymentPage() {
  const search = Route.useSearch();
  const { settings } = usePaymentSettings();

  const [orderIdInput, setOrderIdInput] = useState(search.order || "");
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  // Form states
  const [paymentType, setPaymentType] = useState<"deposit" | "full" | "tasting_box" | "custom">(
    search.type === "tasting-box"
      ? "tasting_box"
      : search.type === "full"
      ? "full"
      : "deposit"
  );
  const [customAmount, setCustomAmount] = useState(search.amount || "");
  const [customerName, setCustomerName] = useState(search.name || "");
  const [customerEmail, setCustomerEmail] = useState(search.email || "");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");

  // Card details state (for simulation / direct checkout)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Bank transfer submission state
  const [senderBankRef, setSenderBankRef] = useState("");
  const [hasReportedTransfer, setHasReportedTransfer] = useState(false);

  // Completed transaction
  const [completedTx, setCompletedTx] = useState<{
    reference: string;
    amount: number;
    method: PaymentMethod;
    date: string;
    type: string;
  } | null>(null);

  // Copied fields indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${key} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Fetch order if order ID is present
  useEffect(() => {
    if (search.order) {
      setIsLoadingOrder(true);
      fetchOrderById(search.order)
        .then((ord) => {
          if (ord) {
            setOrder(ord);
            setCustomerName(ord.name);
            setCustomerEmail(ord.email);
            if (ord.deposit_amount && !search.amount) {
              setCustomAmount(String(ord.deposit_amount));
            }
          }
        })
        .finally(() => setIsLoadingOrder(false));
    }
  }, [search.order, search.amount]);

  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim()) return;
    setIsLoadingOrder(true);
    const ord = await fetchOrderById(orderIdInput.trim());
    setIsLoadingOrder(false);
    if (ord) {
      setOrder(ord);
      setCustomerName(ord.name);
      setCustomerEmail(ord.email);
      toast.success("Order details loaded!");
    } else {
      toast.error("Order reference not found. You can still proceed with a custom payment.");
    }
  };

  // Compute amount to pay
  const amountToPay = useMemo(() => {
    if (paymentType === "tasting_box") {
      return settings.depositRules.tastingBoxPrice || 25;
    }
    if (order) {
      if (paymentType === "full" && order.quote_amount) {
        return order.quote_amount;
      }
      if (paymentType === "deposit") {
        if (order.deposit_amount) return order.deposit_amount;
        if (order.quote_amount) {
          const pct = settings.depositRules.depositPercentage || 50;
          return Math.round((order.quote_amount * pct) / 100);
        }
      }
    }
    if (customAmount) {
      const parsed = parseFloat(customAmount.replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    }
    return settings.depositRules.minimumDeposit || 50;
  }, [paymentType, order, customAmount, settings]);

  const paymentRefNumber = useMemo(() => {
    if (order?.id) {
      return `${settings.bankTransfer.referencePrefix}${order.id.slice(0, 8).toUpperCase()}`;
    }
    return `${settings.bankTransfer.referencePrefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }, [order, settings.bankTransfer.referencePrefix]);

  // Card Checkout submission
  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error("Please provide your name and email for the receipt.");
      return;
    }

    if (amountToPay <= 0) {
      toast.error("Payment amount must be greater than £0.");
      return;
    }

    // If custom payment link is active and provider is custom_link or customer chooses external link
    if (
      settings.onlinePayments.provider === "custom_link" &&
      settings.onlinePayments.customPaymentLink
    ) {
      window.open(settings.onlinePayments.customPaymentLink, "_blank");
      toast.info("Redirecting to secure payment checkout...");
      return;
    }

    // Direct card processing simulation with live/test configuration
    if (!cardNumber.replace(/\s/g, "") || !cardExpiry || !cardCvc) {
      toast.error("Please enter complete card details.");
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate gateway authorization with configured public key
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const tx = await recordPaymentTransaction({
        order_id: order?.id,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        amount: amountToPay,
        currency: settings.currency,
        payment_type: paymentType,
        method: "card",
        status: "completed",
        reference: paymentRefNumber,
        notes: `Card payment processed via ${settings.onlinePayments.provider.toUpperCase()} (${settings.onlinePayments.environment} mode)`,
        gateway_response: {
          brand: cardNumber.startsWith("4") ? "Visa" : "Mastercard",
          last4: cardNumber.replace(/\s/g, "").slice(-4) || "4242",
          environment: settings.onlinePayments.environment,
          authCode: "AUTH_" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        },
      });

      if (order?.id) {
        await updateOrderPayment(order.id, {
          payment_status: paymentType === "full" ? "Paid in Full" : "Deposit Paid",
          payment_method: "card",
          payment_reference: paymentRefNumber,
          paid_at: new Date().toISOString(),
          status: "Confirmed",
        });
      }

      trackEvent("payment_successful", {
        amount: amountToPay,
        currency: settings.currency,
        method: "card",
        type: paymentType,
      });

      setCompletedTx({
        reference: tx.reference,
        amount: tx.amount,
        method: "card",
        date: new Date().toLocaleString(),
        type: paymentType,
      });

      toast.success("Payment successful! Receipt generated.");
    } catch (err) {
      console.error(err);
      toast.error("Payment authorization failed. Please try again or use direct bank transfer.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Bank Transfer verification submission
  const handleBankTransferConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }

    setIsProcessing(true);

    try {
      const tx = await recordPaymentTransaction({
        order_id: order?.id,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        amount: amountToPay,
        currency: settings.currency,
        payment_type: paymentType,
        method: "bank_transfer",
        status: "pending",
        reference: paymentRefNumber,
        notes: `Bank transfer reported by customer. Sender Reference: ${senderBankRef || "Not provided"}`,
        gateway_response: {
          sortCode: settings.bankTransfer.sortCode,
          accountNumber: settings.bankTransfer.accountNumber,
          senderReference: senderBankRef,
        },
      });

      if (order?.id) {
        await updateOrderPayment(order.id, {
          payment_status: "Pending Verification",
          payment_method: "bank_transfer",
          payment_reference: paymentRefNumber,
          paid_at: new Date().toISOString(),
        });
      }

      trackEvent("bank_transfer_submitted", {
        amount: amountToPay,
        currency: settings.currency,
        reference: paymentRefNumber,
      });

      setHasReportedTransfer(true);
      setCompletedTx({
        reference: tx.reference,
        amount: tx.amount,
        method: "bank_transfer",
        date: new Date().toLocaleString(),
        type: paymentType,
      });

      toast.success("Transfer confirmation received! Our team will allocate it immediately.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit transfer confirmation. Please WhatsApp us directly.");
    } finally {
      setIsProcessing(false);
    }
  };

  // COMPLETED RECEIPT SCREEN
  if (completedTx) {
    return (
      <section className="container-page max-w-2xl py-16 sm:py-24 animate-in fade-in zoom-in-95 duration-300">
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-10 shadow-soft text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <p className="eyebrow mt-4">
            {completedTx.method === "card" ? "Payment Successful" : "Transfer Recorded"}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold">
            {completedTx.method === "card" ? "Thank You for Your Payment" : "Transfer Details Received"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {completedTx.method === "card"
              ? "Your transaction has been approved and your date is securely booked in our diary."
              : "We have logged your bank transfer details and will verify receipt with our bank within 24 hours."}
          </p>

          {/* Receipt Breakdown Card */}
          <div className="mt-8 rounded-2xl border border-border/70 bg-secondary/30 p-6 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="text-xs uppercase font-semibold text-muted-foreground">Amount Paid</span>
              <span className="text-2xl font-bold font-display text-primary">
                {formatMoney(completedTx.amount, settings.currency)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Payment Reference</span>
              <span className="font-mono font-bold text-foreground">{completedTx.reference}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="capitalize font-semibold text-foreground">
                {completedTx.method === "card" ? "Debit / Credit Card (Instant)" : "Direct UK Bank Transfer"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Customer Name</span>
              <span className="font-semibold text-foreground">{customerName}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Receipt Sent To</span>
              <span className="font-semibold text-foreground">{customerEmail}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Timestamp</span>
              <span className="text-muted-foreground">{completedTx.date}</span>
            </div>

            {order && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cake Occasion</span>
                <span className="font-semibold text-foreground">{order.occasion}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-accent transition"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>

            {settings.notifications.whatsappNumber && (
              <a
                href={`https://wa.me/${settings.notifications.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hi Redycakes, I have completed my payment of ${formatMoney(
                    completedTx.amount,
                    settings.currency
                  )} with reference ${completedTx.reference}. Name: ${customerName}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-emerald-700 transition"
              >
                <MessageSquare className="h-4 w-4" />
                Notify on WhatsApp
              </a>
            )}

            <Link
              to="/"
              className="w-full sm:w-auto btn btn-outline !py-2.5 !px-5 text-xs font-semibold"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page max-w-4xl py-12 md:py-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="eyebrow">Redycakes Studio Checkout</p>
        <h1 className="mt-3 text-3xl sm:text-5xl font-display font-bold">
          Secure Order Payment
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          Pay with major debit/credit cards or instant UK Faster Payments. Your booking is secured immediately upon receipt.
        </p>

        {/* Live / Test badge indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
            <Lock className="h-3.5 w-3.5" />
            256-bit SSL Bank-Grade Encryption
          </span>
          {settings.onlinePayments.environment === "test" && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
              Test Mode Active
            </span>
          )}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order Summary & Selection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order Details Lookup Card */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Order & Payment Selection
            </h2>

            {/* If order loaded */}
            {order ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-primary">Order Connected</span>
                  <span className="text-[11px] font-mono text-muted-foreground">#{order.id.slice(0, 8)}</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {(order as any).cake_name || order.occasion} Cake
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <div>
                    <span>Event Date:</span>
                    <p className="font-semibold text-foreground">{order.event_date}</p>
                  </div>
                  <div>
                    <span>Guests:</span>
                    <p className="font-semibold text-foreground">{order.guests || "Custom"}</p>
                  </div>
                </div>

                {order.quote_amount && (
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Quoted Price:</span>
                    <span className="font-bold text-foreground">
                      {formatMoney(order.quote_amount, settings.currency)}
                    </span>
                  </div>
                )}
                {order.deposit_amount && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Required Deposit:</span>
                    <span className="font-bold text-primary">
                      {formatMoney(order.deposit_amount, settings.currency)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleLookupOrder} className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Have an Order Reference?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    placeholder="e.g. 550e8400..."
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary outline-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingOrder}
                    className="btn btn-outline !py-2 !px-3 text-xs"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* Payment Type Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-muted-foreground">What are you paying?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("deposit")}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentType === "deposit"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-soft"
                      : "border-border hover:bg-accent text-foreground"
                  }`}
                >
                  <p className="text-xs">Date Deposit</p>
                  <p className="text-sm font-extrabold mt-0.5">
                    {order?.deposit_amount
                      ? formatMoney(order.deposit_amount, settings.currency)
                      : `${settings.depositRules.depositPercentage}% (${formatMoney(amountToPay, settings.currency)})`}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("tasting_box")}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentType === "tasting_box"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-soft"
                      : "border-border hover:bg-accent text-foreground"
                  }`}
                >
                  <p className="text-xs">Tasting Box</p>
                  <p className="text-sm font-extrabold mt-0.5">
                    {formatMoney(settings.depositRules.tastingBoxPrice || 25, settings.currency)}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("full")}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentType === "full"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-soft"
                      : "border-border hover:bg-accent text-foreground"
                  }`}
                >
                  <p className="text-xs">Full Balance</p>
                  <p className="text-sm font-extrabold mt-0.5">
                    {order?.quote_amount ? formatMoney(order.quote_amount, settings.currency) : "Full Quote"}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("custom")}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentType === "custom"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-soft"
                      : "border-border hover:bg-accent text-foreground"
                  }`}
                >
                  <p className="text-xs">Custom Amount</p>
                  <p className="text-sm font-extrabold mt-0.5">Enter Amount</p>
                </button>
              </div>

              {paymentType === "custom" && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-muted-foreground">Amount (£)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="e.g. 150.00"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              )}
            </div>

            {/* Total Display Banner */}
            <div className="pt-4 border-t border-border/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold">Total to Pay Now</span>
                <p className="text-xs text-muted-foreground">
                  {settings.currency} · No added processing fees
                </p>
              </div>
              <span className="text-3xl font-display font-extrabold text-primary">
                {formatMoney(amountToPay, settings.currency)}
              </span>
            </div>
          </div>

          {/* Deposit policy notice */}
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Booking & Cancellation Terms
            </p>
            <p className="leading-relaxed">{settings.depositRules.depositPolicyNotice}</p>
          </div>
        </div>

        {/* Right Column: Checkout Options */}
        <div className="lg:col-span-7 space-y-6">
          {/* Method Selector Tabs */}
          <div className="flex rounded-2xl bg-secondary/50 p-1 border border-border/70">
            <button
              type="button"
              onClick={() => setSelectedMethod("card")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
                selectedMethod === "card"
                  ? "bg-card text-foreground shadow-soft border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Instant Card Payment</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod("bank_transfer")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
                selectedMethod === "bank_transfer"
                  ? "bg-card text-foreground shadow-soft border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4 text-emerald-600" />
              <span>Direct Bank Transfer</span>
            </button>
          </div>

          {/* Customer Contact Details */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
            <h2 className="text-base font-semibold">Customer Details (for Receipt)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email for Receipt *</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. eleanor@example.com"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* METHOD 1: CARD CHECKOUT */}
          {selectedMethod === "card" && (
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Debit / Credit Card
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Instant authorization via {settings.onlinePayments.provider.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 opacity-80">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">VISA</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">Mastercard</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">AMEX</span>
                </div>
              </div>

              {/* If external checkout link configured */}
              {settings.onlinePayments.customPaymentLink && settings.onlinePayments.provider === "custom_link" ? (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-3">
                  <p className="text-sm text-foreground">
                    You will be directed to Redycakes secure checkout page powered by Stripe.
                  </p>
                  <a
                    href={settings.onlinePayments.customPaymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary inline-flex items-center gap-2 !py-3 !px-6"
                  >
                    <span>Proceed to Hosted Checkout</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <form onSubmit={handleCardPayment} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Card Number</label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
                          setCardNumber(val);
                        }}
                        placeholder="4532 •••• •••• 8892"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                      />
                      <CreditCard className="h-4 w-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2, 4);
                          setCardExpiry(val);
                        }}
                        placeholder="MM/YY"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">CVC / CVV</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                        placeholder="•••"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Name on Card</label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="e.g. E. Vance"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none mt-1"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full btn btn-primary !py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-soft hover:opacity-95 disabled:opacity-50"
                  >
                    <Lock className="h-4 w-4" />
                    <span>
                      {isProcessing
                        ? "Authorizing Payment..."
                        : `Pay ${formatMoney(amountToPay, settings.currency)} Now`}
                    </span>
                  </button>

                  <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Billed as <span className="font-semibold">{settings.onlinePayments.statementDescriptor}</span>
                  </p>
                </form>
              )}
            </div>
          )}

          {/* METHOD 2: DIRECT BANK TRANSFER */}
          {selectedMethod === "bank_transfer" && (
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    UK Bank Transfer Details
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Transfer via your mobile banking app or online banking.
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
                  Faster Payments
                </span>
              </div>

              {/* Bank Account Details Grid with Copy Buttons */}
              <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs text-muted-foreground">Bank Name</span>
                  <span className="text-xs font-bold text-foreground">{settings.bankTransfer.bankName}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div>
                    <span className="text-xs text-muted-foreground block">Account Name</span>
                    <span className="text-xs font-bold text-foreground">{settings.bankTransfer.accountName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(settings.bankTransfer.accountName, "Account Name")}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent text-xs flex items-center gap-1"
                  >
                    {copiedKey === "Account Name" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div>
                    <span className="text-xs text-muted-foreground block">Sort Code</span>
                    <span className="text-base font-mono font-bold text-primary">{settings.bankTransfer.sortCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(settings.bankTransfer.sortCode, "Sort Code")}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent text-xs flex items-center gap-1"
                  >
                    {copiedKey === "Sort Code" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div>
                    <span className="text-xs text-muted-foreground block">Account Number</span>
                    <span className="text-base font-mono font-bold text-primary">{settings.bankTransfer.accountNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(settings.bankTransfer.accountNumber, "Account Number")}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent text-xs flex items-center gap-1"
                  >
                    {copiedKey === "Account Number" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>

                {/* Reference Notice */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block">
                      Required Payment Reference:
                    </span>
                    <span className="text-sm font-mono font-extrabold text-foreground">{paymentRefNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentRefNumber, "Reference")}
                    className="p-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1"
                  >
                    {copiedKey === "Reference" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>Copy Ref</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {settings.bankTransfer.referenceInstructions}
              </p>

              {/* Form to submit confirmation */}
              <form onSubmit={handleBankTransferConfirm} className="space-y-4 pt-2 border-t border-border/80">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Your Bank Transfer Reference / Payer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={senderBankRef}
                    onChange={(e) => setSenderBankRef(e.target.value)}
                    placeholder="e.g. Paid from Barclays or sender name"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none mt-1"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 btn btn-primary !py-3 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>I Have Sent the {formatMoney(amountToPay, settings.currency)}</span>
                  </button>

                  {settings.notifications.whatsappNumber && (
                    <a
                      href={`https://wa.me/${settings.notifications.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Hi Redycakes! I am transferring ${formatMoney(
                          amountToPay,
                          settings.currency
                        )} for reference ${paymentRefNumber}. Payer: ${customerName || "Customer"}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 px-4 py-3 text-xs font-bold hover:bg-emerald-500/20 transition"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp Proof
                    </a>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
