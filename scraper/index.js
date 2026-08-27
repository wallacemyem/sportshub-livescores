const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8081;

let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });
  return browserInstance;
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'stealth-scraper' });
});

// Helper for generic in-page scraping with network capture & in-page fetch
async function scrapeBookmaker(options) {
  const { homeUrl, endpoints = [], inputKeywords = ['book', 'coupon', 'code'], code, bookmaker } = options;
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"'
    });

    let capturedData = null;
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('feapi') || url.includes('Coupon') || url.includes('coupon') || url.includes('order') || url.includes('share') || url.includes('ticket')) {
        try {
          const ct = response.headers()['content-type'] || '';
          if (ct.includes('json')) {
            const data = await response.json();
            if (data && (data.data || data.items || data.outcomes || data.D || data.Data)) {
              capturedData = data;
            }
          }
        } catch (e) {}
      }
    });

    await page.goto(homeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    }).catch(() => {});

    // Try finding the booking code input and submit
    try {
      const inputSelector = await page.evaluate((keywords) => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const target = inputs.find(i => {
          const text = ((i.placeholder || '') + ' ' + (i.name || '') + ' ' + (i.id || '') + ' ' + (i.className || '')).toLowerCase();
          return keywords.some(k => text.includes(k));
        });
        if (target) {
          target.id = target.id || 'stealth_booking_input';
          return '#' + target.id;
        }
        return null;
      }, inputKeywords);

      if (inputSelector) {
        await page.type(inputSelector, code, { delay: 50 });
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {}

    if (capturedData) {
      await page.close();
      return { success: true, bookmaker, data: capturedData };
    }

    // Try in-page direct endpoint evaluation
    for (const ep of endpoints) {
      const targetUrl = ep.replace('{CODE}', encodeURIComponent(code));
      const res = await page.evaluate(async (url) => {
        try {
          const resp = await fetch(url, {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          const text = await resp.text();
          try {
            return { json: JSON.parse(text), status: resp.status };
          } catch (e) {
            return { text: text.slice(0, 200), status: resp.status };
          }
        } catch (err) {
          return { error: err.message };
        }
      }, targetUrl);

      if (res && res.json && !res.json.error) {
        await page.close();
        return { success: true, bookmaker, data: res.json };
      }
    }

    await page.close();
    return { success: false, bookmaker, error: `Booking code '${code}' not found on ${bookmaker}.` };
  } catch (err) {
    if (page) await page.close().catch(() => {});
    return { success: false, bookmaker, error: err.message };
  }
}

// 1. Bet9ja
app.post('/api/scrape/bet9ja', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://sports.bet9ja.com/',
    bookmaker: 'bet9ja',
    code,
    endpoints: [
      '/desktop/feapi/CouponAjax/GetCouponByCode?code={CODE}',
      '/desktop/feapi/CouponAjax/CheckCoupon?couponCode={CODE}',
      '/desktop/feapi/Coupon/GetCouponByCode?code={CODE}',
      '/desktop/feapi/PalimpsestAjax/GetCouponByCode?code={CODE}',
      '/feapi/Coupon/GetCouponByCode?code={CODE}'
    ],
    inputKeywords: ['booking number', 'book', 'coupon', 'code']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 2. BetKing
app.post('/api/scrape/betking', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://www.betking.com/',
    bookmaker: 'betking',
    code,
    endpoints: [
      'https://sportsbook-api.betking.com/api/v1/coupon/loadcoupon/{CODE}',
      'https://api-coupon.betking.com/api/v1/coupon/loadcoupon/{CODE}',
      '/api/v1/coupon/loadcoupon/{CODE}'
    ],
    inputKeywords: ['coupon', 'load', 'code', 'book']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 3. 1xBet
app.post('/api/scrape/1xbet', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://1xbet.ng/',
    bookmaker: '1xbet',
    code,
    endpoints: [
      '/service-api/orders/share/{CODE}',
      '/service-api/LiveFeed/GetCouponByCode?code={CODE}',
      '/service-api/coupon/get/{CODE}'
    ],
    inputKeywords: ['save', 'load', 'coupon', 'share']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 4. 22Bet
app.post('/api/scrape/22bet', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://22bet.ng/',
    bookmaker: '22bet',
    code,
    endpoints: [
      '/service-api/orders/share/{CODE}',
      '/service-api/LiveFeed/GetCouponByCode?code={CODE}'
    ],
    inputKeywords: ['save', 'load', 'coupon']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 5. MelBet
app.post('/api/scrape/melbet', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://melbet.ng/',
    bookmaker: 'melbet',
    code,
    endpoints: [
      '/service-api/orders/share/{CODE}',
      '/service-api/LiveFeed/GetCouponByCode?code={CODE}'
    ],
    inputKeywords: ['save', 'load', 'coupon']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 6. MozzartBet
app.post('/api/scrape/mozzartbet', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://www.mozzartbet.ng/',
    bookmaker: 'mozzartbet',
    code,
    endpoints: [
      '/api/v1/ticket/load/{CODE}',
      '/api/v1/ticket/{CODE}',
      'https://api.mozzartbet.com/v1/tickets/{CODE}'
    ],
    inputKeywords: ['ticket', 'code', 'load', 'coupon']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 7. Betway
app.post('/api/scrape/betway', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://www.betway.com.ng/',
    bookmaker: 'betway',
    code,
    endpoints: [
      '/api/Betslip/LoadBetCodes?code={CODE}',
      '/api/v1/coupon/load/{CODE}'
    ],
    inputKeywords: ['booking', 'code', 'bet']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 8. BangBet
app.post('/api/scrape/bangbet', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://www.bangbet.com/',
    bookmaker: 'bangbet',
    code,
    endpoints: [
      'https://api.bangbet.com/api/order/share/{CODE}',
      '/api/order/share/{CODE}'
    ],
    inputKeywords: ['share', 'code', 'book']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 9. Parimatch
app.post('/api/scrape/parimatch', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = await scrapeBookmaker({
    homeUrl: 'https://parimatch.ng/',
    bookmaker: 'parimatch',
    code,
    endpoints: [
      '/api/v1/coupon/load/{CODE}',
      '/api/betslip/share/{CODE}'
    ],
    inputKeywords: ['share', 'coupon', 'code']
  });

  res.status(result.success ? 200 : 404).json(result);
});

// Auto probe across all bookmakers
app.post('/api/scrape/auto', async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const bookmakers = ['bet9ja', 'betking', '1xbet', '22bet', 'melbet', 'mozzartbet', 'betway', 'bangbet', 'parimatch'];
  for (const bm of bookmakers) {
    try {
      let r = null;
      if (bm === 'bet9ja') {
        r = await scrapeBookmaker({
          homeUrl: 'https://sports.bet9ja.com/',
          bookmaker: 'bet9ja',
          code,
          endpoints: ['/feapi/Coupon/GetCouponByCode?code={CODE}']
        });
      } else if (bm === 'betking') {
        r = await scrapeBookmaker({
          homeUrl: 'https://www.betking.com/',
          bookmaker: 'betking',
          code,
          endpoints: ['https://sportsbook-api.betking.com/api/v1/coupon/loadcoupon/{CODE}']
        });
      } else if (bm === '1xbet') {
        r = await scrapeBookmaker({
          homeUrl: 'https://1xbet.ng/',
          bookmaker: '1xbet',
          code,
          endpoints: ['/service-api/orders/share/{CODE}']
        });
      }
      if (r && r.success) {
        return res.json(r);
      }
    } catch (e) {}
  }

  res.status(404).json({ success: false, error: `Booking code '${code}' could not be resolved across any supported sportsbook network.` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stealth scraper microservice listening on port ${PORT}`);
});
