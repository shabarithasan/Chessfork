const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  console.log("Navigating to chessigma.com...");
  try {
    await page.goto('https://chessigma.com', { waitUntil: 'networkidle2', timeout: 15000 });
    const title = await page.title();
    console.log("Title:", title);
  } catch (e) {
    console.error(e.message);
  }
  
  await browser.close();
})();
