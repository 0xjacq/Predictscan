const ArbCalculator = require('../public/arbitrage.js');

describe('ArbCalculator', () => {
  // Test 1: Naming Parsers
  describe('Naming Parsers', () => {
    test('getYesOutcome matches YES outcomes and uses word boundary logic', () => {
      const market = {
        outcomes: [
          { name: 'Yes', indexSet: 1 },
          { name: 'No', indexSet: 2 }
        ]
      };
      const yes = ArbCalculator.getYesOutcome(market);
      expect(yes.name).toBe('Yes');
    });

    test('getNoOutcome matches NO outcomes and uses word boundary logic', () => {
      const market = {
        outcomes: [
          { name: 'Yes', indexSet: 1 },
          { name: 'No', indexSet: 2 }
        ]
      };
      const no = ArbCalculator.getNoOutcome(market);
      expect(no.name).toBe('No');
    });

    test('does not match Norway or NOR as NO outcome', () => {
      const market = {
        outcomes: [
          { name: 'Norway (NOR)', indexSet: 1 },
          { name: 'South Africa (RSA)', indexSet: 2 }
        ]
      };
      const yes = ArbCalculator.getYesOutcome(market);
      const no = ArbCalculator.getNoOutcome(market);

      // Should fallback to default indexSet indices rather than matching "NOR" or "Norway" as "No"
      expect(yes.name).toBe('Norway (NOR)');
      expect(no.name).toBe('South Africa (RSA)');
    });
  });

  // Test 2: Sports Category Matcher
  describe('Sports Category Matcher', () => {
    test('identifies Soccer and World Cup categories', () => {
      const category1 = {
        title: 'Brazil vs. Morocco Halftime Result',
        slug: 'fifwc-bra-mar-2026-06-13'
      };
      const category2 = { title: 'BNB Price Up/Down', slug: 'bnb-updown-5m' };

      expect(ArbCalculator.isSportsCategory(category1)).toBe(true);
      expect(ArbCalculator.isSportsCategory(category2)).toBe(false);
    });
  });

  // Test 3: Liquidity Score Calculation
  describe('Liquidity Score Calculation', () => {
    test('calculates 100 for high liquidity and low spread', () => {
      const score = ArbCalculator.calculateLiquidityScore(2000, 0.001);
      expect(score).toBeGreaterThanOrEqual(95);
    });

    test('calculates 0 for zero depth', () => {
      const score = ArbCalculator.calculateLiquidityScore(0, 0.01);
      expect(score).toBe(0);
    });
  });

  // Test 4: Arbitrage Opportunities Math
  describe('Arbitrage Opportunities Math', () => {
    test('calculates Binary Arbitrage correctly', () => {
      const categories = [
        {
          title: 'Brazil vs. Morocco',
          slug: 'fifwc-bra-mar-2026-06-13',
          markets: [
            {
              id: 1,
              title: 'Will Brazil win?',
              tradingStatus: 'OPEN',
              isNegRisk: false,
              outcomes: [
                {
                  name: 'Yes',
                  indexSet: 1,
                  bestAsk: { price: 0.5, size: 500 },
                  bestBid: { price: 0.49, size: 500 }
                },
                {
                  name: 'No',
                  indexSet: 2,
                  bestAsk: { price: 0.45, size: 500 },
                  bestBid: { price: 0.44, size: 500 }
                }
              ]
            }
          ]
        }
      ];

      const opps = ArbCalculator.calculateOpportunities(categories);
      expect(opps.length).toBe(1);
      expect(opps[0].type).toBe('binary');
      expect(opps[0].profitPct).toBeCloseTo(5.26, 1); // 1.00 / 0.95 - 1 = 5.26%
      expect(opps[0].liquidity).toBe(500);
    });

    test('calculates YES Negative Risk Arbitrage correctly', () => {
      const categories = [
        {
          title: 'Halftime Result',
          slug: 'halftime-result',
          markets: [
            {
              id: 1,
              title: 'Brazil',
              tradingStatus: 'OPEN',
              isNegRisk: true,
              outcomes: [
                {
                  name: 'Yes',
                  indexSet: 1,
                  bestAsk: { price: 0.4, size: 1000 },
                  bestBid: { price: 0.38, size: 1000 }
                },
                {
                  name: 'No',
                  indexSet: 2,
                  bestAsk: { price: 0.65, size: 1000 },
                  bestBid: { price: 0.63, size: 1000 }
                }
              ]
            },
            {
              id: 2,
              title: 'Morocco',
              tradingStatus: 'OPEN',
              isNegRisk: true,
              outcomes: [
                {
                  name: 'Yes',
                  indexSet: 1,
                  bestAsk: { price: 0.3, size: 1000 },
                  bestBid: { price: 0.28, size: 1000 }
                },
                {
                  name: 'No',
                  indexSet: 2,
                  bestAsk: { price: 0.75, size: 1000 },
                  bestBid: { price: 0.73, size: 1000 }
                }
              ]
            },
            {
              id: 3,
              title: 'Draw',
              tradingStatus: 'OPEN',
              isNegRisk: true,
              outcomes: [
                {
                  name: 'Yes',
                  indexSet: 1,
                  bestAsk: { price: 0.25, size: 1000 },
                  bestBid: { price: 0.23, size: 1000 }
                },
                {
                  name: 'No',
                  indexSet: 2,
                  bestAsk: { price: 0.8, size: 1000 },
                  bestBid: { price: 0.78, size: 1000 }
                }
              ]
            }
          ]
        }
      ];

      const opps = ArbCalculator.calculateOpportunities(categories);
      const yesOpps = opps.filter((o) => o.type === 'yes_neg_risk');
      expect(yesOpps.length).toBe(1);
      expect(yesOpps[0].profitPct).toBeCloseTo(5.26, 1); // 1.00 / (0.40 + 0.30 + 0.25) - 1 = 5.26%
      expect(yesOpps[0].liquidity).toBe(1000);
    });

    test('calculates NO Negative Risk Arbitrage correctly', () => {
      const categories = [
        {
          title: 'Halftime Result',
          slug: 'halftime-result',
          markets: [
            {
              id: 1,
              title: 'Brazil',
              tradingStatus: 'OPEN',
              isNegRisk: true,
              outcomes: [
                {
                  name: 'Yes',
                  indexSet: 1,
                  bestAsk: { price: 0.45, size: 800 },
                  bestBid: { price: 0.43, size: 800 }
                },
                {
                  name: 'No',
                  indexSet: 2,
                  bestAsk: { price: 0.6, size: 800 },
                  bestBid: { price: 0.58, size: 800 }
                }
              ]
            },
            {
              id: 2,
              title: 'Morocco',
              tradingStatus: 'OPEN',
              isNegRisk: true,
              outcomes: [
                {
                  name: 'Yes',
                  indexSet: 1,
                  bestAsk: { price: 0.35, size: 800 },
                  bestBid: { price: 0.33, size: 800 }
                },
                {
                  name: 'No',
                  indexSet: 2,
                  bestAsk: { price: 0.65, size: 800 },
                  bestBid: { price: 0.63, size: 800 }
                }
              ]
            },
            {
              id: 3,
              title: 'Draw',
              tradingStatus: 'OPEN',
              isNegRisk: true,
              outcomes: [
                {
                  name: 'Yes',
                  indexSet: 1,
                  bestAsk: { price: 0.25, size: 800 },
                  bestBid: { price: 0.23, size: 800 }
                },
                {
                  name: 'No',
                  indexSet: 2,
                  bestAsk: { price: 0.7, size: 800 },
                  bestBid: { price: 0.68, size: 800 }
                }
              ]
            }
          ]
        }
      ];

      const opps = ArbCalculator.calculateOpportunities(categories);
      const noOpps = opps.filter((o) => o.type === 'no_neg_risk');
      expect(noOpps.length).toBe(1);
      // Cost: 0.60 + 0.65 + 0.70 = 1.95. Payout: N - 1 = 2.00. Profit %: 2.00 / 1.95 - 1 = 2.56%
      expect(noOpps[0].profitPct).toBeCloseTo(2.56, 1);
      expect(noOpps[0].liquidity).toBe(800);
    });
  });
});
