"use client";

import { Minus, Plus, ShoppingCart, X } from "lucide-react";

import { COLOR_HEX, ProductArt } from "./product-art";
import {
  formatINR,
  getProduct,
  lineSavings,
  SHIPPING_FREE_THRESHOLD,
  STANDARD_SHIPPING,
  type CartLine,
} from "./product-data";

interface CartDrawerProps {
  open: boolean;
  lines: CartLine[];
  onClose: () => void;
  onChangeQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, lines, onClose, onChangeQty, onRemove, onCheckout }: CartDrawerProps) {
  const subtotal = lines.reduce((sum, line) => {
    const product = getProduct(line.productId);
    return sum + (product ? product.price * line.qty : 0);
  }, 0);
  const savings = lines.reduce((sum, line) => sum + lineSavings(line), 0);
  const delivery = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : subtotal > 0 ? STANDARD_SHIPPING : 0;
  const total = subtotal + delivery;

  return (
    <div
      className={`fixed inset-0 z-[90] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#1e1d1a] border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#1c1b18] px-5 py-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="size-5 text-stone-100" />
            <p className="text-sm font-black uppercase tracking-wide text-stone-100">
              My Cart <span className="text-stone-100/70">({lines.length})</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close cart"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-100/80 transition hover:bg-white/10 hover:text-stone-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-[#24231f]">
                <ShoppingCart className="size-9 text-stone-600" />
              </div>
              <p className="mt-5 text-base font-bold text-stone-200">Your cart is empty!</p>
              <p className="mt-1.5 max-w-[240px] text-xs leading-6 text-stone-400">
                Fork a tee, catch a pin, or grab a mug. Your future self will thank you.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.setTimeout(() => document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth" }), 80);
                }}
                className="mt-6 rounded-md bg-[#2874f0] px-8 py-3 text-sm font-black uppercase text-stone-100 transition hover:bg-[#1d5fc7]"
              >
                Start shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-5">
              {lines.map((line) => {
                const product = getProduct(line.productId);
                if (!product) return null;
                const colorHex = COLOR_HEX[product.colors[0]] ?? "#1c2130";
                return (
                  <li key={`${line.productId}-${line.size ?? ""}`} className="flex gap-4 border-b border-white/5 pb-5">
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#0f0e0d] p-2">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover rounded-md" />
                      ) : (
                        <ProductArt art={product.art} color={colorHex} />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug text-stone-200">{product.name}</p>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {line.size ? `${line.size} · ` : ""}
                            {product.colors[0]}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${product.name}`}
                          onClick={() => onRemove(line.productId)}
                          className="text-xs font-semibold text-[#2874f0] transition hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center rounded-sm border border-slate-300">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => onChangeQty(line.productId, line.qty - 1)}
                            className="px-2.5 py-1.5 text-[#2874f0] transition hover:bg-slate-100"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-bold text-stone-100">{line.qty}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => onChangeQty(line.productId, line.qty + 1)}
                            className="px-2.5 py-1.5 text-[#2874f0] transition hover:bg-slate-100"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                        <p className="text-base font-black text-stone-100">{formatINR(product.price * line.qty)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <div className="border-t border-white/10 bg-[#24231f] px-5 py-4">
            <div className="rounded-sm bg-white p-4 text-sm">
              <p className="text-xs font-black uppercase tracking-wide text-stone-400">Price Details</p>
              <div className="mt-3 space-y-2.5">
                <div className="flex justify-between text-slate-700">
                  <span>
                    Price ({lines.reduce((n, l) => n + l.qty, 0)} item{lines.reduce((n, l) => n + l.qty, 0) > 1 ? "s" : ""})
                  </span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Discount</span>
                  <span className="text-emerald-400">− {formatINR(savings)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Delivery Charges</span>
                  <span className={delivery === 0 ? "text-emerald-400" : ""}>{delivery === 0 ? "FREE" : formatINR(delivery)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-white/10 pt-2.5 text-base font-black text-stone-100">
                  <span>Total Amount</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>
              <p className="mt-3 text-xs font-bold text-emerald-400">You will save {formatINR(savings)} on this order</p>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="mt-4 w-full rounded-md bg-[#fb641b] py-3.5 text-sm font-black uppercase tracking-wide text-stone-100 transition hover:bg-[#e85d13] active:scale-[0.99]"
            >
              Place Order
            </button>
            <p className="mt-3 text-center text-[11px] text-stone-400">Secure checkout · UPI, Cards, Net Banking & Wallets</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
