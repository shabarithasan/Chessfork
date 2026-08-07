"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { COLOR_HEX, ProductArt } from "./product-art";
import {
  EXPRESS_SHIPPING,
  formatINR,
  getProduct,
  GST_RATE,
  lineSavings,
  SHIPPING_FREE_THRESHOLD,
  STANDARD_SHIPPING,
  type CartLine,
} from "./product-data";

type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";
type DeliveryMethod = "standard" | "express";
type PayPhase = "idle" | "initiating" | "authorizing" | "confirmed" | "failed";

interface CheckoutDialogProps {
  lines: CartLine[];
  onClose: () => void;
  onOrderPlaced: (orderId: string) => void;
}

interface BillingState {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  upiId: string;
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
  bank: string;
  wallet: string;
}

const BANKS = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"];
const WALLETS = ["PhonePe", "Google Pay", "Paytm", "Amazon Pay", "Mobikwik"];
const UPI_APPS = [
  { name: "Google Pay", hue: "#4285f4" },
  { name: "PhonePe", hue: "#5f259f" },
  { name: "Paytm", hue: "#00baf2" },
];

const inputClass =
  "w-full rounded-sm border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none transition focus:border-[#2874f0] focus:ring-2 focus:ring-[#2874f0]/20";

const labelClass = "mb-1.5 block text-xs font-bold text-stone-400";

const PAYMENT_TABS: { id: PaymentMethod; icon: React.ReactNode; label: string }[] = [
  { id: "upi", icon: <Smartphone className="size-4" />, label: "UPI" },
  { id: "card", icon: <CreditCard className="size-4" />, label: "Card" },
  { id: "netbanking", icon: <Landmark className="size-4" />, label: "Net Banking" },
  { id: "wallet", icon: <Wallet className="size-4" />, label: "Wallet" },
];

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function cardBrand(cardNumber: string) {
  if (/^4/.test(cardNumber)) return "Visa";
  if (/^5[1-5]/.test(cardNumber)) return "Mastercard";
  if (/^3[47]/.test(cardNumber)) return "Amex";
  if (/^6(?:011|5)/.test(cardNumber)) return "RuPay";
  return "Card";
}

export function CheckoutDialog({ lines, onClose, onOrderPlaced }: CheckoutDialogProps) {
  const [billing, setBilling] = useState<BillingState>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    delivery: "standard",
    payment: "upi",
    upiId: "",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
    bank: BANKS[0],
    wallet: WALLETS[0],
  });
  const [phase, setPhase] = useState<PayPhase>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processingNote, setProcessingNote] = useState("");

  const itemCount = lines.reduce((n, line) => n + line.qty, 0);
  const subtotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = getProduct(line.productId);
        return sum + (product ? product.price * line.qty : 0);
      }, 0),
    [lines],
  );
  const savings = lines.reduce((sum, line) => sum + lineSavings(line), 0);

  const shipping = billing.delivery === "express" ? EXPRESS_SHIPPING : subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const gst = Math.round((subtotal + shipping) * GST_RATE);
  const total = subtotal + shipping + gst;

  function set<K extends keyof BillingState>(key: K, value: BillingState[K]) {
    setBilling((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (billing.fullName.trim().length < 3) next.fullName = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(billing.email)) next.email = "Enter a valid email.";
    if (!/^[6-9]\d{9}$/.test(billing.phone.replace(/\D/g, ""))) next.phone = "Enter a valid 10-digit mobile number.";
    if (billing.address.trim().length < 8) next.address = "Enter your complete address.";
    if (billing.city.trim().length < 2) next.city = "Enter your city.";
    if (billing.state.trim().length < 2) next.state = "Enter your state.";
    if (!/^\d{6}$/.test(billing.pincode)) next.pincode = "Enter a valid 6-digit PIN code.";
    if (billing.payment === "upi" && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(billing.upiId.trim()))
      next.upiId = "Enter a valid UPI ID, e.g. name@okhdfc.";
    if (billing.payment === "card") {
      if (billing.cardNumber.replace(/\D/g, "").length < 16) next.cardNumber = "Enter the full 16-digit card number.";
      if (billing.cardName.trim().length < 3) next.cardName = "Enter the name on the card.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(billing.cardExpiry)) next.cardExpiry = "MM/YY";
      if (!/^\d{3,4}$/.test(billing.cardCvv)) next.cardCvv = "3–4 digits";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function placeOrder() {
    if (!validate()) return;
    setPhase("initiating");
    setProcessingNote("Connecting to secure payment gateway…");

    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing: {
            fullName: billing.fullName,
            email: billing.email,
            phone: billing.phone,
            address: billing.address,
            city: billing.city,
            state: billing.state,
            pincode: billing.pincode,
          },
          delivery: billing.delivery,
          paymentMethod: billing.payment,
          paymentDetail:
            billing.payment === "upi"
              ? billing.upiId
              : billing.payment === "card"
                ? `${cardBrand(billing.cardNumber)} ending ${billing.cardNumber.replace(/\D/g, "").slice(-4)}`
                : billing.payment === "netbanking"
                  ? billing.bank
                  : billing.wallet,
          items: lines,
          amount: total,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Payment failed. Please try again.");

      setPhase("confirmed");
      onOrderPlaced(data.orderId);
    } catch {
      setPhase("failed");
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <div className="relative my-auto w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#2874f0] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white">
              <Lock className="size-4" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-white">Secure Checkout</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/75">
                <ShieldCheck className="size-3.5" /> 256-bit encrypted · Payments by Chessfork Pay
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close checkout"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {phase === "confirmed" ? (
          <SuccessView total={total} onClose={onClose} />
        ) : (
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-white/10 px-6 py-6 lg:border-b-0 lg:border-r">
              <SectionHeading number={1} title="Contact & Delivery Address" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full name</label>
                  <input
                    className={inputClass}
                    placeholder="Arjun Mehta"
                    value={billing.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                  />
                  {errors.fullName ? <p className="mt-1.5 text-xs text-red-600">{errors.fullName}</p> : null}
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="you@example.com"
                    value={billing.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  {errors.email ? <p className="mt-1.5 text-xs text-red-600">{errors.email}</p> : null}
                </div>
                <div>
                  <label className={labelClass}>Mobile number</label>
                  <input
                    className={inputClass}
                    type="tel"
                    placeholder="98765 43210"
                    value={billing.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/[^\d\s]/g, "").slice(0, 11))}
                  />
                  {errors.phone ? <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p> : null}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address</label>
                  <input
                    className={inputClass}
                    placeholder="Flat / house no., street, landmark"
                    value={billing.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                  {errors.address ? <p className="mt-1.5 text-xs text-red-600">{errors.address}</p> : null}
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    className={inputClass}
                    placeholder="Bengaluru"
                    value={billing.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                  {errors.city ? <p className="mt-1.5 text-xs text-red-600">{errors.city}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>State</label>
                    <input
                      className={inputClass}
                      placeholder="Karnataka"
                      value={billing.state}
                      onChange={(e) => set("state", e.target.value)}
                    />
                    {errors.state ? <p className="mt-1.5 text-xs text-red-600">{errors.state}</p> : null}
                  </div>
                  <div>
                    <label className={labelClass}>PIN code</label>
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      placeholder="560001"
                      value={billing.pincode}
                      onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    {errors.pincode ? <p className="mt-1.5 text-xs text-red-600">{errors.pincode}</p> : null}
                  </div>
                </div>
              </div>

              <SectionHeading number={2} title="Delivery Speed" className="mt-8" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DeliveryOption
                  active={billing.delivery === "standard"}
                  title="Standard"
                  eta="4–6 business days"
                  price={subtotal >= SHIPPING_FREE_THRESHOLD ? "FREE" : `₹${STANDARD_SHIPPING}`}
                  onClick={() => set("delivery", "standard")}
                />
                <DeliveryOption
                  active={billing.delivery === "express"}
                  title="Express"
                  eta="2–3 business days"
                  price={`₹${EXPRESS_SHIPPING}`}
                  onClick={() => set("delivery", "express")}
                />
              </div>

              <SectionHeading number={3} title="Payment Options" className="mt-8" />
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {PAYMENT_TABS.map((tab) => (
                  <PaymentTab
                    key={tab.id}
                    active={billing.payment === tab.id}
                    icon={tab.icon}
                    label={tab.label}
                    onClick={() => set("payment", tab.id)}
                  />
                ))}
              </div>

              <div className="mt-4 rounded-sm border border-slate-200 bg-[#131210] p-5">
                {billing.payment === "upi" ? (
                  <div>
                    <p className="text-sm font-bold text-stone-200">Pay with any UPI app</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {UPI_APPS.map((app) => (
                        <button
                          key={app.name}
                          type="button"
                          onClick={() => {
                            set("upiId", `chessfork.${app.name.toLowerCase().replace(/\s/g, "")}@okupi`);
                          }}
                          className="flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-[#2874f0] hover:text-amber-400"
                          style={{ boxShadow: `inset 3px 0 0 ${app.hue}` }}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>
                    <label className={`${labelClass} mt-5`}>Your UPI ID</label>
                    <input
                      className={inputClass}
                      placeholder="yourname@okhdfc"
                      value={billing.upiId}
                      onChange={(e) => set("upiId", e.target.value)}
                    />
                    {errors.upiId ? <p className="mt-1.5 text-xs text-red-600">{errors.upiId}</p> : null}
                    <p className="mt-3 flex items-center gap-2 text-xs text-stone-400">
                      <Smartphone className="size-4 text-amber-400" />
                      A collect request will be sent to your UPI app. Approve it to complete the payment.
                    </p>
                  </div>
                ) : null}

                {billing.payment === "card" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className={labelClass}>Card number</label>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          {cardBrand(billing.cardNumber)}
                        </span>
                      </div>
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={billing.cardNumber}
                        onChange={(e) => set("cardNumber", formatCardNumber(e.target.value))}
                      />
                      {errors.cardNumber ? <p className="mt-1.5 text-xs text-red-600">{errors.cardNumber}</p> : null}
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Name on card</label>
                      <input
                        className={inputClass}
                        placeholder="ARJUN MEHTA"
                        value={billing.cardName}
                        onChange={(e) => set("cardName", e.target.value.toUpperCase())}
                      />
                      {errors.cardName ? <p className="mt-1.5 text-xs text-red-600">{errors.cardName}</p> : null}
                    </div>
                    <div>
                      <label className={labelClass}>Expiry (MM/YY)</label>
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        placeholder="08/28"
                        value={billing.cardExpiry}
                        onChange={(e) => set("cardExpiry", formatExpiry(e.target.value))}
                      />
                      {errors.cardExpiry ? <p className="mt-1.5 text-xs text-red-600">{errors.cardExpiry}</p> : null}
                    </div>
                    <div>
                      <label className={labelClass}>CVV</label>
                      <input
                        className={inputClass}
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="•••"
                        value={billing.cardCvv}
                        onChange={(e) => set("cardCvv", e.target.value.replace(/\D/g, ""))}
                      />
                      {errors.cardCvv ? <p className="mt-1.5 text-xs text-red-600">{errors.cardCvv}</p> : null}
                    </div>
                    <p className="flex items-center gap-2 text-xs text-stone-400 sm:col-span-2">
                      <Lock className="size-4 text-amber-400" />
                      Card details are tokenized and never stored on our servers.
                    </p>
                  </div>
                ) : null}

                {billing.payment === "netbanking" ? (
                  <div>
                    <label className={labelClass}>Select your bank</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BANKS.map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => set("bank", bank)}
                          className={`rounded-sm border px-4 py-3 text-left text-sm font-semibold transition ${
                            billing.bank === bank
                              ? "border-amber-400 bg-amber-400/5 text-amber-400"
                              : "border-slate-300 bg-white text-slate-700 hover:border-[#2874f0]"
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-xs text-stone-400">
                      <Landmark className="size-4 text-amber-400" />
                      You&apos;ll be redirected to your bank&apos;s secure login to authorize the payment.
                    </p>
                  </div>
                ) : null}

                {billing.payment === "wallet" ? (
                  <div>
                    <label className={labelClass}>Choose a wallet</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {WALLETS.map((walletName) => (
                        <button
                          key={walletName}
                          type="button"
                          onClick={() => set("wallet", walletName)}
                          className={`rounded-sm border px-4 py-3 text-left text-sm font-semibold transition ${
                            billing.wallet === walletName
                              ? "border-amber-400 bg-amber-400/5 text-amber-400"
                              : "border-slate-300 bg-white text-slate-700 hover:border-[#2874f0]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Wallet className="size-4" /> {walletName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-[#f1f3f6] px-6 py-6">
              <div className="rounded-sm bg-white p-5">
                <p className="text-xs font-black uppercase tracking-wide text-stone-400">Price Details</p>
                <div className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between text-slate-700">
                    <span>Price ({itemCount} item{itemCount > 1 ? "s" : ""})</span>
                    <span>{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Discount</span>
                    <span className="font-bold text-emerald-400">− {formatINR(savings)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>
                      Delivery Charges
                      {billing.delivery === "express" ? <span className="text-stone-500"> (express)</span> : null}
                    </span>
                    <span className={shipping === 0 ? "font-bold text-emerald-400" : ""}>
                      {shipping === 0 ? "FREE" : formatINR(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>GST (5%)</span>
                    <span>{formatINR(gst)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-2.5 text-base font-black text-stone-100">
                    <span>Total Payable</span>
                    <span>{formatINR(total)}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs font-bold text-emerald-400">You will save {formatINR(savings)} on this order</p>
                {subtotal < SHIPPING_FREE_THRESHOLD ? (
                  <p className="mt-2 text-[11px] text-stone-400">
                    Add <span className="font-bold text-amber-400">{formatINR(SHIPPING_FREE_THRESHOLD - subtotal)}</span> more to
                    unlock free standard shipping.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 rounded-sm bg-white p-5">
                <p className="text-xs font-black uppercase tracking-wide text-stone-400">Order Summary</p>
                <ul className="mt-3 space-y-3">
                  {lines.map((line) => {
                    const product = getProduct(line.productId);
                    if (!product) return null;
                    return (
                      <li key={`${line.productId}-${line.size ?? ""}`} className="flex items-center gap-3">
                        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-slate-200 bg-[#131210] p-1">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover rounded-md" />
                          ) : (
                            <ProductArt art={product.art} color={COLOR_HEX[product.colors[0]] ?? "#1c2130"} />
                          )}
                          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#2874f0] text-[10px] font-black text-white">
                            {line.qty}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-stone-200">{product.name}</p>
                          <p className="text-[11px] text-stone-500">
                            {line.size ? `${line.size} · ` : ""}
                            {formatINR(product.price)}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-stone-100">{formatINR(product.price * line.qty)}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {phase === "failed" ? (
                <p className="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  Payment could not be completed. Please verify your details and try again.
                </p>
              ) : null}

              <button
                type="button"
                onClick={placeOrder}
                disabled={phase === "initiating" || phase === "authorizing"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-sm bg-[#fb641b] py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#e85d13] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phase === "initiating" || phase === "authorizing" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {processingNote}
                  </>
                ) : (
                  <>
                    Pay {formatINR(total)} ·{" "}
                    {billing.payment === "upi"
                      ? "UPI"
                      : billing.payment === "card"
                        ? cardBrand(billing.cardNumber)
                        : billing.payment === "netbanking"
                          ? "Net Banking"
                          : "Wallet"}
                  </>
                )}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
                <ShieldCheck className="size-3.5 text-emerald-400" /> Powered by Chessfork Pay · 100% secure
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ number, title, className = "" }: { number: number; title: string; className?: string }) {
  return (
    <h2 className={`flex items-center gap-3 ${className}`}>
      <span className="flex size-7 items-center justify-center rounded-full bg-[#2874f0] text-sm font-black text-white">
        {number}
      </span>
      <span className="text-base font-black text-stone-100">{title}</span>
    </h2>
  );
}

function DeliveryOption({
  active,
  title,
  eta,
  price,
  onClick,
}: {
  active: boolean;
  title: string;
  eta: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-sm border px-4 py-3.5 text-left transition ${
        active ? "border-amber-400 bg-amber-400/5" : "border-slate-300 bg-white hover:border-[#2874f0]"
      }`}
    >
      <span>
        <span className="flex items-center gap-2 text-sm font-bold text-stone-200">
          <span
            className={`flex size-4 items-center justify-center rounded-full border ${
              active ? "border-[#2874f0] bg-[#2874f0] text-white" : "border-slate-400"
            }`}
          >
            {active ? <BadgeCheck className="size-3" /> : null}
          </span>
          {title}
        </span>
        <span className="mt-1 block pl-6 text-xs text-stone-400">{eta}</span>
      </span>
      <span className={`text-sm font-black ${active ? "text-amber-400" : "text-stone-400"}`}>{price}</span>
    </button>
  );
}

function PaymentTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-sm border px-3 py-3 text-xs font-bold transition ${
        active
          ? "border-amber-400 bg-amber-400/5 text-amber-400"
          : "border-slate-300 bg-white text-stone-400 hover:border-[#2874f0] hover:text-amber-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SuccessView({ total, onClose }: { total: number; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center sm:py-20">
      <div className="flex size-20 items-center justify-center rounded-full border-2 border-[#388e3c]/40 bg-emerald-500/10">
        <svg viewBox="0 0 24 24" className="size-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl font-black tracking-tight text-stone-100 sm:text-3xl">Payment Successful!</h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-stone-400">
        Your order has been placed. A confirmation with tracking details is on its way to your email.
      </p>
      <div className="mt-8 w-full max-w-sm rounded-sm border border-slate-200 bg-[#131210] p-5 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-stone-400">Order total</span>
          <span className="font-black text-emerald-400">{formatINR(total)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-stone-400">Dispatch</span>
          <span className="font-semibold text-stone-200">Within 24 hours</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-stone-400">Support</span>
          <span className="font-semibold text-stone-200">shop@chessfork.in</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-8 flex items-center gap-2 rounded-sm bg-[#2874f0] px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#1d5fc7]"
      >
        <ArrowLeft className="size-4" /> Continue shopping
      </button>
    </div>
  );
}
