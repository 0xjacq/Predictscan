require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Simple in-memory cache to prevent hitting Predict.fun rate limits (240 req/min)
const categoryCache = new Map();
const CACHE_TTL_SEC = parseInt(process.env.CACHE_TTL) || 10;
const CACHE_TTL = CACHE_TTL_SEC * 1000; // Match scan interval config in ms

// Helper to determine active network and API endpoint details
function getApiConfig(_req) {
  // Read network mode and API key strictly from server-side environment variables
  const network = process.env.DEFAULT_NETWORK || 'mainnet';
  const isMainnet = network.toLowerCase() === 'mainnet';

  const baseUrl = isMainnet ? 'https://api.predict.fun/v1' : 'https://api-testnet.predict.fun/v1';
  const apiKey = isMainnet ? process.env.PREDICT_API_KEY || '' : '';

  return { isMainnet, baseUrl, apiKey, networkName: isMainnet ? 'mainnet' : 'testnet' };
}

// Proxies a single request to the Predict.fun API
async function proxyRequest(url, method = 'GET', data = null, headers = {}) {
  const options = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (data) {
    options.data = data;
  }
  return axios(options);
}

// Proxy standard markets query
app.get('/api/markets', async (req, res) => {
  const { baseUrl, apiKey, networkName } = getApiConfig(req);

  try {
    const headers = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    // Forward all query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const targetUrl = `${baseUrl}/markets${queryString ? '?' + queryString : ''}`;

    console.log(`[Proxy] Fetching markets from ${networkName}...`);
    const apiRes = await proxyRequest(targetUrl, 'GET', null, headers);
    res.json(apiRes.data);
  } catch (error) {
    console.error('[Error] Proxying markets failed:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      error: error.response?.data || null
    });
  }
});

// Proxy standard categories query
app.get('/api/categories', async (req, res) => {
  const { baseUrl, apiKey, networkName } = getApiConfig(req);

  try {
    const headers = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const queryString = new URLSearchParams(req.query).toString();
    const targetUrl = `${baseUrl}/categories${queryString ? '?' + queryString : ''}`;

    console.log(`[Proxy] Fetching categories from ${networkName}...`);
    const apiRes = await proxyRequest(targetUrl, 'GET', null, headers);
    res.json(apiRes.data);
  } catch (error) {
    console.error('[Error] Proxying categories failed:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      error: error.response?.data || null
    });
  }
});

// Fetches ALL active categories by paginating through all available pages on Predict.fun
app.get('/api/all-categories', async (req, res) => {
  const { baseUrl, apiKey, networkName } = getApiConfig(req);
  const now = Date.now();

  // Extract query parameters from request (except network and apiKey)
  const queryParams = { ...req.query };
  delete queryParams.network;
  delete queryParams.apiKey;
  const queryString = new URLSearchParams(queryParams).toString();
  const cacheKey = `${networkName}:${queryString}`;

  // Return cached result if fresh and no custom API key was sent on the request
  const customKeySent = !!(req.headers['x-api-key'] || req.query.apiKey);
  if (!customKeySent && categoryCache.has(cacheKey)) {
    const cachedEntry = categoryCache.get(cacheKey);
    if (now - cachedEntry.time < CACHE_TTL) {
      console.log(`[Cache] Returning cached all-categories for ${cacheKey}`);
      return res.json({ success: true, data: cachedEntry.data, cached: true });
    }
  }

  try {
    const headers = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    let allCategories = [];
    let hasMore = true;
    let afterCursor = '';
    let pageCount = 0;
    const maxPages = 15; // Increased max pages safety guard

    console.log(
      `[Proxy] Loading all categories from ${networkName} (paginating with query: ${queryString})...`
    );

    while (hasMore && pageCount < maxPages) {
      const url = `${baseUrl}/categories?first=100${queryString ? '&' + queryString : ''}${afterCursor ? '&after=' + afterCursor : ''}`;
      const apiRes = await proxyRequest(url, 'GET', null, headers);

      if (apiRes.data && apiRes.data.success && apiRes.data.data) {
        const pageData = apiRes.data.data;
        allCategories = allCategories.concat(pageData);

        // Check if there is another page
        if (apiRes.data.cursor && pageData.length === 100) {
          afterCursor = apiRes.data.cursor;
          pageCount++;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(
      `[Proxy] Loaded ${allCategories.length} categories total in ${pageCount + 1} pages.`
    );

    // Save to cache
    if (!customKeySent) {
      categoryCache.set(cacheKey, { data: allCategories, time: now });
    }

    res.json({ success: true, data: allCategories, cached: false });
  } catch (error) {
    console.error('[Error] Paginated fetch of categories failed:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      error: error.response?.data || null
    });
  }
});

// Exposes the configured scan interval & cache duration (matched) to the frontend
app.get('/api/config', (_req, res) => {
  const cacheTtlSec = parseInt(process.env.CACHE_TTL) || 10;
  res.json({
    scanInterval: cacheTtlSec
  });
});

// Start the server
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(' Predict.fun Opportunity Scanner Server Started!');
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Default Network Mode: ${process.env.DEFAULT_NETWORK || 'mainnet'}`);
  console.log('==================================================');
});
