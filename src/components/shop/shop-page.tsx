"use client";

import {
  BadgePercent,
  Check,
  ChessKnight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  LayoutGrid,
  Minus,
  Plus,
  Search,
  Shirt,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CartDrawer } from "./cart-drawer";
import { CheckoutDialog } from "./checkout-dialog";
import { COLOR_HEX, ProductArt } from "./product-art";
import {
  CATEGORY_LABELS,
  discountPercent,
  formatINR,
  getProduct,
  products,
  SHIPPING_FREE_THRESHOLD,
  type CartLine,
  type Product,
  type ProductCategory,
} from "./product-data";

const STORAGE_KEY = "chessfork-shop-cart-v1";
type FilterId = "all" | "deals" | ProductCategory;

const CATEGORY_NAV: { id: FilterId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "deals", label: "Deals", icon: BadgePercent },
  { id: "apparel", label: "Apparel", icon: Shirt },
  { id: "audio", label: "Audio", icon: Headphones },
  { id: "accessories", label: "Accessories", icon: Sparkles },
  { id: "collectibles", label: "Collectibles", icon: ChessKnight },
];

const OFFERS = [
  { icon: BadgePercent, title: "10% instant discount", copy: "On all UPI payments made at checkout." },
  { icon: Tag, title: "Flat ₹150 off", copy: "On first orders above ₹999. Code: FORKFIRST" },
  { icon: Truck, title: "Free delivery", copy: `On all orders above ${formatINR(SHIPPING_FREE_THRESHOLD)}.` },
];

const HERO_SLIDES = [
  {
    kicker: "Apparel · Bestseller",
    title: "The Fork King Tee",
    copy: "Heavyweight 220 GSM cotton with the signature golden fork. Built for club nights and analysis marathons.",
    cta: "Shop tees",
    filter: "apparel" as FilterId,
    art: "tshirt" as const,
    imageUrl: "/images/shop/tshirt_black.jpg",
    color: "#1c2130",
    gradient: "linear-gradient(120deg,#2874f0 0%,#1d3fa8 55%,#132a70 100%)",
  },
  {
    kicker: "Deals of the Day",
    title: "Up to 30% off",
    copy: "Fork Pro Headphones, travel chess sets and more — discounted for a limited window only.",
    cta: "Grab the deals",
    filter: "deals" as FilterId,
    art: "headphones" as const,
    imageUrl: "/images/shop/fork_headphones.jpg",
    color: "#151a26",
    gradient: "linear-gradient(120deg,#f2a500 0%,#e07000 55%,#b04d00 100%)",
  },
  {
    kicker: "Accessories · Stickers",
    title: "Fork Gang Sticker Pack",
    copy: "Ten waterproof die-cut stickers for your laptop, board, and the notebook full of blunders.",
    cta: "Get stickers",
    filter: "accessories" as FilterId,
    art: "sticker" as const,
    imageUrl: "/images/shop/sticker_pack.jpg",
    color: "#b8860b",
    gradient: "linear-gradient(120deg,#0d9e6c 0%,#087a55 55%,#065a3e 100%)",
  },
];

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return parsed.filter((line) => getProduct(line.productId) !== undefined);
  } catch {
    return [];
  }
}

function secondsToMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

export function ShopPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCart(loadCart());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);

  function addToCart(product: Product, size?: string, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id && l.size === size);
      if (existing) {
        return prev.map((l) => (l.productId === product.id && l.size === size ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { productId: product.id, qty, size }];
    });
    setToast(`${product.name} added to cart`);
  }

  function buyNow(product: Product, size?: string, qty = 1) {
    addToCart(product, size, qty);
    setQuickView(null);
    setCheckoutOpen(true);
  }

  function changeQty(productId: string, qty: number) {
    if (qty < 1) return;
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function handleOrderPlaced(orderId: string) {
    setCart([]);
    setCheckoutOpen(false);
    setToast(`Order ${orderId} placed. Thank you!`);
  }

  function goToFilter(next: FilterId) {
    setFilter(next);
    setQuery("");
    window.setTimeout(() => {
      document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  const gridProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesFilter =
        filter === "all" ? true : filter === "deals" ? discountPercent(p) !== null : p.category === filter;
      const matchesQuery =
        q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        CATEGORY_LABELS[p.category].toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  const dealProducts = useMemo(
    () => products.filter((p) => discountPercent(p) !== null).sort((a, b) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0)),
    [],
  );
  const bestSellers = useMemo(() => [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 8), []);
  const trending = useMemo(() => [...products].sort((a, b) => b.rating - a.rating).slice(0, 8), []);

  return (
    <div className="min-h-screen bg-white/5 pb-10 text-stone-100">
      <MarketplaceBar cartCount={cartCount} query={query} onQueryChange={setQuery} onCartOpen={() => setCartOpen(true)} />

      <CategoryStrip active={filter} onSelect={goToFilter} />

      <HeroCarousel onCta={goToFilter} />

      <div className="mx-auto w-full max-w-7xl px-4">
        <OffersStrip />

        <ProductRow
          id="deals"
          title="Deals of the Day"
          accessory={<DealCountdown />}
          products={dealProducts}
          onQuickView={setQuickView}
          onAdd={addToCart}
          onViewAll={() => goToFilter("deals")}
        />

        <ProductRow
          id="bestsellers"
          title="Best Sellers"
          accessory={
            <button type="button" onClick={() => goToFilter("all")} className="text-sm font-semibold text-amber-400 hover:underline">
              View all
            </button>
          }
          products={bestSellers}
          onQuickView={setQuickView}
          onAdd={addToCart}
          onViewAll={() => goToFilter("all")}
        />

        <ProductRow
          id="trending"
          title="Trending Now"
          accessory={
            <button type="button" onClick={() => goToFilter("all")} className="text-sm font-semibold text-amber-400 hover:underline">
              View all
            </button>
          }
          products={trending}
          onQuickView={setQuickView}
          onAdd={addToCart}
          onViewAll={() => goToFilter("all")}
        />

        <AllProductsGrid
          filter={filter}
          products={gridProducts}
          onFilterChange={goToFilter}
          onQuickView={setQuickView}
          onAdd={addToCart}
        />
      </div>

      <ShopFooter />

      <CartDrawer
        open={cartOpen}
        lines={cart}
        onClose={() => setCartOpen(false)}
        onChangeQty={changeQty}
        onRemove={removeLine}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {checkoutOpen ? <CheckoutDialog lines={cart} onClose={() => setCheckoutOpen(false)} onOrderPlaced={handleOrderPlaced} /> : null}

      {quickView ? (
        <QuickViewModal
          product={quickView}
          onClose={() => setQuickView(null)}
          onAdd={(size, qty) => {
            addToCart(quickView, size, qty);
            setQuickView(null);
          }}
          onBuyNow={(size, qty) => buyNow(quickView, size, qty)}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[99] flex -translate-x-1/2 items-center gap-2 rounded-md border border-white/10 bg-[#1c1b18] px-5 py-3 text-sm font-semibold text-stone-200 shadow-[0_16px_50px_rgba(0,0,0,0.25)]">
          <Check className="size-4 text-emerald-400" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function MarketplaceBar({
  cartCount,
  query,
  onQueryChange,
  onCartOpen,
}: {
  cartCount: number;
  query: string;
  onQueryChange: (q: string) => void;
  onCartOpen: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#131210]/80 backdrop-blur-md shadow-none">
      <div className="mx-auto w-full max-w-7xl px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-stone-100">
              <ChessKnight className="size-5" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-base font-black italic text-white">
                chessfork<span className="text-amber-400">store</span>
              </span>
              <span className="block text-[10px] text-stone-400">Merch · Gear · Goodies</span>
            </span>
          </Link>

          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search for tees, stickers, headphones and more"
              className="w-full rounded-md border-0 bg-white/5 py-2.5 pl-4 pr-12 text-sm text-stone-100 placeholder:text-stone-500 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400/50"
            />
            <button
              type="button"
              aria-label="Search"
              onClick={() => document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth" })}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-stone-400 hover:bg-white/10 hover:text-white"
            >
              <Search className="size-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onCartOpen}
            className="flex shrink-0 items-center gap-2 rounded-md bg-amber-400 px-4 py-2.5 text-sm font-black text-stone-950 transition hover:bg-amber-300 active:scale-[0.98]"
          >
            <ShoppingCart className="size-5" />
            Cart
            {cartCount > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-stone-900 border border-amber-400/30 text-[11px] font-black text-amber-400">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}

function CategoryStrip({ active, onSelect }: { active: FilterId; onSelect: (f: FilterId) => void }) {
  return (
    <nav className="border-b border-white/5 bg-[#1c1b18]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex shrink-0 flex-col items-center gap-1 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                isActive ? "border-amber-400 text-amber-400" : "border-transparent text-stone-400 hover:text-stone-100 hover:border-white/20"
              }`}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HeroCarousel({ onCta }: { onCta: (f: FilterId) => void }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4">
      <div className="group relative overflow-hidden rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {HERO_SLIDES.map((hero) => (
            <div key={hero.title} className="relative w-full shrink-0" style={{ background: hero.gradient }}>
              <div className="grid min-h-[240px] items-center gap-4 px-8 py-10 sm:min-h-[300px] sm:grid-cols-[1.2fr_0.8fr] sm:px-14">
                <div className="relative z-10">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-400">{hero.kicker}</p>
                  <h2 className="mt-3 max-w-lg text-3xl font-black tracking-tight text-white sm:text-5xl">{hero.title}</h2>
                  <p className="mt-3 max-w-md text-sm leading-7 text-white/80">{hero.copy}</p>
                  <button
                    type="button"
                    onClick={() => onCta(hero.filter)}
                    className="mt-6 rounded-md bg-amber-400 px-6 py-3 text-sm font-black text-stone-950 transition hover:bg-amber-300 hover:text-stone-950"
                  >
                    {hero.cta}
                  </button>
                </div>
                <div className="hidden justify-end sm:flex">
                  <div className="w-64 drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                    {hero.imageUrl ? <img src={hero.imageUrl} alt={hero.title} className="h-full w-full object-cover drop-shadow-2xl rounded-xl" /> : <ProductArt art={hero.art} color={hero.color} />}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-300 shadow transition hover:bg-white sm:flex"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)}
          className="absolute right-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-300 shadow transition hover:bg-white sm:flex"
        >
          <ChevronRight className="size-5" />
        </button>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all ${slide === i ? "w-6 bg-[#ffe500]" : "w-2 bg-white/60"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DealCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(secondsToMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const h = remaining === null ? "--" : String(Math.floor(remaining / 3600)).padStart(2, "0");
  const m = remaining === null ? "--" : String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const s = remaining === null ? "--" : String(remaining % 60).padStart(2, "0");

  return (
    <span className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-400">
      <Clock className="size-3.5" />
      {h}:{m}:{s} left
    </span>
  );
}

function OffersStrip() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {OFFERS.map((offer) => {
        const Icon = offer.icon;
        return (
          <div key={offer.title} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#1c1b18] p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-stone-200">{offer.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-stone-400">{offer.copy}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductRow({
  id,
  title,
  accessory,
  products: rowProducts,
  onQuickView,
  onAdd,
  onViewAll,
}: {
  id: string;
  title: string;
  accessory: React.ReactNode;
  products: Product[];
  onQuickView: (p: Product) => void;
  onAdd: (p: Product, size?: string) => void;
  onViewAll: () => void;
}) {
  return (
    <section id={id} className="mt-6 scroll-mt-24 rounded-lg border border-white/10 bg-[#1c1b18]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black text-stone-100">{title}</h2>
        <div className="flex items-center gap-3">
          {accessory}
          <button
            type="button"
            onClick={onViewAll}
            className="rounded-md bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-stone-200 transition hover:bg-white/20"
          >
            View all
          </button>
        </div>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto px-4 py-4 [scrollbar-width:thin]">
        {rowProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compact
            onQuickView={() => onQuickView(product)}
            onAdd={() => onAdd(product, product.sizes?.[1])}
          />
        ))}
      </div>
    </section>
  );
}

function AllProductsGrid({
  filter,
  products: gridProducts,
  onFilterChange,
  onQuickView,
  onAdd,
}: {
  filter: FilterId;
  products: Product[];
  onFilterChange: (f: FilterId) => void;
  onQuickView: (p: Product) => void;
  onAdd: (p: Product, size?: string) => void;
}) {
  return (
    <section id="all-products" className="mt-6 scroll-mt-24 rounded-lg border border-white/10 bg-[#1c1b18]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black text-stone-100">Explore all products</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={`rounded-md border px-3.5 py-1.5 text-xs font-bold transition ${
                filter === item.id
                  ? "border-amber-400 bg-amber-400/10 text-amber-400"
                  : "border-white/10 bg-[#1c1b18] text-slate-600 hover:border-[#2874f0] hover:text-amber-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {gridProducts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="size-10 text-stone-700" />
            <p className="mt-4 text-sm font-bold text-stone-300">No products found</p>
            <p className="mt-1 text-xs text-stone-400">Try a different search term or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {gridProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={() => onQuickView(product)}
                onAdd={() => onAdd(product, product.sizes?.[1])}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  compact = false,
  onQuickView,
  onAdd,
}: {
  product: Product;
  compact?: boolean;
  onQuickView: () => void;
  onAdd: () => void;
}) {
  const discount = discountPercent(product);

  return (
    <article
      onClick={onQuickView}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-white/10 bg-[#1c1b18] transition hover:border-white/15 hover:bg-[#1a1917] hover:shadow-[0_6px_24px_rgba(0,0,0,0.3)] ${
        compact ? "w-[190px] shrink-0 snap-start" : ""
      }`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#0f0e0d] p-4">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <ProductArt art={product.art} color={COLOR_HEX[product.colors[0]] ?? "#1c2130"} />}
        {product.badge ? (
          <span className="absolute left-2.5 top-2.5 rounded-sm bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-stone-900 shadow">
            {product.badge}
          </span>
        ) : null}
        {discount ? (
          <span className="absolute right-2.5 top-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-black text-emerald-400">
            {discount}% off
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-stone-200">{product.name}</h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 rounded-sm bg-stone-800 px-1.5 py-0.5 text-[11px] font-black text-white">
            {product.rating.toFixed(1)} <Star className="size-2.5 fill-white" />
          </span>
          <span className="text-[11px] text-stone-400">{product.reviews} Ratings</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-black text-stone-100">{formatINR(product.price)}</span>
          {product.compareAt ? <span className="text-xs text-stone-400 line-through">{formatINR(product.compareAt)}</span> : null}
          {discount ? <span className="text-xs font-bold text-emerald-400">{discount}% off</span> : null}
        </div>
        <p className="mt-1 text-[11px] text-emerald-400">
          {product.price >= 599 ? "Free delivery" : `${formatINR(49)} delivery`}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="mt-2.5 rounded-md bg-[#ffe500] py-2 text-xs font-black uppercase tracking-wide text-stone-100 transition hover:bg-[#ffd600] active:scale-[0.98]"
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}

function QuickViewModal({
  product,
  onClose,
  onAdd,
  onBuyNow,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (size: string | undefined, qty: number) => void;
  onBuyNow: (size: string | undefined, qty: number) => void;
}) {
  const [size, setSize] = useState<string | undefined>(product.sizes?.[1]);
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState(1);
  const discount = discountPercent(product);
  const savings = product.compareAt ? product.compareAt - product.price : 0;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-[#1c1b18] shadow-[0_40px_120px_rgba(0,0,0,0.8)] border border-white/10">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white text-stone-400 shadow transition hover:bg-slate-100"
        >
          <X className="size-5" />
        </button>
        <div className="grid sm:grid-cols-2">
          <div className="relative flex items-center justify-center bg-[#0f0e0d] p-10">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <ProductArt art={product.art} color={COLOR_HEX[product.colors[color]] ?? "#1c2130"} />}
            {product.badge ? (
              <span className="absolute left-4 top-4 rounded-sm bg-white px-2.5 py-1 text-[10px] font-black uppercase text-amber-400 shadow">
                {product.badge}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Chessfork Store</p>
            <h2 className="mt-2 text-xl font-black leading-snug text-stone-100">{product.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-sm bg-stone-800 px-1.5 py-0.5 font-black text-white">
                {product.rating.toFixed(1)} <Star className="size-2.5 fill-white" />
              </span>
              <span className="font-semibold text-stone-400">{product.reviews} Ratings & Reviews</span>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
              <span className="text-2xl font-black text-stone-100">{formatINR(product.price)}</span>
              {product.compareAt ? (
                <span className="text-sm text-stone-400 line-through">{formatINR(product.compareAt)}</span>
              ) : null}
              {discount ? <span className="text-sm font-black text-emerald-400">{discount}% off</span> : null}
            </div>
            <p className="mt-1 text-xs text-emerald-400">You will save {formatINR(savings)} on this product.</p>
            <p className="mt-0.5 text-[11px] text-stone-400">Inclusive of all taxes · Free delivery on this item</p>

            <p className="mt-5 text-xs font-bold text-stone-400">{product.blurb}</p>

            {product.sizes ? (
              <div className="mt-5">
                <p className="text-xs font-bold text-stone-300">
                  Select Size <span className="font-normal text-stone-400">(size chart)</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`min-w-10 rounded-sm border px-3 py-2 text-xs font-bold transition ${
                        size === s
                          ? "border-amber-400 bg-amber-400/10 text-amber-400"
                          : "border-slate-300 bg-white text-stone-300 hover:border-[#2874f0] hover:text-amber-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {product.colors.length > 1 ? (
              <div className="mt-5">
                <p className="text-xs font-bold text-stone-300">Color</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.colors.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(i)}
                      aria-label={c}
                      title={c}
                      className={`size-8 rounded-full border-2 transition ${
                        color === i ? "border-[#2874f0] ring-2 ring-[#2874f0]/30" : "border-slate-300"
                      }`}
                      style={{ backgroundColor: COLOR_HEX[c] ?? "#ccc" }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <p className="text-xs font-bold text-stone-300">Quantity</p>
              <div className="flex items-center rounded-sm border border-slate-300">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-slate-600 transition hover:bg-slate-100"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-sm font-black text-stone-100">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="px-3 py-2 text-slate-600 transition hover:bg-slate-100"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onAdd(product.sizes ? size : undefined, qty)}
                className="rounded-md bg-[#ffe500] py-3 text-sm font-black uppercase text-stone-100 transition hover:bg-[#ffd600] active:scale-[0.98]"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => onBuyNow(product.sizes ? size : undefined, qty)}
                className="rounded-md bg-[#fb641b] py-3 text-sm font-black uppercase text-white transition hover:bg-[#e85d13] active:scale-[0.98]"
              >
                Buy Now
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-100 pt-4 text-[11px] text-stone-400">
              <span className="flex items-center gap-1.5">
                <Truck className="size-3.5 text-emerald-400" /> Free Delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-amber-400" /> 10% off on UPI
              </span>
              <span className="flex items-center gap-1.5">
                <BadgePercent className="size-3.5 text-[#fb641b]" /> 14-day returns
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopFooter() {
  return (
    <footer className="mt-10 border-t border-white/10 bg-[#1c1b18]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-stone-100">
            <span className="flex size-7 items-center justify-center rounded-md bg-[#2874f0] text-white">
              <ChessKnight className="size-4" />
            </span>
            chessfork<span className="text-amber-400">store</span>
          </p>
          <p className="mt-3 max-w-xs text-xs leading-6 text-stone-400">
            Official merch of Chessfork — the analysis platform for players who want evidence, not just evaluation bars.
          </p>
        </div>
        <div>
          <p className="text-sm font-bold text-stone-100">About</p>
          <ul className="mt-3 space-y-2.5 text-xs text-stone-400">
            <li>Our catalog</li>
            <li>Print quality</li>
            <li>Return policy</li>
            <li>Bulk & club orders</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-stone-100">Help</p>
          <ul className="mt-3 space-y-2.5 text-xs text-stone-400">
            <li>Shipping info</li>
            <li>Track your order</li>
            <li>Size guide</li>
            <li>Contact support</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-stone-100">Payments</p>
          <ul className="mt-3 space-y-2.5 text-xs text-stone-400">
            <li>UPI — GPay, PhonePe, Paytm</li>
            <li>Credit / Debit Cards</li>
            <li>Net Banking</li>
            <li>Wallets</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-stone-400">
          <p>© 2026 Chessfork Store. All forks reserved.</p>
          <p>Every purchase funds the engine that judges your opening choices.</p>
        </div>
      </div>
    </footer>
  );
}
