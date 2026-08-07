import { test } from "@playwright/test";

test("check raw stockfish output", async ({ page }) => {
  await page.goto("/analysis");
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(msg.text()));
  const r = await page.evaluate(async () => {
    const w = new Worker("/engineWorker.js");
    return new Promise<string>((resolve) => {
      const msgs: any[] = [];
      w.onmessage = (e) => {
        msgs.push(e.data);
        // After getting 20+ messages or after "ready", resolve
        if (msgs.length > 20 || (e.data && e.data.type === "ready")) {
          resolve(JSON.stringify(msgs.slice(0, 25)));
        }
      };
      setTimeout(() => resolve("TIMEOUT after " + msgs.length + " msgs: " + JSON.stringify(msgs.slice(0, 10))), 20000);
    });
  });
  console.log("Worker msgs:", typeof r === "string" ? r.slice(0, 3000) : JSON.stringify(r).slice(0, 3000));
});
