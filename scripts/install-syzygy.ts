import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

const DEFAULT_SOURCE_URLS = [
  "http://tablebase.sesse.net/syzygy/3-4-5/",
  "https://tablebase.lichess.ovh/tables/standard/3-4-5/",
];
const targetDirectory = path.resolve(process.argv[2] ?? "vendor/syzygy/3-4-5");
const sourceUrls = process.env.SYZYGY_SOURCE_URL
  ? process.env.SYZYGY_SOURCE_URL.split(",").map((url) => url.trim()).filter(Boolean)
  : DEFAULT_SOURCE_URLS;

async function fileExists(targetPath: string) {
  const info = await stat(targetPath).catch(() => null);
  return Boolean(info?.isFile() && info.size > 0);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(url: string, init?: RequestInit, attempts = 4) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await delay(1_500 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function listTablebaseFiles(baseUrl: string) {
  const response = await fetchWithRetry(baseUrl);
  const html = await response.text();
  const files = [...html.matchAll(/href="([^"]+\.(?:rtbw|rtbz))"/gi)].map((match) => new URL(match[1], baseUrl).href);

  return [...new Set(files)].sort();
}

async function listTablebaseFilesFromFirstAvailableSource(baseUrls: string[]) {
  const failures: string[] = [];

  for (const baseUrl of baseUrls) {
    try {
      const files = await listTablebaseFiles(baseUrl);
      if (files.length > 0) {
        console.log(`Using Syzygy mirror: ${baseUrl}`);
        return files;
      }

      failures.push(`${baseUrl}: no .rtbw/.rtbz links found`);
    } catch (error) {
      failures.push(`${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`No Syzygy mirror worked.\n${failures.join("\n")}`);
}

async function downloadFile(fileUrl: string, targetPath: string) {
  if (await fileExists(targetPath)) {
    console.log(`skip ${path.basename(targetPath)}`);
    return;
  }

  const tempPath = `${targetPath}.download`;
  await rm(tempPath, { force: true });

  const response = await fetchWithRetry(fileUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${fileUrl}: ${response.status} ${response.statusText}`);
  }

  try {
    await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>), createWriteStream(tempPath));
    const expectedBytes = Number(response.headers.get("content-length") ?? "0");
    const downloadedInfo = await stat(tempPath);
    if (expectedBytes > 0 && downloadedInfo.size !== expectedBytes) {
      throw new Error(`Downloaded ${downloadedInfo.size} bytes but expected ${expectedBytes} bytes for ${fileUrl}`);
    }
    await rename(tempPath, targetPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }

  console.log(`saved ${targetPath}`);
}

await mkdir(targetDirectory, { recursive: true });

const files = await listTablebaseFilesFromFirstAvailableSource(sourceUrls);

console.log(`Downloading ${files.length} Syzygy WDL+DTZ files to ${targetDirectory}`);
for (const fileUrl of files) {
  const fileName = path.basename(new URL(fileUrl).pathname);
  await downloadFile(fileUrl, path.join(targetDirectory, fileName));
}

console.log("");
console.log("Set STOCKFISH_SYZYGY_PATH to this directory:");
console.log(targetDirectory);
