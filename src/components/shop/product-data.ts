export type ProductArt = "tshirt" | "hoodie" | "cap" | "sticker" | "pin" | "mug" | "tote" | "headphones" | "earbuds" | "mousepad" | "keychain" | "chessset";

export type ProductCategory = "apparel" | "accessories" | "audio" | "collectibles";

export interface Product {
  id: string;
  name: string;
  tagline: string;
  category: ProductCategory;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  badge?: "Bestseller" | "New" | "Limited" | "Pro pick" | "Fan favourite";
  art: ProductArt;
  imageUrl?: string;
  colors: string[];
  sizes?: string[];
  blurb: string;
}

export interface CartLine {
  productId: string;
  qty: number;
  size?: string;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  apparel: "Apparel",
  accessories: "Accessories",
  audio: "Audio",
  collectibles: "Collectibles",
};

export const SHIPPING_FREE_THRESHOLD = 1499;
export const STANDARD_SHIPPING = 49;
export const EXPRESS_SHIPPING = 149;
export const GST_RATE = 0.05;

export const products: Product[] = [
  {
    id: "fork-king-tee",
    imageUrl: "/images/shop/tshirt_black.jpg",
    name: "The Fork King Tee",
    tagline: "Heavyweight cotton with the signature fork mark.",
    category: "apparel",
    price: 899,
    compareAt: 1199,
    rating: 4.9,
    reviews: 214,
    badge: "Bestseller",
    art: "tshirt",
    colors: ["Black", "Midnight", "Forest"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    blurb: "220 GSM combed cotton. The golden fork emblem over the chest, with a printed \"fork > material\" back quote for club nights.",
  },
  {
    id: "blunder-buster-tee",
    imageUrl: "/images/shop/tshirt_white.jpg",
    name: "Blunder Buster Tee",
    tagline: "For players who hang pieces so the AI can find them.",
    category: "apparel",
    price: 899,
    rating: 4.8,
    reviews: 163,
    badge: "Fan favourite",
    art: "tshirt",
    colors: ["White", "Black"],
    sizes: ["S", "M", "L", "XL"],
    blurb: "Minimalist chest print with the Blunder Buster badge. One side says \"Analyze everything.\" The other side says nothing. Elegant.",
  },
  {
    id: "chessfork-hoodie",
    imageUrl: "/images/shop/hoodie_black.jpg",
    name: "Chessfork Fleece Hoodie",
    tagline: "350 GSM fleece built for late-night study sessions.",
    category: "apparel",
    price: 1999,
    compareAt: 2499,
    rating: 4.9,
    reviews: 98,
    badge: "Bestseller",
    art: "hoodie",
    colors: ["Black", "Bone", "Emerald"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    blurb: "Brushed fleece inside, kangaroo pocket, and an embroidered fork on the left chest. Rated comfortable by 98 verified grinders.",
  },
  {
    id: "midnight-snapback",
    imageUrl: "/images/shop/snapback_cap.jpg",
    name: "Midnight Snapback",
    tagline: "Structured crown, embossed fork, adjustable fit.",
    category: "apparel",
    price: 699,
    rating: 4.7,
    reviews: 87,
    badge: "New",
    art: "cap",
    colors: ["Black", "Olive"],
    blurb: "Six-panel snapback with tonal embroidery. Curved brim out of the box — no break-in drama before your bullet session.",
  },
  {
    id: "sticker-pack",
    imageUrl: "/images/shop/sticker_pack.jpg",
    name: "Fork Gang Sticker Pack",
    tagline: "10 die-cut stickers. Waterproof, dishwasher approved.",
    category: "accessories",
    price: 299,
    rating: 5.0,
    reviews: 341,
    badge: "Bestseller",
    art: "sticker",
    colors: ["Assorted"],
    blurb: "Ten glossy die-cut stickers: forks, blunders, brilliant badges, and the panda mascot. Slap them on laptops, boards, and bullet blunders.",
  },
  {
    id: "enamel-pin-set",
    name: "Brilliant & Blunder Enamel Pins",
    tagline: "Golden brilliant. Red blunder. Wear your analysis.",
    category: "accessories",
    price: 499,
    rating: 4.8,
    reviews: 56,
    badge: "Limited",
    art: "pin",
    colors: ["Gold / Red"],
    blurb: "A pair of hard enamel pins cast from the real badge art. One brilliant, one blunder. Attach them to your blazer and let opponents read you.",
  },
  {
    id: "forky-mug",
    name: "Forky Ceramic Mug",
    tagline: "400 ml ceramic. Holds coffee and strong opinions.",
    category: "accessories",
    price: 499,
    rating: 4.6,
    reviews: 129,
    badge: "Fan favourite",
    art: "mug",
    colors: ["Black", "White"],
    blurb: "Matte ceramic with the fork logo on one side and the daily puzzle result on the other. Microwave and dishwasher safe. Eval bar stays red.",
  },
  {
    id: "canvas-tote",
    name: "Analysis Canvas Tote",
    tagline: "Heavy-duty canvas for books, boards, and blunders.",
    category: "accessories",
    price: 599,
    rating: 4.7,
    reviews: 74,
    art: "tote",
    colors: ["Natural"],
    blurb: "12 oz cotton canvas with a huge fork print. Fits a chessboard, a laptop, and the notebook where you write \"why did I play that\".",
  },
  {
    id: "fork-pro-headphones",
    imageUrl: "/images/shop/fork_headphones.jpg",
    name: "Fork Pro Headphones",
    tagline: "Studio-grade sound. Engine-grade silence.",
    category: "audio",
    price: 4999,
    compareAt: 5999,
    rating: 4.9,
    reviews: 188,
    badge: "Pro pick",
    art: "headphones",
    colors: ["Matte Black"],
    blurb: "Over-ear, noise-cancelling, 40-hour battery. Because the 5th repetition of the same 30-centipawn blunder should hurt in pristine audio.",
  },
  {
    id: "fork-earbuds",
    name: "Fork Wireless Earbuds",
    tagline: "ANC buds tuned for chess streams and OTB crowds.",
    category: "audio",
    price: 2499,
    rating: 4.5,
    reviews: 143,
    art: "earbuds",
    colors: ["Black", "White"],
    blurb: "Dual-driver earbuds with active noise cancellation, a low-latency game mode, and a charging case engraved with a golden fork.",
  },
  {
    id: "evaluation-mousepad",
    name: "Evaluation XL Mousepad",
    tagline: "900 × 400 mm desk pad printed with the eval bar.",
    category: "accessories",
    price: 799,
    rating: 4.8,
    reviews: 96,
    badge: "New",
    art: "mousepad",
    colors: ["Dark"],
    blurb: "Stitched-edge desk pad. The eval bar runs along the top, printed permanently at +0.3 because that's where you'll be the most.",
  },
  {
    id: "wooden-travel-set",
    name: "Foldable Wooden Travel Set",
    tagline: "Magnetic folding board with full-size pieces.",
    category: "collectibles",
    price: 2999,
    compareAt: 3499,
    rating: 4.9,
    reviews: 61,
    badge: "Limited",
    art: "chessset",
    colors: ["Walnut"],
    blurb: "Walnut and maple foldable board, magnetic Staunton pieces, and a hidden compartment for your rating graph. Tournament legal, commute friendly.",
  },
  {
    id: "fork-keychain",
    name: "Golden Fork Keychain",
    tagline: "A small fork that never blunders.",
    category: "accessories",
    price: 199,
    rating: 4.7,
    reviews: 210,
    badge: "Bestseller",
    art: "keychain",
    colors: ["Gold"],
    blurb: "Die-cast metal fork in a golden finish. Attach to your keys, backpack, or the collar of the dog that chewed your last blunder report.",
  },
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function cartLineTotal(line: CartLine) {
  const product = getProduct(line.productId);
  if (!product) return 0;
  return product.price * line.qty;
}

export function discountPercent(product: Product) {
  if (!product.compareAt || product.compareAt <= product.price) return null;
  return Math.round((1 - product.price / product.compareAt) * 100);
}

export function lineSavings(line: CartLine) {
  const product = getProduct(line.productId);
  if (!product?.compareAt) return 0;
  return Math.max(0, product.compareAt - product.price) * line.qty;
}
