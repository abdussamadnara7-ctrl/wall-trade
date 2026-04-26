const https = require('https');

// ── PSX FUNDAMENTALS — WallTrade Master Datasets (2025/2026) ──────
// Banking:    WallTrade Master Banking Dataset 2025
// Oil/Energy: WallTrade Master Oil & Energy Dataset 2025
// Fertilizer: WallTrade Master Fertilizer Dataset 2026
// Cement:     WallTrade Master Cement Dataset 2026
const PSX_FUNDAMENTALS = {

  // ── OIL & GAS EXPLORATION ──────────────────────────────────
  OGDC: {
    eps:'16.98', grossMargin:'53.6%', netMargin:'37.9%',
    revenue:'PKR 192.8B', netProfit:'PKR 73.0B',
    totalAssets:'PKR 1.69T', tradeDebts:'PKR 583.8B',
    dividend:'PKR 4.25/share',
    aiSummary:'Large-cap state-backed upstream energy giant with strong dividend and reserve profile.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  PPL: {
    eps:'14.84', grossMargin:'59%', netMargin:'34%',
    revenue:'PKR 118.0B', netProfit:'PKR 40.4B',
    totalAssets:'PKR 976.2B', tradeDebts:'PKR 599.9B',
    dividend:'PKR 2/share',
    aiSummary:'Exploration-focused E&P company with reserve discovery upside and strong margins.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  MARI: {
    eps:'41.32', netMargin:'35.9%', roe:'17.4%',
    revenue:'PKR 138.3B', netProfit:'PKR 49.6B',
    totalAssets:'PKR 452.2B', totalCash:'PKR 24B',
    explorationSpend:'PKR 8.95B',
    aiSummary:'Growth-oriented upstream energy stock driven by exploration and operational expansion.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    grossMargin:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  // ── OIL MARKETING COMPANIES ────────────────────────────────
  PSO: {
    eps:'25.82', grossMargin:'3.1%', netMargin:'0.8%',
    revenue:'PKR 1,499B', netProfit:'PKR 12.1B',
    totalAssets:'PKR 998.8B', tradeDebts:'PKR 412.1B',
    jetFuelMarketShare:'99.2%',
    aiSummary:"Pakistan's dominant downstream fuel distribution company and fuel-demand proxy.",
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  APL: {
    eps:'51.60', netMargin:'2.7%', roe:'9.5%',
    revenue:'PKR 240.6B', netProfit:'PKR 6.42B',
    inventory:'PKR 37B', tradePayables:'PKR 43B',
    retailOutlets:'798',
    aiSummary:'Low-margin fuel distribution business focused on operational efficiency and retail expansion.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    grossMargin:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  HASCOL: {
    eps:'-6.71', ebitda:'PKR 2.36B',
    netProfit:'PKR -6.70B', grossProfit:'PKR 3.58B',
    financeCost:'PKR 6.78B', fuelVolumes:'541,840 MT',
    vitolOwnership:'40.21%',
    aiSummary:'High-risk turnaround and restructuring story backed by Vitol and debt restructuring.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', revenue:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A', totalAssets:'N/A',
  },

  // ── BANKING ────────────────────────────────────────────────
  HBL: {
    pe:'4.8', pb:'1.0', eps:'45.5', divYield:'9.1%',
    roe:'14.9%', nplRatio:'4.6%',
    netProfit:'PKR 66.8B', deposits:'PKR 5.5T',
    totalAssets:'PKR 7.7T',
    aiSummary:'Large-cap dividend and value banking play with strong deposit franchise.',
    fwdPe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    revenue:'N/A', casaRatio:'N/A', carRatio:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  MCB: {
    pe:'8.3', pb:'1.85', eps:'45.73', divYield:'9.49%',
    roe:'23.02%', casaRatio:'97.40%',
    deposits:'PKR 2.26T', marketCap:'PKR 450B',
    aiSummary:'Premium profitability-focused private bank with industry-leading efficiency.',
    fwdPe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    revenue:'N/A', netProfit:'N/A', nplRatio:'N/A',
    carRatio:'N/A', totalAssets:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  UBL: {
    eps:'51.33', revenue:'PKR 419.6B', netProfit:'PKR 128B',
    deposits:'PKR 2.7T', carRatio:'20.97%', cet1Ratio:'15.92%',
    remittanceMarketShare:'20%',
    aiSummary:'Digitally advanced banking leader with strong remittance and profitability profile.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    casaRatio:'N/A', nplRatio:'N/A', totalAssets:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  NBP: {
    eps:'40.4', netProfit:'PKR 85.9B',
    deposits:'PKR 4.4T', totalAssets:'PKR 7.1T',
    carRatio:'26.21%', cet1Ratio:'19.65%',
    casaRatio:'81%', liquidityCoverageRatio:'217%',
    aiSummary:'Government-backed banking giant with massive liquidity and sovereign strength.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    revenue:'N/A', nplRatio:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  ABL: {
    roe:'18.7%', netProfit:'PKR 35.2B',
    deposits:'PKR 2.346T', totalAssets:'PKR 3.37T',
    investments:'PKR 2.137T', carRatio:'27.74%',
    nplRatio:'1.42%', infectionRatio:'1.42%',
    digitalUsers:'2.6M+',
    aiSummary:'AI-driven banking innovator with strong capital adequacy and digital ecosystem.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A', eps:'N/A',
    roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    revenue:'N/A', casaRatio:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  BAFL: {
    aiSummary:'Mid-tier commercial bank with growing retail and SME banking presence.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A', eps:'N/A',
    roe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    revenue:'N/A', netProfit:'N/A',
    deposits:'N/A', totalAssets:'N/A',
    carRatio:'N/A', casaRatio:'N/A', nplRatio:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  // ── FERTILIZER ─────────────────────────────────────────────
  ENGROH: {
    eps:'46.20', ebitda:'PKR 98.9B',
    revenue:'PKR 598.4B', totalAssets:'PKR 1.08T',
    totalEquity:'PKR 303.1B', operatingCashflow:'PKR 285.7B',
    marketCap:'PKR 540.2B',
    keyDriver:'Deodar Telecom Towers',
    aiSummary:'Diversified infrastructure and capital allocation platform with telecom and industrial exposure.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', netProfit:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  FFC: {
    ebitda:'PKR 132.6B', revenue:'PKR 432.4B',
    dividend:'PKR 37/share', roce:'69%',
    ureaMarketShare:'43%', dapMarketShare:'62%',
    investmentIncome:'PKR 17.4B',
    keyDriver:'Distribution Network',
    aiSummary:'Dominant fertilizer cashflow compounder with nationwide agricultural distribution moat.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A', eps:'N/A',
    roe:'N/A', roa:'N/A', grossMargin:'N/A', opMargin:'N/A',
    netMargin:'N/A', ebitdaMargin:'N/A', netProfit:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  EFERT: {
    eps:'2.49', grossMargin:'31%',
    revenue:'PKR 37.8B', netProfit:'PKR 3.3B',
    debtToCapital:'55%', dividend:'PKR 2/share',
    farmersOnboarded:'1,500+',
    keyDriver:'Engro Markaz Expansion',
    aiSummary:'Growth-oriented agri-commerce and fertilizer platform focused on farmer ecosystem expansion.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', netMargin:'N/A',
    ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A',
  },

  // ── CEMENT ─────────────────────────────────────────────────
  LUCK: {
    eps:'30.45', grossMargin:'25.5%', netMargin:'18.8%',
    ebitda:'PKR 64.5B', revenue:'PKR 247.1B', netProfit:'PKR 46.4B',
    marketShare:'18.9%', cementSales:'4.86M tons',
    aiSummary:"Pakistan's largest cement company by market share with strong export exposure and premium brand.",
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A', totalAssets:'N/A',
  },

  MLCF: {
    eps:'7.44', grossMargin:'33.9%', netMargin:'13.7%',
    revenue:'PKR 57.0B', netProfit:'PKR 7.80B',
    grossProfit:'PKR 19.3B', operatingCashflow:'PKR 31.9B',
    longTermLoans:'PKR 83.5B',
    aiSummary:'Mid-size cement producer with strong gross margins but high long-term debt exposure.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A', totalAssets:'N/A',
  },

  CHCC: {
    eps:'21.16', grossMargin:'36.3%', netMargin:'20.9%',
    revenue:'PKR 19.7B', netProfit:'PKR 4.11B',
    grossProfit:'PKR 7.16B',
    domesticSalesGrowth:'+16%', financeCostReduction:'-48%',
    aiSummary:'High-margin efficient cement producer with improving cost structure and strong domestic sales growth.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A', totalAssets:'N/A',
  },

  DGKC: {
    eps:'13.36', grossMargin:'26.9%', netMargin:'14.4%',
    revenue:'PKR 40.6B', netProfit:'PKR 5.85B',
    grossProfit:'PKR 10.9B',
    capacityUtilization:'85%', expansion:'11,000 TPD new line',
    aiSummary:'Expanding cement producer with significant new capacity coming online and strong utilization.',
    pe:'N/A', fwdPe:'N/A', pb:'N/A', divYield:'N/A',
    roe:'N/A', roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A',
    ebitda:'N/A', currentRatio:'N/A', quickRatio:'N/A',
    debtToEquity:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A',
    interestCover:'N/A', totalAssets:'N/A',
  },
};

// ── SECTOR MAP ─────────────────────────────────────────────────
const SECTOR_MAP = {
  OGDC:'ENERGY_EP', PPL:'ENERGY_EP', MARI:'ENERGY_EP',
  PSO:'OMC', APL:'OMC', HASCOL:'OMC',
  HBL:'BANKING', MCB:'BANKING', UBL:'BANKING',
  NBP:'BANKING', ABL:'BANKING', BAFL:'BANKING',
  ENGROH:'FERTILISER', FFC:'FERTILISER', EFERT:'FERTILISER',
  LUCK:'CEMENT', MLCF:'CEMENT', CHCC:'CEMENT', DGKC:'CEMENT',
};

// ── SECTOR-SPECIFIC PROMPT BUILDERS ────────────────────────────
function buildSectorDataBlock(ticker, s) {
  const sector = SECTOR_MAP[ticker] || 'GENERAL';

  if (sector === 'BANKING') {
    return `SECTOR: Banking (PSX)
KEY METRICS:
• P/B: ${s.pb ?? 'N/A'} | P/E: ${s.pe ?? 'N/A'} | EPS: PKR ${s.eps ?? 'N/A'}
• Dividend Yield: ${s.divYield ?? 'N/A'} | ROE: ${s.roe ?? 'N/A'}
• NPL Ratio: ${s.nplRatio ?? 'N/A'} | CASA Ratio: ${s.casaRatio ?? 'N/A'}
• CAR Ratio: ${s.carRatio ?? 'N/A'} | CET1: ${s.cet1Ratio ?? 'N/A'}
• Net Profit: ${s.netProfit ?? 'N/A'} | Deposits: ${s.deposits ?? 'N/A'}
• Total Assets: ${s.totalAssets ?? 'N/A'}
${s.digitalUsers ? `• Digital Users: ${s.digitalUsers}` : ''}
${s.remittanceMarketShare ? `• Remittance Market Share: ${s.remittanceMarketShare}` : ''}
${s.infectionRatio ? `• Infection Ratio: ${s.infectionRatio}` : ''}
${s.liquidityCoverageRatio ? `• Liquidity Coverage Ratio: ${s.liquidityCoverageRatio}` : ''}
SECTOR RULES: P/B is primary valuation metric. High D/E is NORMAL for banks — never flag it. CASA >80% = strong deposit franchise. NPL <5% = healthy asset quality. Rate cuts compress NIMs short-term but stimulate credit growth.`;
  }

  if (sector === 'ENERGY_EP') {
    return `SECTOR: Oil & Gas Exploration & Production (PSX)
KEY METRICS:
• EPS: PKR ${s.eps ?? 'N/A'} | Gross Margin: ${s.grossMargin ?? 'N/A'} | Net Margin: ${s.netMargin ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
• Total Assets: ${s.totalAssets ?? 'N/A'} | Cash: ${s.totalCash ?? 'N/A'}
• Trade Debts (Circular Debt Exposure): ${s.tradeDebts ?? 'N/A'}
• Dividend: ${s.dividend ?? 'N/A'} | ROE: ${s.roe ?? 'N/A'}
${s.explorationSpend ? `• Exploration Spend: ${s.explorationSpend}` : ''}
SECTOR RULES: Revenue is USD-linked → PKR weakness BOOSTS rupee earnings. Brent crude price is #1 earnings driver. Trade debts represent circular debt exposure — cash flow ≠ reported profit. High gross margins (>50%) are normal for E&P. Dividend sustainability is key investment case.`;
  }

  if (sector === 'OMC') {
    return `SECTOR: Oil Marketing Company (PSX)
KEY METRICS:
• EPS: PKR ${s.eps ?? 'N/A'} | Net Margin: ${s.netMargin ?? 'N/A'} | Gross Margin: ${s.grossMargin ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
• Total Assets: ${s.totalAssets ?? 'N/A'}
• Trade Debts: ${s.tradeDebts ?? 'N/A'}
${s.inventory ? `• Inventory: ${s.inventory}` : ''}
${s.jetFuelMarketShare ? `• Jet Fuel Market Share: ${s.jetFuelMarketShare}` : ''}
${s.retailOutlets ? `• Retail Outlets: ${s.retailOutlets}` : ''}
${s.vitolOwnership ? `• Vitol Ownership: ${s.vitolOwnership}` : ''}
${s.financeCost ? `• Finance Cost: ${s.financeCost}` : ''}
${s.fuelVolumes ? `• Fuel Volumes: ${s.fuelVolumes}` : ''}
SECTOR RULES: Net margins of 1-3% are NORMAL for OMCs — not a red flag. PKR weakness is NEGATIVE (imports in USD, revenues in PKR). Inventory gains/losses are a major quarterly swing factor. PSO carries significant GoP receivables risk. HASCOL is a turnaround story — treat differently from APL/PSO.`;
  }

  if (sector === 'FERTILISER') {
    return `SECTOR: Fertilizer (PSX)
KEY METRICS:
• EPS: PKR ${s.eps ?? 'N/A'} | Gross Margin: ${s.grossMargin ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
• EBITDA: ${s.ebitda ?? 'N/A'} | Market Cap: ${s.marketCap ?? 'N/A'}
${s.dividend ? `• Dividend: ${s.dividend}` : ''}
${s.roce ? `• ROCE: ${s.roce}` : ''}
${s.ureaMarketShare ? `• Urea Market Share: ${s.ureaMarketShare}` : ''}
${s.dapMarketShare ? `• DAP Market Share: ${s.dapMarketShare}` : ''}
${s.investmentIncome ? `• Investment Income: ${s.investmentIncome}` : ''}
${s.operatingCashflow ? `• Operating Cashflow: ${s.operatingCashflow}` : ''}
${s.totalAssets ? `• Total Assets: ${s.totalAssets}` : ''}
${s.totalEquity ? `• Total Equity: ${s.totalEquity}` : ''}
${s.debtToCapital ? `• Debt to Capital: ${s.debtToCapital}` : ''}
${s.farmersOnboarded ? `• Farmers Onboarded: ${s.farmersOnboarded}` : ''}
${s.keyDriver ? `• Key Driver: ${s.keyDriver}` : ''}
SECTOR RULES: Dividend yield is THE primary investment case for FFC/EFERT. Gas feedstock cost is the core margin variable. ENGROH is a holding company — use sum-of-parts logic, not standalone P&L. FFC is a cashflow compounder; EFERT is growth-oriented. Seasonal demand: rabi (Oct-Dec) and kharif (Feb-Apr).`;
  }

  if (sector === 'CEMENT') {
    return `SECTOR: Cement (PSX)
KEY METRICS:
• EPS: PKR ${s.eps ?? 'N/A'} | Gross Margin: ${s.grossMargin ?? 'N/A'} | Net Margin: ${s.netMargin ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
• EBITDA: ${s.ebitda ?? 'N/A'}
${s.marketShare ? `• Market Share: ${s.marketShare}` : ''}
${s.cementSales ? `• Cement Sales: ${s.cementSales}` : ''}
${s.capacityUtilization ? `• Capacity Utilization: ${s.capacityUtilization}` : ''}
${s.expansion ? `• Expansion: ${s.expansion}` : ''}
${s.domesticSalesGrowth ? `• Domestic Sales Growth: ${s.domesticSalesGrowth}` : ''}
${s.financeCostReduction ? `• Finance Cost Reduction: ${s.financeCostReduction}` : ''}
${s.longTermLoans ? `• Long-term Loans: ${s.longTermLoans}` : ''}
${s.operatingCashflow ? `• Operating Cashflow: ${s.operatingCashflow}` : ''}
SECTOR RULES: Coal cost (USD-denominated) is the #1 margin driver — PKR weakness HURTS margins. PSDP spending and rate cuts drive demand. Industry has overcapacity — watch retention prices. LUCK has export exposure and premium brand. MLCF has high debt. CHCC has best margins. DGKC expanding capacity.`;
  }

  // GENERAL fallback
  return `KEY METRICS:
• EPS: PKR ${s.eps ?? 'N/A'} | Net Margin: ${s.netMargin ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}`;
}

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 6000);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)', ...headers }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── FETCH LIVE PRICE FROM PSX TERMINAL ────────────────────────
async function getPSXPrice(ticker) {
  try {
    const data = await fetchJSON(
      `https://psxterminal.com/api/ticks/REG/${ticker}`,
      { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/', 'Accept': 'application/json' }
    );
    const d = data?.data ?? data;
    const price = d?.price ?? d?.last ?? d?.close;
    if (!price || isNaN(parseFloat(price))) return null;

    const open = d.open ?? price;
    let change;
    if (d.changePercent != null) {
      const raw = parseFloat(d.changePercent);
      change = Math.abs(raw) < 1.0 ? raw * 100 : raw;
    } else {
      change = open ? ((parseFloat(price) - parseFloat(open)) / parseFloat(open) * 100) : 0;
    }

    return {
      price:     parseFloat(price).toFixed(2),
      change:    change.toFixed(2),
      changeAmt: (parseFloat(price) - parseFloat(open)).toFixed(2),
      high:      d.high   ? parseFloat(d.high).toFixed(2)  : null,
      low:       d.low    ? parseFloat(d.low).toFixed(2)   : null,
      volume:    d.volume ? String(d.volume) : null,
      dir:       change >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── FMP ENRICHMENT (optional, enhances P/E P/B when available) ─
async function getFMPData(ticker) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const [metrics, ratios] = await Promise.all([
      fetchJSON(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}.KA?apikey=${key}`),
      fetchJSON(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}.KA?apikey=${key}`)
    ]);
    if (!ratios?.[0]) return null;
    const m = metrics?.[0] || {}, r = ratios[0];
    const pct = v => v != null ? (v * 100).toFixed(1) + '%' : null;
    const fmt = (v, d=2) => v != null ? Number(v).toFixed(d) : null;
    return {
      pe:           fmt(r.peRatioTTM),
      pb:           fmt(r.priceToBookRatioTTM),
      roe:          pct(r.returnOnEquityTTM),
      netMargin:    pct(r.netProfitMarginTTM),
      divYield:     pct(r.dividendYieldTTM),
      debtToEquity: fmt(r.debtEquityRatioTTM),
      eps:          fmt(r.epsTTM),
    };
  } catch(e) { return null; }
}

// ── ASSEMBLE FULL STOCK DATA ───────────────────────────────────
async function getStockData(ticker) {
  const fb = PSX_FUNDAMENTALS[ticker];
  if (!fb) return null;

  const [livePrice, fmpData] = await Promise.all([
    getPSXPrice(ticker),
    getFMPData(ticker)
  ]);

  const NAME_MAP = {
    OGDC:'Oil & Gas Dev Co Ltd', PPL:'Pakistan Petroleum Ltd',
    PSO:'Pakistan State Oil', MARI:'Mari Petroleum Co',
    APL:'Attock Petroleum Ltd', HASCOL:'Hascol Petroleum Ltd',
    HBL:'Habib Bank Ltd', MCB:'MCB Bank Ltd',
    UBL:'United Bank Ltd', NBP:'National Bank of Pakistan',
    ABL:'Allied Bank Ltd', BAFL:'Bank Al Falah Ltd',
    ENGROH:'Engro Holdings Ltd', FFC:'Fauji Fertiliser Co',
    EFERT:'Engro Fertilisers Ltd',
    LUCK:'Lucky Cement Ltd', MLCF:'Maple Leaf Cement',
    CHCC:'Cherat Cement Co', DGKC:'D.G. Khan Cement Co',
  };

  const SECTOR_LABEL = {
    ENERGY_EP: 'Oil & Gas Exploration',
    OMC: 'Oil & Gas Marketing',
    BANKING: 'Commercial Banking',
    FERTILISER: 'Fertilizer',
    CEMENT: 'Cement',
  };

  const sectorCode = SECTOR_MAP[ticker] || 'GENERAL';

  // FMP data enriches hardcoded data where available (P/E, P/B etc)
  // Hardcoded master dataset takes priority for sector-specific metrics
  const merged = { ...(fmpData || {}), ...fb };

  return {
    ticker,
    name:    NAME_MAP[ticker] || ticker,
    sector:  SECTOR_LABEL[sectorCode] || 'Pakistan Stock Exchange',
    sectorCode,
    // Live price from PSX Terminal
    price:     livePrice?.price     ?? null,
    change:    livePrice?.change    ?? null,
    changeAmt: livePrice?.changeAmt ?? null,
    high:      livePrice?.high      ?? null,
    low:       livePrice?.low       ?? null,
    volume:    livePrice?.volume    ?? null,
    dir:       livePrice?.dir       ?? 'up',
    yearHigh:  null, yearLow: null,
    dataSource: livePrice ? 'PSX Terminal' : 'fallback',
    // All fundamentals from master dataset + FMP enrichment
    ...merged,
  };
}

// ── VERDICT CACHE ──────────────────────────────────────────────
const verdictCache = {};
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function getCached(ticker) {
  const c = verdictCache[ticker];
  if (!c || Date.now() - c.timestamp > CACHE_TTL) { delete verdictCache[ticker]; return null; }
  return c.data;
}
function setCache(ticker, data) {
  verdictCache[ticker] = { data, timestamp: Date.now() };
}

// ── GENERATE AI VERDICT ────────────────────────────────────────
async function generateVerdict(stockData, macroContext) {
  const cached = getCached(stockData.ticker);
  if (cached) return { ...cached, cached: true };

  const sectorDataBlock = buildSectorDataBlock(stockData.ticker, stockData);
  const aiSummary = stockData.aiSummary || '';

  const prompt = `You are a sharp PSX equity analyst for Wall-Trade — Pakistan's AI-powered stock analysis platform for retail investors.

LIVE PRICE DATA:
Ticker: ${stockData.ticker} — ${stockData.name}
Price: PKR ${stockData.price ?? '—'} (${stockData.change ?? '—'}% today)
${stockData.high ? `Day Range: PKR ${stockData.low} – ${stockData.high}` : ''}
${stockData.volume ? `Volume: ${stockData.volume}` : ''}

${sectorDataBlock}

COMPANY SUMMARY: ${aiSummary}

MACRO CONTEXT:
${macroContext}

INSTRUCTION: Generate a sector-aware verdict using the actual financial data above. Do not be generic. Reference specific numbers. Apply sector-specific logic.

Return ONLY this JSON (no markdown):
{
  "verdict": "Positive" or "Neutral" or "Caution",
  "score": <1-10>,
  "headline": "<sharp one-liner max 12 words using actual data>",
  "body": "<120-150 words. Lead with verdict. Cover 2-3 strongest data points. One key risk. Connect to Pakistan macro. Mobile-friendly short paragraphs. No buy/sell advice.>",
  "insights": [
    {"icon":"<emoji>","value":"<actual metric from data>","label":"<plain English max 12 words>","color":"green|amber|red|purple"},
    {"icon":"<emoji>","value":"<actual metric from data>","label":"<plain English max 12 words>","color":"green|amber|red|purple"},
    {"icon":"<emoji>","value":"<actual metric from data>","label":"<plain English max 12 words>","color":"green|amber|red|purple"}
  ],
  "signals": [
    {"label":"<2-3 word signal>","type":"green|amber|red|purple"},
    {"label":"<2-3 word signal>","type":"green|amber|red|purple"},
    {"label":"<2-3 word signal>","type":"green|amber|red|purple"}
  ],
  "scores": {
    "Financial health": <1-10>,
    "Macro environment": <1-10>,
    "Growth outlook": <1-10>,
    "Risk level": <1-10>
  },
  "factors": [
    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences using actual numbers from the data>"},
    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences using actual numbers from the data>"},
    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences using actual numbers from the data>"}
  ],
  "summary": "<one sentence overall summary>"
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a senior PSX equity analyst. You generate accurate, sector-specific, data-driven analysis for Pakistani retail investors. Always use the exact figures provided. Never be generic. Apply sector-specific logic strictly — banking metrics differ from E&P differ from cement. Be direct and specific.`,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const verdict = JSON.parse(raw);
    setCache(stockData.ticker, verdict);
    return verdict;
  } catch(e) {
    console.error('AI error:', e.message);
    return null;
  }
}

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { ticker, macroContext } = payload;

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const stockData = await getStockData(cleanTicker);
  if (!stockData) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `No data found for ${cleanTicker}. Supported tickers: OGDC, PPL, MARI, PSO, APL, HASCOL, HBL, MCB, UBL, NBP, ABL, BAFL, ENGROH, FFC, EFERT, LUCK, MLCF, CHCC, DGKC` })
    };
  }

  const verdict = await generateVerdict(stockData, macroContext || '');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      stockData,
      verdict,
      timestamp: new Date().toISOString()
    })
  };
};
