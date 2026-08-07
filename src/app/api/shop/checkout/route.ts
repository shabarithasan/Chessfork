import { NextResponse } from "next/server";

import { checkRateLimit } from "@/server/rate-limiter";
import { z } from "zod";

const PAYMENT_METHODS = ["upi", "card", "netbanking", "wallet"] as const;

const lineSchema = z.object({
  productId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(20),
  size: z.string().max(8).optional(),
});

const checkoutSchema = z.object({
  billing: z.object({
    fullName: z.string().min(3).max(120),
    email: z.string().email(),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
    address: z.string().min(8).max(300),
    city: z.string().min(2).max(80),
    state: z.string().min(2).max(80),
    pincode: z.string().regex(/^\d{6}$/, "Invalid PIN code"),
  }),
  delivery: z.enum(["standard", "express"]),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentDetail: z.string().min(3).max(120),
  items: z.array(lineSchema).min(1).max(50),
  amount: z.number().int().positive(),
});

const CATALOG: Record<string, number> = {
  "fork-king-tee": 899,
  "blunder-buster-tee": 899,
  "chessfork-hoodie": 1999,
  "midnight-snapback": 699,
  "sticker-pack": 299,
  "enamel-pin-set": 499,
  "forky-mug": 499,
  "canvas-tote": 599,
  "fork-pro-headphones": 4999,
  "fork-earbuds": 2499,
  "evaluation-mousepad": 799,
  "wooden-travel-set": 2999,
  "fork-keychain": 199,
};

const FREE_SHIPPING_THRESHOLD = 1499;
const STANDARD_SHIPPING = 49;
const EXPRESS_SHIPPING = 149;
const GST_RATE = 0.05;

function simulateGateway() {
  const latency = 900 + Math.floor(Math.random() * 900);
  return new Promise<{ approved: boolean; reference: string }>((resolve) => {
    setTimeout(() => {
      resolve({
        approved: true,
        reference: `TXN${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`,
      });
    }, latency);
  });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = checkRateLimit(`shop-checkout:${ip}`, 10, 60_000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ message: "Too many checkout attempts. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Some payment details are invalid. Please review the form." },
        { status: 400 },
      );
    }

    const { billing, delivery, paymentMethod, items, amount } = parsed.data;

    const subtotal = items.reduce((sum, line) => {
      const price = CATALOG[line.productId];
      if (!price) return sum;
      return sum + price * line.qty;
    }, 0);

    const shipping = delivery === "express" ? EXPRESS_SHIPPING : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const gst = Math.round((subtotal + shipping) * GST_RATE);
    const total = subtotal + shipping + gst;

    if (total !== amount) {
      return NextResponse.json({ message: "Order total changed. Please review your cart." }, { status: 409 });
    }

    const gateway = await simulateGateway();

    if (!gateway.approved) {
      return NextResponse.json({ message: "Payment declined by the gateway. Try another method." }, { status: 402 });
    }

    const orderId = `CF${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;

    return NextResponse.json({
      orderId,
      reference: gateway.reference,
      status: "confirmed",
      total,
      paymentMethod,
      email: billing.email,
      items: items.length,
    });
  } catch {
    return NextResponse.json({ message: "Payment could not be processed. Please try again." }, { status: 400 });
  }
}
