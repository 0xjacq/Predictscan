/**
 * Predict.fun Opportunity Scanner - Arbitrage Math Engine
 * (Dual-environment module supporting browser script tags and CommonJS require)
 */

const ArbCalculator = {
  // Check if a category represents a sports, soccer, or World Cup match
  isSportsCategory(category) {
    const slug = (category.slug || '').toLowerCase();
    const title = (category.title || '').toLowerCase();
    const description = (category.description || '').toLowerCase();

    // Soccer leagues, FIFA World cup, football match triggers
    const sportsKeywords = [
      'world-cup',
      'predict-cup',
      'epl-',
      'premier-league',
      'la-liga',
      'ucl-',
      'champions-league',
      'soccer',
      'football',
      'bundesliga',
      'serie-a',
      'mls-',
      'fc',
      'vs',
      'match',
      'draw'
    ];

    const hasKeywords = sportsKeywords.some(
      (keyword) =>
        slug.includes(keyword) || title.includes(keyword) || description.includes(keyword)
    );

    // Sports categories also typically have tags containing Sports or Soccer
    const hasSportsTag = !!(
      category.tags &&
      category.tags.some((tag) => {
        const tagName = (tag.name || '').toLowerCase();
        return (
          tagName.includes('sports') || tagName.includes('soccer') || tagName.includes('football')
        );
      })
    );

    return !!(hasKeywords || hasSportsTag);
  },

  // Parse YES outcome from a market
  getYesOutcome(market) {
    if (!market.outcomes || market.outcomes.length === 0) return null;

    // 1. Match by name "Yes" or starting with word "yes"
    const yesOutcome = market.outcomes.find((o) => /^yes\b/i.test((o.name || '').trim()));
    if (yesOutcome) return yesOutcome;

    // 2. Fallback to indexSet === 1 (first outcome)
    return market.outcomes.find((o) => o.indexSet === 1) || market.outcomes[0];
  },

  // Parse NO outcome from a market
  getNoOutcome(market) {
    if (!market.outcomes || market.outcomes.length < 2) return null;

    // 1. Match by name "No" or starting with word "no"
    const noOutcome = market.outcomes.find((o) => /^no\b/i.test((o.name || '').trim()));
    if (noOutcome) return noOutcome;

    // 2. Fallback to indexSet === 2 (second outcome)
    return market.outcomes.find((o) => o.indexSet === 2) || market.outcomes[1];
  },

  // Calculate liquidity score from depth and average spread
  calculateLiquidityScore(bottleneckDepth, avgSpread) {
    const scoreDepth = 100 * (1 - Math.exp(-bottleneckDepth / 500));
    const scoreSpread = 100 * Math.exp(-10 * avgSpread);
    return Math.max(0, Math.min(100, Math.round((scoreDepth * scoreSpread) / 100)));
  },

  // Calculate all arbitrage opportunities from categories list
  calculateOpportunities(categories) {
    const opps = [];

    for (const category of categories) {
      if (!category.markets || category.markets.length === 0) continue;

      // Group active open markets
      const openMarkets = category.markets.filter((m) => m.tradingStatus === 'OPEN');
      if (openMarkets.length === 0) continue;

      const N = openMarkets.length;
      const isSports = this.isSportsCategory(category);

      // --- 1. SINGLE MARKET BINARY ARBITRAGE (YES + NO) ---
      for (const market of openMarkets) {
        if (market.outcomes && market.outcomes.length === 2) {
          const yesOutcome = this.getYesOutcome(market);
          const noOutcome = this.getNoOutcome(market);

          if (yesOutcome && noOutcome && yesOutcome.bestAsk && noOutcome.bestAsk) {
            const yesPrice = yesOutcome.bestAsk.price;
            const noPrice = noOutcome.bestAsk.price;
            const sumPrice = yesPrice + noPrice;

            if (sumPrice < 1.0) {
              const profitPct = (1.0 / sumPrice - 1) * 100;

              // Spread calculations
              const yesBid = yesOutcome.bestBid ? yesOutcome.bestBid.price : 0;
              const noBid = noOutcome.bestBid ? noOutcome.bestBid.price : 0;
              const yesSpread = yesPrice - yesBid;
              const noSpread = noPrice - noBid;
              const avgSpread = (yesSpread + noSpread) / 2;

              const bottleneckDepth = Math.min(yesOutcome.bestAsk.size, noOutcome.bestAsk.size);
              const liquidityScore = this.calculateLiquidityScore(bottleneckDepth, avgSpread);

              opps.push({
                type: 'binary',
                categorySlug: category.slug,
                categoryTitle: category.title,
                isSports,
                marketTitle: market.title || market.question,
                marketId: market.id,
                sumPrice,
                profitPct,
                liquidity: bottleneckDepth,
                avgSpread,
                liquidityScore,
                details: [
                  {
                    marketId: market.id,
                    marketTitle: market.title || market.question,
                    name: 'Yes',
                    outcomeName: yesOutcome.name,
                    price: yesPrice,
                    size: yesOutcome.bestAsk.size,
                    bidPrice: yesBid
                  },
                  {
                    marketId: market.id,
                    marketTitle: market.title || market.question,
                    name: 'No',
                    outcomeName: noOutcome.name,
                    price: noPrice,
                    size: noOutcome.bestAsk.size,
                    bidPrice: noBid
                  }
                ],
                payout: 1.0
              });
            }
          }
        }
      }

      // ONLY run negative risk arbitrage if markets are marked as linked negative risk (mutually exclusive)
      if (N > 1 && openMarkets.every((m) => m.isNegRisk === true)) {
        // A. YES ARBITRAGE: Buy YES on all outcomes
        const yesDetails = [];
        let yesSum = 0;
        let yesLiquidity = Infinity;
        let yesValid = true;
        let yesSpreadsSum = 0;

        for (const market of openMarkets) {
          const yesOutcome = this.getYesOutcome(market);
          if (yesOutcome && yesOutcome.bestAsk) {
            const bidPrice = yesOutcome.bestBid ? yesOutcome.bestBid.price : 0;
            const spread = yesOutcome.bestAsk.price - bidPrice;
            yesSpreadsSum += spread;

            yesDetails.push({
              marketId: market.id,
              marketTitle: market.title || market.question,
              outcomeName: yesOutcome.name,
              price: yesOutcome.bestAsk.price,
              size: yesOutcome.bestAsk.size,
              bidPrice: bidPrice
            });
            yesSum += yesOutcome.bestAsk.price;
            yesLiquidity = Math.min(yesLiquidity, yesOutcome.bestAsk.size);
          } else {
            yesValid = false;
            break;
          }
        }

        if (yesValid && yesDetails.length === N) {
          const profitPct = (1.0 / yesSum - 1) * 100;
          const avgSpread = yesSpreadsSum / N;
          const liquidityScore = this.calculateLiquidityScore(yesLiquidity, avgSpread);

          opps.push({
            type: 'yes_neg_risk',
            categorySlug: category.slug,
            categoryTitle: category.title,
            isSports,
            sumPrice: yesSum,
            profitPct,
            liquidity: yesLiquidity,
            avgSpread,
            liquidityScore,
            details: yesDetails,
            payout: 1.0,
            outcomesCount: N
          });
        }

        // B. NO ARBITRAGE: Buy NO on all outcomes
        const noDetails = [];
        let noSum = 0;
        let noLiquidity = Infinity;
        let noValid = true;
        let noSpreadsSum = 0;

        for (const market of openMarkets) {
          const noOutcome = this.getNoOutcome(market);
          if (noOutcome && noOutcome.bestAsk) {
            const bidPrice = noOutcome.bestBid ? noOutcome.bestBid.price : 0;
            const spread = noOutcome.bestAsk.price - bidPrice;
            noSpreadsSum += spread;

            noDetails.push({
              marketId: market.id,
              marketTitle: market.title || market.question,
              outcomeName: noOutcome.name,
              price: noOutcome.bestAsk.price,
              size: noOutcome.bestAsk.size,
              bidPrice: bidPrice
            });
            noSum += noOutcome.bestAsk.price;
            noLiquidity = Math.min(noLiquidity, noOutcome.bestAsk.size);
          } else {
            noValid = false;
            break;
          }
        }

        const payoutAmount = N - 1;
        if (noValid && noDetails.length === N) {
          const profitPct = (payoutAmount / noSum - 1) * 100;
          const avgSpread = noSpreadsSum / N;
          const liquidityScore = this.calculateLiquidityScore(noLiquidity, avgSpread);

          opps.push({
            type: 'no_neg_risk',
            categorySlug: category.slug,
            categoryTitle: category.title,
            isSports,
            sumPrice: noSum,
            profitPct,
            liquidity: noLiquidity,
            avgSpread,
            liquidityScore,
            details: noDetails,
            payout: payoutAmount,
            outcomesCount: N
          });
        }
      }
    }

    return opps;
  }
};

// Export pattern for both browser and Node environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArbCalculator;
}
