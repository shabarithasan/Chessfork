const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.text().includes('[AlternativeLines]')) {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:3000/analysis...');
  await page.goto('http://localhost:3000/analysis', { waitUntil: 'networkidle2' });
  
  // Wait a bit for the engine to generate lines
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  console.log('Done.');
})();
