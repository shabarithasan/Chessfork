import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type GitHubRelease = {
  tag_name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
};

function getPlatformAssetName() {
  if (process.platform === "win32" && process.arch === "x64") {
    return "stockfish-windows-x86-64.zip";
  }

  if (process.platform === "linux" && process.arch === "x64") {
    return "stockfish-ubuntu-x86-64.tar";
  }

  if (process.platform === "darwin" && process.arch === "arm64") {
    return "stockfish-macos-m1-apple-silicon.tar";
  }

  if (process.platform === "darwin" && process.arch === "x64") {
    return "stockfish-macos-x86-64.tar";
  }

  throw new Error(`Unsupported platform for bundled Stockfish install: ${process.platform} ${process.arch}`);
}

async function downloadFile(url: string, destinationPath: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Knightowl/0.1 (+https://knightowl.app)",
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download ${url}`);
  }

  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(destinationPath));
}

async function extractArchive(archivePath: string, destinationPath: string) {
  if (process.platform === "win32") {
    await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destinationPath.replace(/'/g, "''")}' -Force`,
    ]);
    return;
  }

  await execFileAsync("tar", ["-xf", archivePath, "-C", destinationPath]);
}

async function main() {
  const assetName = getPlatformAssetName();
  const releaseResponse = await fetch("https://api.github.com/repos/official-stockfish/Stockfish/releases/latest", {
    headers: {
      "User-Agent": "Knightowl/0.1 (+https://knightowl.app)",
      Accept: "application/vnd.github+json",
    },
  });

  if (!releaseResponse.ok) {
    throw new Error("Unable to read the latest Stockfish release metadata from GitHub.");
  }

  const release = (await releaseResponse.json()) as GitHubRelease;
  const asset = release.assets.find((entry) => entry.name === assetName);

  if (!asset) {
    throw new Error(`Latest Stockfish release ${release.tag_name} does not include ${assetName}.`);
  }

  const vendorRoot = path.join(process.cwd(), "vendor", "stockfish");
  const releaseRoot = path.join(vendorRoot, release.tag_name);
  const tempRoot = path.join(os.tmpdir(), `knightowl-stockfish-${Date.now()}`);
  await mkdir(tempRoot, { recursive: true });
  const archivePath = path.join(tempRoot, asset.name);

  await rm(releaseRoot, { force: true, recursive: true });
  await mkdir(releaseRoot, { recursive: true });

  console.log(`Downloading ${release.tag_name} (${asset.name})...`);
  await downloadFile(asset.browser_download_url, archivePath);

  console.log("Extracting official Stockfish package...");
  await extractArchive(archivePath, releaseRoot);

  const extractedRoot = path.join(releaseRoot, "stockfish");
  const extractedStats = await stat(extractedRoot).catch(() => null);
  const installPath = extractedStats?.isDirectory() ? extractedRoot : releaseRoot;

  console.log(`Installed Stockfish ${release.tag_name} at ${installPath}`);
  console.log("Set STOCKFISH_PATH if you want to override this location.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
