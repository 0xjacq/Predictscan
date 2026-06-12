// State Management
let appState = {
  categories: [],
  opportunities: [],
  selectedNetwork: 'mainnet',
  filters: {
    search: '',
    type: 'all', // 'all', 'yes', 'no'
    sortBy: 'liquidity', // 'liquidity', 'profit'
    minProfit: 0.0,
    sportsOnly: true, // Default to filter for sports/soccer/World Cup matches
    tagIds: '14,81,113', // Default to Soccer & World Cup tags
    minLiquidity: 100 // Default target shares / minimum required liquidity
  },
  realtime: {
    enabled: true,
    interval: 10, // seconds
    soundAlert: false,
    countdownTimerId: null,
    remainingSeconds: 0,
    previousOppsKeys: new Set(),
    isFirstScan: true
  }
};

// DOM Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const searchFilter = document.getElementById('search-filter');
const arbitrageTypeFilter = document.getElementById('arbitrage-type-filter');
const sortByFilter = document.getElementById('sort-by-filter');
const categoryTagFilter = document.getElementById('category-tag-filter');
const profitThreshold = document.getElementById('profit-threshold');
const liquidityThreshold = document.getElementById('liquidity-threshold');
const opportunitiesContainer = document.getElementById('opportunities-container');
const opportunitiesBadge = document.getElementById('opportunities-badge');
const totalMatchesBadge = document.getElementById('total-matches-badge');
const marketsTableBody = document.getElementById('markets-table-body');

// Real-time DOM Elements
const soundToggle = document.getElementById('sound-toggle');
const realtimeStatusContainer = document.getElementById('realtime-status-container');
const realtimeCountdown = document.getElementById('realtime-countdown');

// Stats DOM Elements
const statTotalScanned = document.getElementById('stat-total-scanned');
const statOpportunitiesCount = document.getElementById('stat-opportunities-count');
const statMaxProfit = document.getElementById('stat-max-profit');
const statLastRefresh = document.getElementById('stat-last-refresh');

// Init Setup
document.addEventListener('DOMContentLoaded', () => {
  // Live Filtering Events
  searchFilter.addEventListener('input', (e) => {
    appState.filters.search = e.target.value.toLowerCase();
    renderAll();
  });

  arbitrageTypeFilter.addEventListener('change', (e) => {
    appState.filters.type = e.target.value;
    renderAll();
  });

  sortByFilter.addEventListener('change', (e) => {
    appState.filters.sortBy = e.target.value;
    renderAll();
  });

  categoryTagFilter.addEventListener('change', (e) => {
    appState.filters.tagIds = e.target.value;
    performScan();
  });

  profitThreshold.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0.0;
    appState.filters.minProfit = val;
    document.getElementById('profit-threshold-val').textContent =
      `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
    renderAll();
  });

  liquidityThreshold.addEventListener('input', (e) => {
    const val = parseInt(e.target.value) || 1;
    appState.filters.minLiquidity = val;
    document.getElementById('liquidity-threshold-val').textContent = val.toLocaleString();
    renderAll();
  });

  // Real-time Controls Events
  soundToggle.addEventListener('change', (e) => {
    appState.realtime.soundAlert = e.target.checked;
    localStorage.setItem('predict_sound_alert', e.target.checked.toString());
  });

  // Load Configurations from Backend Config
  fetch('/api/config')
    .then((res) => res.json())
    .then((config) => {
      const savedSound = localStorage.getItem('predict_sound_alert') === 'true';

      appState.realtime.enabled = true; // Auto-scan is the only mode
      appState.realtime.interval = config.scanInterval || 10;
      appState.realtime.remainingSeconds = appState.realtime.interval;

      soundToggle.checked = savedSound;
      appState.realtime.soundAlert = savedSound;

      // Always start auto scan on load
      setTimeout(() => {
        startAutoScan();
      }, 500);

      // Scan markets immediately when the config is loaded
      performScan();
    })
    .catch((err) => {
      console.error('Failed to load server config:', err);
      // Fallback defaults
      appState.realtime.enabled = true;
      appState.realtime.interval = 10;
      appState.realtime.remainingSeconds = 10;
      startAutoScan();
      performScan();
    });
});

// Update UI Connection Status
function setStatus(status, text) {
  if (!statusDot || !statusText) return;
  statusDot.className = 'dot';
  if (status === 'idle') {
    statusDot.classList.add('dot-idle');
  } else if (status === 'loading') {
    statusDot.classList.add('dot-loading');
  } else if (status === 'error') {
    statusDot.classList.add('dot-error');
  }
  statusText.textContent = text;
}

// Real-Time Scanning Helper Functions
function startAutoScan() {
  stopAutoScan();

  realtimeStatusContainer.style.display = 'flex';
  appState.realtime.remainingSeconds = appState.realtime.interval;
  updateCountdownUI();

  // Tick countdown timer every second
  appState.realtime.countdownTimerId = setInterval(() => {
    appState.realtime.remainingSeconds--;
    if (appState.realtime.remainingSeconds <= 0) {
      triggerAutoScan();
    } else {
      updateCountdownUI();
    }
  }, 1000);

  localStorage.setItem('predict_autoscan', 'true');
  localStorage.setItem('predict_autoscan_interval', appState.realtime.interval.toString());
}

function stopAutoScan() {
  if (appState.realtime.countdownTimerId) {
    clearInterval(appState.realtime.countdownTimerId);
    appState.realtime.countdownTimerId = null;
  }
  realtimeStatusContainer.style.display = 'none';
  localStorage.setItem('predict_autoscan', 'false');
}

function updateCountdownUI() {
  realtimeCountdown.textContent = `Next scan in ${appState.realtime.remainingSeconds}s`;
}

async function triggerAutoScan() {
  if (appState.realtime.countdownTimerId) {
    clearInterval(appState.realtime.countdownTimerId);
  }
  realtimeCountdown.textContent = 'Scanning...';

  try {
    await performScan();
  } catch (err) {
    console.error('Auto scan failed:', err);
  }

  // Restart countdown if still enabled
  if (appState.realtime.enabled) {
    appState.realtime.remainingSeconds = appState.realtime.interval;
    updateCountdownUI();
    appState.realtime.countdownTimerId = setInterval(() => {
      appState.realtime.remainingSeconds--;
      if (appState.realtime.remainingSeconds <= 0) {
        triggerAutoScan();
      } else {
        updateCountdownUI();
      }
    }, 1000);
  }
}

function playAlertSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Play a premium double-note chime (C6 followed by G6)
    const playBeep = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playBeep(1046.5, now, 0.15); // C6
    playBeep(1567.98, now + 0.1, 0.25); // G6
  } catch (e) {
    console.error('Failed to play synthesizer alert:', e);
  }
}

function showToastNotification(opp) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${opp.type.replace(/_/g, '-')}`;

  const targetId =
    opp.type === 'binary'
      ? `opp-card-binary-${opp.categorySlug}-${opp.marketId}`
      : `opp-card-${opp.type}-${opp.categorySlug}`;

  toast.setAttribute('data-target-id', targetId);
  toast.style.cursor = 'pointer';

  const typeLabels = {
    binary: 'Binary Arbitrage (YES + NO)',
    yes_neg_risk: 'Negative Risk YES Arbitrage',
    no_neg_risk: 'Negative Risk NO Arbitrage'
  };

  const typeLabel = typeLabels[opp.type] || 'Arbitrage Opportunity';

  toast.innerHTML = `
    <div class="toast-header">
      <span>${typeLabel}</span>
      <button class="toast-close" style="z-index: 10;">&times;</button>
    </div>
    <div class="toast-title">${opp.categoryTitle}</div>
    ${opp.marketTitle ? `<div class="toast-meta">${opp.marketTitle}</div>` : ''}
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
      <span class="toast-profit">+${opp.profitPct.toFixed(2)}% Net Profit</span>
      <a href="https://predict.fun/market/${opp.categorySlug}" target="_blank" class="toast-trade-link" style="color: var(--primary); font-weight: 600; text-decoration: none; font-size: 0.85rem; z-index: 10;">Trade ↗</a>
    </div>
  `;

  // Attach click handler to toast card (for scrolling)
  toast.addEventListener('click', (e) => {
    // If close button or trade link was clicked, don't scroll
    if (
      e.target.classList.contains('toast-close') ||
      e.target.classList.contains('toast-trade-link')
    ) {
      return;
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Flash highlight animation
      targetEl.classList.remove('highlight-flash');
      void targetEl.offsetWidth; // Trigger reflow to restart animation
      targetEl.classList.add('highlight-flash');
      setTimeout(() => {
        targetEl.classList.remove('highlight-flash');
      }, 1500);
    }
  });

  // Attach close event listener
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      toast.remove();
    }, 500);
  });

  container.appendChild(toast);

  // Auto remove after 6 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        toast.remove();
      }, 500);
    }
  }, 6000);
}

function checkNewOpportunitiesAlert() {
  const currentFiltered = getFilteredOpportunities();
  let playAlert = false;
  const newKeys = new Set();
  const newlyDiscoveredOpps = [];

  currentFiltered.forEach((opp) => {
    // Unique key including category, type, and profit percentage (rounded to 3 decimals to avoid tiny float differences triggering beeps)
    const key = `${opp.categorySlug}_${opp.type}_${opp.profitPct.toFixed(3)}`;
    newKeys.add(key);

    // Play alert if this is a new opportunity
    if (!appState.realtime.previousOppsKeys.has(key)) {
      playAlert = true;
      newlyDiscoveredOpps.push(opp);
    }
  });

  // If this is the first launch/scan, populate the list keys but do NOT trigger any sounds or popups
  if (appState.realtime.isFirstScan) {
    appState.realtime.isFirstScan = false;
    appState.realtime.previousOppsKeys = newKeys;
    return;
  }

  // Update saved history
  appState.realtime.previousOppsKeys = newKeys;

  // Trigger chime and show popup if enabled and new opportunities exist
  if (playAlert && currentFiltered.length > 0) {
    if (appState.realtime.soundAlert) {
      playAlertSound();
    }
    // Show toast popups for newly discovered opportunities
    newlyDiscoveredOpps.forEach((opp) => {
      showToastNotification(opp);
    });
  }
}

// Fetch all markets & calculate opportunities
async function performScan() {
  setStatus('loading', 'Scanning Predict.fun...');

  try {
    const headers = {
      'x-network': appState.selectedNetwork
    };

    let fetchUrl = `/api/all-categories?network=${appState.selectedNetwork}&status=OPEN`;
    if (appState.filters.tagIds !== 'all') {
      fetchUrl += `&tagIds=${appState.filters.tagIds}`;
    }
    const response = await fetch(fetchUrl, { headers });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'API fetch failed');
    }

    appState.categories = result.data || [];
    calculateOpportunities();
    renderAll();

    setStatus('idle', 'Scan Completed');
    statLastRefresh.textContent = new Date().toLocaleTimeString();
  } catch (error) {
    console.error('Scan Error:', error);
    setStatus('error', `Error: ${error.message}`);
    alert(
      `Scan failed: ${error.message}\nMake sure your network mode is correct and that the API key in your server's .env file is correct.`
    );
  }
}

// Core Arbitrage Calculation Engine (Delegated to ArbCalculator)
function calculateOpportunities() {
  appState.opportunities = ArbCalculator.calculateOpportunities(appState.categories);
  checkNewOpportunitiesAlert();
}

// Render Dashboard Data
function renderAll() {
  renderStats();
  renderOpportunities();
  renderMarketsTable();
}

// Render Header Stats Panel
function renderStats() {
  statTotalScanned.textContent = appState.categories.length;

  // Filter opportunities based on filters
  const filteredOpps = getFilteredOpportunities();
  statOpportunitiesCount.textContent = filteredOpps.length;

  // Max profit
  if (filteredOpps.length > 0) {
    const maxProfitVal = Math.max(...filteredOpps.map((o) => o.profitPct));
    statMaxProfit.textContent = `${maxProfitVal.toFixed(2)}%`;
  } else {
    statMaxProfit.textContent = '0.00%';
  }
}

// Get filtered opportunities list
function getFilteredOpportunities() {
  const filtered = appState.opportunities.filter((opp) => {
    // Search filter matching category title, slug or details
    const searchMatch =
      !appState.filters.search ||
      opp.categoryTitle.toLowerCase().includes(appState.filters.search) ||
      opp.categorySlug.toLowerCase().includes(appState.filters.search);

    // Arbitrage type filter (All, YES only, NO only)
    let typeMatch = true;
    if (appState.filters.type === 'yes') {
      typeMatch = opp.type === 'yes_neg_risk';
    } else if (appState.filters.type === 'no') {
      typeMatch = opp.type === 'no_neg_risk';
    }

    // Profit threshold
    const profitMatch = opp.profitPct >= appState.filters.minProfit;

    // Sports filter
    const sportsMatch = !appState.filters.sportsOnly || opp.isSports;

    // Liquidity threshold (shares bottleneck)
    const liquidityMatch = opp.liquidity >= appState.filters.minLiquidity;

    return searchMatch && typeMatch && profitMatch && sportsMatch && liquidityMatch;
  });

  // Sort dynamically based on selected criteria
  return filtered.sort((a, b) => {
    if (appState.filters.sortBy === 'liquidity') {
      if (b.liquidityScore !== a.liquidityScore) {
        return b.liquidityScore - a.liquidityScore;
      }
      return b.profitPct - a.profitPct; // Tie-breaker: Profit %
    } else {
      if (b.profitPct !== a.profitPct) {
        return b.profitPct - a.profitPct;
      }
      return b.liquidityScore - a.liquidityScore; // Tie-breaker: Liquidity Score
    }
  });
}

// Render Opportunities Container Cards
function renderOpportunities() {
  opportunitiesContainer.innerHTML = '';
  const filtered = getFilteredOpportunities();
  opportunitiesBadge.textContent = `${filtered.length} Found`;

  if (filtered.length === 0) {
    opportunitiesContainer.innerHTML = `
      <div class="empty-state">
        <p>No active arbitrage opportunities found matching your criteria.</p>
        <p class="tagline">Tip: Try disabling the "Soccer/Sports Only" filter or lowering the "Min Profit %" threshold.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((opp) => {
    const card = document.createElement('div');
    card.className = 'opp-card';
    card.id =
      opp.type === 'binary'
        ? `opp-card-binary-${opp.categorySlug}-${opp.marketId}`
        : `opp-card-${opp.type}-${opp.categorySlug}`;

    // Header section
    const oppTypeName =
      opp.type === 'binary'
        ? 'Binary Arb (YES + NO)'
        : opp.type === 'yes_neg_risk'
          ? 'YES Negative Risk Arbitrage'
          : 'NO Negative Risk Arbitrage';

    let startBadgeHtml = '';
    if (opp.startsAt) {
      try {
        const start = new Date(opp.startsAt);
        const formatted = start.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        startBadgeHtml = `<span class="badge-neutral" style="background: rgba(255, 255, 255, 0.05); color: var(--text-main); font-weight: 500;"><span style="margin-right: 4px;">📅</span>Starts: ${formatted}</span>`;
      } catch (e) {
        console.error('Failed to parse startsAt:', e);
      }
    }

    const headerHtml = `
      <div class="opp-header">
        <div class="opp-meta">
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.4rem;">
            <span class="badge-neutral">${oppTypeName}</span>
            ${startBadgeHtml}
          </div>
          <h3 class="opp-title">${opp.categoryTitle}</h3>
          <span class="opp-slug">Category: ${opp.categorySlug}</span>
        </div>
        <div class="opp-header-right">
          <a href="https://predict.fun/market/${opp.categorySlug}" target="_blank" class="btn-trade">
            Trade on Predict.fun ↗
          </a>
          <div class="opp-profit-badge">
            <p class="opp-profit-label">Expected Net Profit</p>
            <span>${opp.profitPct.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    `;

    // Calculate color and status text for Liquidity Score
    let scoreColor = 'var(--accent-red)';
    let scoreText = 'Low';
    if (opp.liquidityScore >= 70) {
      scoreColor = 'var(--accent-green)';
      scoreText = 'Excellent';
    } else if (opp.liquidityScore >= 50) {
      scoreColor = '#00d2ff'; // bright cyan
      scoreText = 'Good';
    } else if (opp.liquidityScore >= 30) {
      scoreColor = 'var(--accent-orange)';
      scoreText = 'Fair';
    }

    // Safety check for user target order size
    const targetShares = parseFloat(liquidityThreshold.value) || 100;
    const canTradeTarget = opp.liquidity >= targetShares;
    const safetyBadgeClass = canTradeTarget ? 'safety-safe' : 'safety-risk';
    const safetyBadgeText = canTradeTarget
      ? `✓ Safe: Top of book has depth for ${targetShares} shares (no move)`
      : `⚠️ Slippage Risk: Order of ${targetShares} shares exceeds top depth (max safe: ${Math.floor(opp.liquidity)} shares)`;

    const liquidityInfoHtml = `
      <div class="opp-liquidity-info">
        <div class="liquidity-score-container">
          <span class="liquidity-score-label">Liquidity Score</span>
          <div class="liquidity-score-bar-wrapper">
            <div class="liquidity-score-bar" style="width: ${opp.liquidityScore}%; background-color: ${scoreColor}"></div>
          </div>
          <span class="liquidity-score-value" style="color: ${scoreColor}">${opp.liquidityScore}/100 (${scoreText})</span>
        </div>
        <div class="liquidity-details-row">
          <span class="liquidity-detail-item"><strong>Avg Spread:</strong> ${(opp.avgSpread * 100).toFixed(1)}%</span>
          <span class="liquidity-detail-item"><strong>Max Safe Size:</strong> ${opp.liquidity.toFixed(1)} shares</span>
          <span class="liquidity-safety-badge ${safetyBadgeClass}">${safetyBadgeText}</span>
        </div>
      </div>
    `;

    // Table Details
    let detailsHtml = `
      <div class="opp-grid">
        <div class="opp-grid-col">
          <p class="opp-col-title">Contract Hedging Details</p>
    `;

    opp.details.forEach((item) => {
      // Format quantity nicely: show decimals if less than 10, otherwise round
      const formattedQty =
        item.size < 10 ? item.size.toFixed(2) : Math.round(item.size).toLocaleString();
      detailsHtml += `
        <div class="opp-item">
          <span class="opp-item-name">${item.marketTitle || item.outcomeName} (${item.outcomeName || 'NO'})</span>
          <span class="opp-item-price">$${item.price.toFixed(2)} (Qty: ${formattedQty})</span>
        </div>
      `;
    });

    detailsHtml += `
        </div>
        <div class="opp-grid-col">
          <p class="opp-col-title">Arbitrage Cost & Payout</p>
          <div class="opp-item">
            <span>Combined Cost per Share</span>
            <span class="opp-item-price">$${opp.sumPrice.toFixed(2)}</span>
          </div>
          <div class="opp-item">
            <span>Guaranteed Payout per Share</span>
            <span class="opp-item-price" style="color: var(--accent-green)">$${opp.payout.toFixed(2)}</span>
          </div>
          <div class="opp-total-row">
            <span>Net Profit per Share</span>
            <span style="color: var(--accent-green)">+$${(opp.payout - opp.sumPrice).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;

    // Instructions HTML
    let instructionsHtml = '';
    if (opp.type === 'yes_neg_risk') {
      instructionsHtml = `
        <div class="opp-instructions">
          <h4>💡 Executing YES Negative Risk Hedge</h4>
          <p>Buy exactly <strong>1 share</strong> of the <strong>YES outcome</strong> of each of the ${opp.outcomesCount} markets listed on the left. The total cost is $${opp.sumPrice.toFixed(2)}. Since exactly one outcome will resolve to YES, you will receive $1.00 at resolution, locking in a profit of $${(1.0 - opp.sumPrice).toFixed(2)} per share.</p>
        </div>
      `;
    } else if (opp.type === 'no_neg_risk') {
      instructionsHtml = `
        <div class="opp-instructions">
          <h4>💡 Executing NO Negative Risk Hedge</h4>
          <p>Buy exactly <strong>1 share</strong> of the <strong>NO outcome</strong> of each of the ${opp.outcomesCount} markets listed on the left. The total cost is $${opp.sumPrice.toFixed(2)}. Since exactly one outcome will resolve to YES, the remaining ${opp.outcomesCount - 1} markets will resolve to NO. Each NO contract pays $1.00, meaning your guaranteed payout is $${opp.payout.toFixed(2)}, locking in a profit of $${(opp.payout - opp.sumPrice).toFixed(2)} per share.</p>
        </div>
      `;
    } else {
      instructionsHtml = `
        <div class="opp-instructions">
          <h4>💡 Executing Binary Hedge</h4>
          <p>Buy exactly <strong>1 YES</strong> and <strong>1 NO</strong> share on the market <i>"${opp.marketTitle}"</i>. The combined cost is $${opp.sumPrice.toFixed(2)}. At settlement, one contract resolves to YES and the other to NO, paying you exactly $1.00 and yielding a profit of $${(1.0 - opp.sumPrice).toFixed(2)}.</p>
        </div>
      `;
    }

    card.innerHTML = headerHtml + liquidityInfoHtml + detailsHtml + instructionsHtml;
    opportunitiesContainer.appendChild(card);
  });
}

// Render Scanned Markets Browser (Table)
function renderMarketsTable() {
  marketsTableBody.innerHTML = '';

  // Filter categories by search keyword and sports toggle
  const filteredCategories = appState.categories.filter((category) => {
    const searchMatch =
      !appState.filters.search ||
      category.title.toLowerCase().includes(appState.filters.search) ||
      category.slug.toLowerCase().includes(appState.filters.search);

    const sportsMatch = !appState.filters.sportsOnly || ArbCalculator.isSportsCategory(category);

    return searchMatch && sportsMatch;
  });

  totalMatchesBadge.textContent = `${filteredCategories.length} Matches`;

  if (filteredCategories.length === 0) {
    marketsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">No matching markets found.</td>
      </tr>
    `;
    return;
  }

  // Limit matching matches list (e.g. to 50) to prevent page lag and clutter
  const limit = 50;
  const displayedCategories = filteredCategories.slice(0, limit);

  displayedCategories.forEach((category) => {
    const markets = category.markets || [];

    markets.forEach((market, idx) => {
      const row = document.createElement('tr');

      const yesOutcome = ArbCalculator.getYesOutcome(market);
      const noOutcome = ArbCalculator.getNoOutcome(market);

      const yesAsk =
        yesOutcome && yesOutcome.bestAsk ? `$${yesOutcome.bestAsk.price.toFixed(2)}` : 'None';
      const noAsk =
        noOutcome && noOutcome.bestAsk ? `$${noOutcome.bestAsk.price.toFixed(2)}` : 'None';

      // Category cell only spans the first row of that category
      let categoryCell = '';
      if (idx === 0) {
        categoryCell = `<td rowspan="${markets.length}" class="cell-bold">${category.title}</td>`;
      }

      row.innerHTML = `
        ${categoryCell}
        <td>${market.title || market.question}</td>
        <td class="cell-mono">${yesAsk}</td>
        <td class="cell-mono">${noAsk}</td>
        <td><span class="status-badge-open">${market.tradingStatus}</span></td>
      `;

      marketsTableBody.appendChild(row);
    });
  });

  if (filteredCategories.length > limit) {
    const footerRow = document.createElement('tr');
    footerRow.innerHTML = `
      <td colspan="5" class="table-info-row" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 1.5rem; background: rgba(255, 255, 255, 0.01);">
        Showing first ${limit} of ${filteredCategories.length} matches. Use the search bar above to narrow down.
      </td>
    `;
    marketsTableBody.appendChild(footerRow);
  }
}
