import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

const sourceUrl = process.argv[2] ?? process.env.OPENING_BOOK_URL;
const targetPath = path.resolve(process.argv[3] ?? "vendor/books/Perfect2023.bin");

if (!sourceUrl) {
  console.error("Provide a Polyglot .bin URL as the first argument or set OPENING_BOOK_URL.");
  console.error("Example: npm run opening-book:install -- https://example.com/Perfect2023.bin");
  process.exit(1);
}

await mkdir(path.dirname(targetPath), { recursive: true });

const response = await fetch(sourceUrl);
if (!response.ok || !response.body) {
  throw new Error(`Failed to download ${sourceUrl}: ${response.status} ${response.statusText}`);
}

await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>), createWriteStream(targetPath));

console.log(`saved ${targetPath}`);
console.log("");
console.log("Set STOCKFISH_OPENING_BOOK_PATH to this file:");
console.log(targetPath);
