import Stripe from "stripe";

import { env } from "@/server/env";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    })
  : null;

export const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    description: "Anonymous quick review, public puzzle queue, and daily challenge.",
  },
  {
    name: "Pro",
    price: "$14",
    description: "Saved reports, deep analysis queue, weekly digest, and unlimited drills.",
  },
  {
    name: "Coach",
    price: "$39",
    description: "Full AI coach snapshot, shareable reports, and human-coach collaboration.",
  },
];
