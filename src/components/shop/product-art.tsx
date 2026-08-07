import type { ProductArt } from "./product-data";

const GOLD = "#f3c53d";
const GOLD_DIM = "#b98a1f";
const INK = "#e6e4df"; // Lightened for dark mode contrast
const PANEL = "#24231f"; // Dark panel
const PANEL_EDGE = "#3d3a33"; // Dark panel edge

function ForkMark({ x, y, size = 16, className = "" }: { x: number; y: number; size?: number; className?: string }) {
  return (
    <g className={className} transform={`translate(${x - size / 2} ${y - size / 2})`}>
      <rect x="1" y="0" width="14" height="6" rx="2.5" fill={GOLD} />
      <rect x="4" y="6" width="3" height="9" rx="1.5" fill={GOLD} />
      <rect x="9" y="6" width="3" height="9" rx="1.5" fill={GOLD} />
    </g>
  );
}

function TShirt({ color }: { color: string }) {
  return (
    <g>
      <path
        d="M58 34 L82 26 L98 42 L92 58 L70 50 L70 158 L110 158 L110 50 L88 58 L82 42 L98 26 L122 34 L132 44 L132 58 L124 66 L124 178 L66 178 L66 66 L58 58 L58 44 Z"
        fill={color}
        stroke={PANEL_EDGE}
        strokeWidth="3"
      />
      <path d="M70 50 L92 58 L70 50 L70 158" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="4" />
      <path d="M110 50 L88 58 L110 50 L110 158" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="4" />
      <rect x="82" y="70" width="16" height="7" rx="3.5" fill={GOLD} />
      <rect x="84.5" y="77" width="3" height="10" rx="1.5" fill={GOLD} />
      <rect x="92.5" y="77" width="3" height="10" rx="1.5" fill={GOLD} />
    </g>
  );
}

function Hoodie({ color }: { color: string }) {
  return (
    <g>
      <path
        d="M56 40 L76 30 L92 48 L88 62 L66 56 L66 162 L114 162 L114 56 L92 62 L88 48 L104 30 L124 40 L134 52 L134 66 L126 74 L126 184 L54 184 L54 74 L46 66 L46 52 Z"
        fill={color}
        stroke={PANEL_EDGE}
        strokeWidth="3"
      />
      <path d="M66 56 L66 162 M114 56 L114 162" stroke="rgba(0,0,0,0.3)" strokeWidth="5" />
      <path d="M76 30 L84 44 L92 48 L88 62 M104 30 L96 44 L88 48 L92 62" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="4" />
      <path d="M74 58 L106 58 L106 74 L74 74 Z" fill={color} stroke={PANEL_EDGE} strokeWidth="3" />
      <rect x="85" y="82" width="10" height="6" rx="3" fill={GOLD} />
      <path d="M78 76 L102 76" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Cap({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="90" cy="92" rx="42" ry="10" fill={color} stroke={PANEL_EDGE} strokeWidth="3" />
      <path d="M48 92 C48 58 66 40 90 40 C114 40 132 58 132 92 Z" fill={color} stroke={PANEL_EDGE} strokeWidth="3" />
      <path d="M90 40 L78 76 L102 76 Z" fill="rgba(0,0,0,0.22)" />
      <path d="M48 92 C48 70 58 56 74 48 L66 92 Z" fill="rgba(0,0,0,0.14)" />
      <circle cx="90" cy="78" r="8" fill={GOLD} />
      <rect x="86.5" y="72" width="7" height="12" rx="2" fill={GOLD_DIM} transform="rotate(20 90 78)" />
    </g>
  );
}

function StickerPack() {
  return (
    <g>
      <rect x="62" y="42" width="56" height="100" rx="10" fill={PANEL} stroke={PANEL_EDGE} strokeWidth="3" transform="rotate(-6 90 92)" />
      <rect x="62" y="42" width="56" height="100" rx="10" fill={INK} stroke={PANEL_EDGE} strokeWidth="3" />
      <rect x="74" y="56" width="32" height="32" rx="6" fill={GOLD} />
      <path d="M82 72 L98 72 L98 66 L86 58 L78 66 L78 72 Z" fill={INK} />
      <circle cx="88" cy="78" r="4" fill={INK} />
      <rect x="76" y="100" width="28" height="8" rx="4" fill={GOLD_DIM} />
      <rect x="76" y="116" width="20" height="8" rx="4" fill="rgba(243,197,61,0.4)" />
    </g>
  );
}

function Pin() {
  return (
    <g>
      <circle cx="90" cy="92" r="34" fill={GOLD} stroke={GOLD_DIM} strokeWidth="3" />
      <circle cx="90" cy="92" r="28" fill="rgba(0,0,0,0.14)" />
      <rect x="82" y="78" width="16" height="6" rx="3" fill={INK} />
      <rect x="86" y="84" width="3" height="9" rx="1.5" fill={INK} />
      <rect x="92" y="84" width="3" height="9" rx="1.5" fill={INK} />
      <path d="M90 44 L90 36" stroke={PANEL_EDGE} strokeWidth="4" strokeLinecap="round" />
      <circle cx="90" cy="34" r="4" fill={GOLD_DIM} />
    </g>
  );
}

function Mug({ color }: { color: string }) {
  return (
    <g>
      <path d="M58 64 L122 64 L118 158 C116 170 108 178 96 178 L84 178 C72 178 64 170 62 158 Z" fill={color} stroke={PANEL_EDGE} strokeWidth="3" />
      <path d="M120 84 C136 84 144 92 144 104 C144 118 134 126 120 124" fill="none" stroke={PANEL_EDGE} strokeWidth="6" strokeLinecap="round" />
      <path d="M66 76 L114 76" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <rect x="83" y="88" width="14" height="6" rx="3" fill={GOLD} />
      <rect x="85.5" y="94" width="3" height="10" rx="1.5" fill={GOLD} />
      <rect x="91.5" y="94" width="3" height="10" rx="1.5" fill={GOLD} />
      <ellipse cx="90" cy="60" rx="32" ry="8" fill="rgba(0,0,0,0.16)" />
      <ellipse cx="90" cy="180" rx="46" ry="8" fill="rgba(0,0,0,0.4)" />
    </g>
  );
}

function Tote({ color }: { color: string }) {
  return (
    <g>
      <path d="M56 72 L124 72 L120 168 C119 174 112 178 106 178 L74 178 C68 178 61 174 60 168 Z" fill={color} stroke={PANEL_EDGE} strokeWidth="3" />
      <path d="M72 72 C72 50 108 50 108 72" fill="none" stroke={PANEL_EDGE} strokeWidth="6" strokeLinecap="round" />
      <rect x="81" y="96" width="18" height="8" rx="4" fill={GOLD} />
      <rect x="84" y="104" width="4" height="13" rx="2" fill={GOLD} />
      <rect x="92" y="104" width="4" height="13" rx="2" fill={GOLD} />
    </g>
  );
}

function Headphones() {
  return (
    <g>
      <path d="M56 96 C56 58 72 36 90 36 C108 36 124 58 124 96 L124 128 C124 140 118 146 108 146 L100 146 C94 146 90 142 90 136 L90 116 C90 110 94 106 100 106 L112 106 L112 96 C112 64 102 50 90 50 C78 50 68 64 68 96 L68 106 L80 106 C86 106 90 110 90 116 L90 136 C90 142 86 146 80 146 L72 146 C62 146 56 140 56 128 Z" fill={PANEL} stroke={PANEL_EDGE} strokeWidth="3" />
      <path d="M56 96 C56 58 72 36 90 36 C108 36 124 58 124 96 L124 112 L56 112 Z" fill="rgba(0,0,0,0.2)" />
      <rect x="81" y="66" width="18" height="7" rx="3.5" fill={GOLD} />
      <rect x="83.5" y="73" width="3" height="10" rx="1.5" fill={GOLD} />
      <rect x="93.5" y="73" width="3" height="10" rx="1.5" fill={GOLD} />
      <circle cx="84" cy="50" r="2.5" fill={GOLD} />
      <circle cx="96" cy="48" r="2" fill={GOLD_DIM} />
    </g>
  );
}

function Earbuds() {
  return (
    <g>
      <rect x="52" y="66" width="76" height="52" rx="14" fill={PANEL} stroke={PANEL_EDGE} strokeWidth="3" />
      <rect x="58" y="56" width="64" height="10" rx="5" fill={PANEL} stroke={PANEL_EDGE} strokeWidth="2" />
      <circle cx="72" cy="92" r="12" fill={INK} stroke={PANEL_EDGE} strokeWidth="2" />
      <circle cx="72" cy="92" r="6" fill={GOLD} />
      <circle cx="108" cy="92" r="12" fill={INK} stroke={PANEL_EDGE} strokeWidth="2" />
      <circle cx="108" cy="92" r="6" fill={GOLD} />
      <rect x="80" y="100" width="20" height="4" rx="2" fill={PANEL_EDGE} />
    </g>
  );
}

function Mousepad() {
  return (
    <g>
      <rect x="52" y="46" width="76" height="108" rx="12" fill="#e9edf3" stroke={PANEL_EDGE} strokeWidth="3" />
      <rect x="52" y="46" width="76" height="108" rx="12" fill="none" stroke={GOLD_DIM} strokeWidth="1.5" />
      <rect x="60" y="54" width="60" height="8" rx="4" fill="rgba(243,197,61,0.5)" />
      <rect x="60" y="68" width="42" height="8" rx="4" fill="rgba(243,197,61,0.3)" />
      <rect x="60" y="82" width="30" height="8" rx="4" fill="rgba(243,197,61,0.18)" />
      <path d="M118 132 L132 118" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <circle cx="118" cy="132" r="3" fill={GOLD} />
      <rect x="124" y="112" width="4" height="12" rx="2" fill={GOLD} transform="rotate(45 126 118)" />
    </g>
  );
}

function Keychain() {
  return (
    <g>
      <path d="M90 52 L90 40 M80 44 L80 34 M100 44 L100 34" stroke={GOLD_DIM} strokeWidth="4" strokeLinecap="round" />
      <circle cx="90" cy="60" r="22" fill="none" stroke={GOLD_DIM} strokeWidth="4" />
      <path d="M76 66 C72 58 72 50 76 44 M104 66 C108 58 108 50 104 44" stroke="none" />
      <circle cx="90" cy="88" r="26" fill={GOLD} stroke={GOLD_DIM} strokeWidth="3" />
      <rect x="82" y="74" width="16" height="6" rx="3" fill={INK} />
      <rect x="86" y="80" width="3" height="9" rx="1.5" fill={INK} />
      <rect x="92" y="80" width="3" height="9" rx="1.5" fill={INK} />
    </g>
  );
}

function ChessSet() {
  return (
    <g>
      <rect x="54" y="104" width="72" height="48" rx="6" fill="#6b4a2b" stroke={PANEL_EDGE} strokeWidth="3" />
      <rect x="54" y="104" width="72" height="24" rx="6" fill="#8b5e33" stroke={PANEL_EDGE} strokeWidth="3" />
      <g fill={PANEL_EDGE}>
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 6 }).map((_, c) => {
            const even = (r + c) % 2 === 0;
            return (
              <rect
                key={`${r}-${c}`}
                x={54 + c * 12 + (r % 2 === 0 ? 0 : 12)}
                y={104 + r * 12}
                width="12"
                height="12"
                fill={even ? "#caa26a" : "#7c4a1f"}
              />
            );
          }),
        )}
      </g>
      <rect x="62" y="88" width="8" height="16" rx="3" fill="#efe3c8" stroke={PANEL_EDGE} strokeWidth="2" />
      <circle cx="66" cy="84" r="6" fill="#efe3c8" stroke={PANEL_EDGE} strokeWidth="2" />
      <rect x="86" y="88" width="9" height="16" rx="3" fill={INK} stroke={PANEL_EDGE} strokeWidth="2" />
      <path d="M90 88 L94 82 L86 82 Z" fill={INK} />
      <rect x="104" y="88" width="8" height="16" rx="3" fill={INK} stroke={PANEL_EDGE} strokeWidth="2" />
      <circle cx="108" cy="84" r="6" fill={INK} stroke={PANEL_EDGE} strokeWidth="2" />
    </g>
  );
}

export function ProductArt({ art, color }: { art: ProductArt; color: string }) {
  return (
    <svg viewBox="0 0 180 220" className="h-full w-full" aria-hidden="true">
      {art === "tshirt" && <TShirt color={color} />}
      {art === "hoodie" && <Hoodie color={color} />}
      {art === "cap" && <Cap color={color} />}
      {art === "sticker" && <StickerPack />}
      {art === "pin" && <Pin />}
      {art === "mug" && <Mug color={color} />}
      {art === "tote" && <Tote color={color} />}
      {art === "headphones" && <Headphones />}
      {art === "earbuds" && <Earbuds />}
      {art === "mousepad" && <Mousepad />}
      {art === "keychain" && <Keychain />}
      {art === "chessset" && <ChessSet />}
      <ForkMark x={162} y={30} size={15} className="opacity-70" />
    </svg>
  );
}

export const COLOR_HEX: Record<string, string> = {
  Black: "#1c2130",
  Midnight: "#101a2e",
  Forest: "#14231b",
  White: "#e8e6e1",
  Bone: "#d9cfc0",
  Emerald: "#0f3d2e",
  Olive: "#3c3a26",
  "Gold / Red": "#b8860b",
  Assorted: "#2a3147",
  Natural: "#c9b389",
  "Matte Black": "#151a26",
  Dark: "#0d1322",
  Walnut: "#6b4a2b",
  Gold: "#b98a1f",
};
