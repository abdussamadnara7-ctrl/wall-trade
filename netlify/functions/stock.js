const https = require('https');

// ── PSX FUNDAMENTALS — Q3 FY26 (9M ending March 2026) ────────
// Source: Quarterly reports compiled May 2026
// All figures 9M FY26 unless noted. Revenue/profit in PKR billions.
// P/E, P/B, divYield are calculated live in calculateLiveRatios()
const PSX_FUNDAMENTALS = {

  OGDC: {
    eps:'26.80', dps:'11.00', netMargin:'38.4%', roe:'8.2%',
    grossMargin:'N/A', revenue:'PKR 300B', netProfit:'PKR 115B',
    totalAssets:'N/A', tradeDebts:'PKR 530B+', totalCash:'PKR 202B',
    dividend:'PKR 11/share (FYTD)',
    aiSummary:'Pakistan largest E&P with PKR 115B profit in 9M FY26. Circular debt >PKR 530B is key cash risk — OCF only PKR 15.85B vs capex PKR 46.4B. 8 new discoveries 119 MMBOE. Reko Diq USD 715M is 10-year catalyst. Production curtailment cost PKR 53.6B. Net margin 38.4%.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
  },

  PPL: {
    eps:'22.48', dps:'2.00', netMargin:'34.1%', roe:'8.5%',
    grossMargin:'N/A', revenue:'PKR 179B', netProfit:'PKR 61B',
    totalAssets:'N/A', tradeDebts:'N/A', totalCash:'PKR 54B',
    dividend:'PKR 2/share (interim)',
    aiSummary:'E&P with PKR 61B profit 9M FY26 — down 16% YoY from Sui/Adhi/Kirthar field decline and SNGPL gas curtailment. 11 new discoveries and Abu Dhabi Block-5 offshore provide growth runway. 49-block portfolio largest in Pakistan. Reko Diq exposure via PMPL PKR 75B. Circular debt structural headwind.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
  },

  MARI: {
    eps:'31.32', dps:'N/A', netMargin:'49.9%', roe:'N/A',
    grossMargin:'N/A', revenue:'PKR 137B', netProfit:'PKR 68B',
    totalAssets:'N/A', tradeDebts:'PKR 73B', totalCash:'N/A',
    explorationSpend:'High — 9 exploration wells, 3 discoveries',
    dividend:'N/A',
    aiSummary:'Best margins in E&P — net margin 49.9% (PKR 68.5B / PKR 137.3B). EPS PKR 31.32 highest in sector. Primary gas supplier to fertilizer sector. 23 offshore blocks awarded — transformational catalyst. Data center business adds diversification. Circular debt PKR 73B manageable. Cost efficiency + low-cost gas fields = structural advantage.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
  },

  PSO: {
    eps:'81.19', dps:'N/A', netMargin:'1.7%', roe:'N/A',
    grossMargin:'3.1%', revenue:'PKR 2,241B', netProfit:'PKR 38B',
    totalAssets:'N/A', tradeDebts:'PKR 455B',
    currentRatio:'1.27', debtToEquity:'3.0',
    jetFuelMarketShare:'99.2%', retailOutlets:'N/A',
    dividend:'N/A',
    aiSummary:'Dominant OMC — PKR 2.2T revenue, white oil 42.6%, diesel 42.4% market share. Net margin 1.7% is structurally normal for OMC. PKR 455B receivables = critical circular debt risk — cash flow severely lags profits. D/E 3.0x normal for working capital financing. EPS 81.19 looks cheap but earnings reverse sharply if oil falls or inventory loses value.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    quickRatio:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
  },

  APL: {
    eps:'118.67', dps:'N/A', netMargin:'4.0%', roe:'9.5%',
    grossMargin:'N/A', revenue:'PKR 370B', netProfit:'PKR 15B',
    totalAssets:'N/A', tradeDebts:'PKR 9B',
    currentRatio:'1.9', debtToEquity:'1.0',
    inventory:'PKR 50B', retailOutlets:'811',
    dividend:'N/A',
    aiSummary:'More efficient OMC vs PSO — margin 4.0% vs 1.7%. Profit up 92% YoY to PKR 14.76B from inventory gains. Current ratio 1.9x strong. Receivables only PKR 9.2B vs PSO PKR 455B — far lower circular debt exposure. 811 outlets growing. LPG diversification and EV/solar positioning. EPS 118.67 elevated by oil price spike — sustainability watch needed.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    quickRatio:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
  },

  HASCOL: {
    eps:'0.45', dps:'N/A', netMargin:'0.9%', roe:'N/A',
    grossMargin:'N/A', revenue:'PKR 48B', netProfit:'PKR 0.5B',
    totalAssets:'N/A', tradeDebts:'N/A',
    currentRatio:'0.22', debtToEquity:'N/A',
    financeCost:'PKR 1.68B/quarter', fuelVolumes:'663 sites',
    vitolOwnership:'40.21%',
    dividend:'N/A',
    aiSummary:'HIGH RISK turnaround — NOT normal valuation. Equity NEGATIVE -PKR 92.7B (technically insolvent). Current ratio 0.22x — cannot meet short-term obligations. Going concern risk EXPLICITLY flagged. BUT: first quarterly profit in years (PKR 0.45B vs -3.09B loss). Gross profit up 429% YoY. Vitol 40.21% provides strategic backing. Bet on restructuring success — multi-bagger if works, equity destruction if fails.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    quickRatio:'N/A', totalCash:'N/A', totalDebt:'N/A',
    fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
  },

  HBL: {
    eps:'44', dps:'20.00', netMargin:'N/A', roe:'14.5%', roa:'0.8%',
    grossMargin:'N/A', revenue:'N/A', netProfit:'PKR 16.1B',
    deposits:'PKR 5.4T', totalAssets:'PKR 8.1T',
    casaRatio:'38.7%', carRatio:'16.7%', cet1Ratio:'13.8%',
    nplRatio:'N/A',
    dividend:'PKR 20/share',
    aiSummary:"Second-largest bank — PKR 5.4T deposits, PKR 8.1T assets. Q1 2026 profit PKR 16.1B — down 3% YoY from higher provisioning (4.3B vs 2.7B). CASA 38.7% improving. Digital 5.2M+ users, cards = 50% of fee income. CAR 16.7% strong. Rate hike: near-term NIM pressure but investment book repricing positive over 3-6 months. Coverage >100%.",
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  MCB: {
    eps:'43', dps:'36.00', netMargin:'N/A', roe:'20.9%', roa:'1.57%',
    grossMargin:'N/A', revenue:'N/A', netProfit:'PKR 12.8B',
    deposits:'PKR 2.3T', totalAssets:'PKR 3.26T',
    casaRatio:'56%', carRatio:'18.7%', cet1Ratio:'14.87%',
    nplRatio:'6.29%',
    dividend:'PKR 36/share',
    aiSummary:'Highest-quality large bank — ROE 20.9% best-in-class. CASA 56% gives exceptional low-cost funding vs all peers. Q1 2026 profit PKR 12.8B — NII +9%, fee income +13%. CAR 18.7% strong. NPL infection 6.29% with coverage 94.5% (slightly below 100% — watch point). Premium P/B justified by quality. NII growth and cost discipline (CIR 39.6%) are key strengths.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  UBL: {
    eps:'78', dps:'44.00', netMargin:'N/A', roe:'N/A', roa:'1.5%',
    grossMargin:'N/A', revenue:'N/A', netProfit:'PKR 49B',
    deposits:'PKR 5.39T', totalAssets:'PKR 12.7T',
    casaRatio:'N/A', carRatio:'16.35%', cet1Ratio:'15.35%',
    nplRatio:'N/A', investments:'PKR 9.9T',
    dividend:'PKR 44/share',
    aiSummary:'Exceptional Q1 2026 profit PKR 48.97B (+35% YoY) but PKR 30.5B came from capital gains — not core banking. EPS ~78 annualised makes it cheap on P/E. CRITICAL: equity collapsed PKR 499B → PKR 416B from PKR 62.8B OCI losses. CAR fell 20.97% → 16.35%. Largest bank by assets (PKR 12.7T) with PKR 9.9T investment book — extremely rate-sensitive. Borrowings 6.6T — high leverage.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  NBP: {
    eps:'31', dps:'3.50', netMargin:'N/A', roe:'15.5%', roa:'0.9%',
    grossMargin:'N/A', revenue:'N/A', netProfit:'PKR 16.7B',
    deposits:'PKR 4.11T', totalAssets:'PKR 7.18T',
    casaRatio:'81.5%', carRatio:'21.57%', cet1Ratio:'16.74%',
    nplRatio:'N/A', investments:'PKR 5.16T',
    bvps:'205.3', liquidityCoverageRatio:'199%',
    dividend:'PKR 3.50/share (Q1 interim)',
    aiSummary:'Sovereign/bond bank — PKR 5.16T govt securities out of PKR 7.18T assets. CASA 81.5% is best in Pakistan. But earnings under pressure — Q1 2026 profit DOWN 22% YoY to PKR 16.7B as NIM compressed 4.2% → 2.9%. Equity eroded PKR 531B → PKR 432B from OCI losses. BVPS PKR 205.3. CAR 21.57% very strong. LCR 199%. Government backing provides systemic safety.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  ABL: {
    eps:'29', dps:'4.00', netMargin:'N/A', roe:'16.7%', roa:'0.9%',
    grossMargin:'N/A', revenue:'N/A', netProfit:'PKR 8.3B',
    deposits:'PKR 2.37T', totalAssets:'PKR 3.68T',
    casaRatio:'N/A', carRatio:'23.83%', cet1Ratio:'N/A',
    nplRatio:'1.72%', infectionRatio:'1.72%', investments:'PKR 2.5T',
    dividend:'PKR 4/share (consistent)',
    aiSummary:'Defensive quality banking pick. NPL infection 1.72% with 105% coverage = cleanest loan book among large banks. CAR 23.83% = strongest capital ratio in peer group. ROE 16.7% solid and consistent. Advances declined 11% — conservative credit stance. OCI loss PKR 22.3B from bond revaluation is key structural risk. Investment-heavy (PKR 2.5T) makes it rate-sensitive. NII +9%, fee income +14%, dividend income +43%.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  BAFL: {
    eps:'14', dps:'N/A', netMargin:'N/A', roe:'28.7%', roa:'1.4%',
    grossMargin:'N/A', revenue:'N/A', netProfit:'PKR 11.1B',
    deposits:'PKR 2.47T', totalAssets:'PKR 3.03T',
    casaRatio:'42.4%', carRatio:'16.22%', cet1Ratio:'N/A',
    nplRatio:'N/A', investments:'PKR 1.32T',
    dividend:'N/A',
    aiSummary:'High-growth banking pick — ROE 28.7% top-tier, EPS grew 58% YoY in Q1 2026. BUT earnings quality concern: non-interest income doubled to PKR 18.8B driven by PKR 10.8B trading gains — partly non-recurring. Balanced loan (PKR 1.03T) + investment (PKR 1.32T) mix healthier than pure bond banks. CASA 42.4% solid. OCI loss PKR 13.3B watch point. Growth + market-sensitive positioning — not defensive.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  ENGROH: {
    eps:'8.5', dps:'N/A', netMargin:'12%', roe:'20%',
    grossMargin:'N/A', debtToEquity:'0.9',
    revenue:'PKR 132B', netProfit:'PKR 17B',
    totalAssets:'PKR 1.1T', totalEquity:'PKR 303B',
    keyDriver:'EFERT stake + Deodar tower business',
    dividend:'N/A',
    aiSummary:'Diversified conglomerate — primary value is EFERT (fertilizer) stake. ROE ~20%, net margin 12% on PKR 132B revenue. D/E 0.9x manageable. Tower business adds infrastructure revenue beyond fertilizer cycles. Conglomerates trade 20-30% discount to underlying NAV. Low dividend payout — growth/capital allocation story not income. EFERT fundamental health drives ENGROH valuation.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  FFC: {
    eps:'12.14', dps:'8.50', netMargin:'18.4%', roe:'47%',
    grossMargin:'N/A', debtToEquity:'0.4',
    revenue:'PKR 95B', netProfit:'PKR 17.5B',
    totalAssets:'PKR 438B', ureaMarketShare:'58%', dapMarketShare:'63%',
    investmentIncome:'PKR 10.6B',
    dividend:'PKR 8.50/share (Q1 interim)',
    aiSummary:'Highest-quality dividend stock on PSX — 58% urea and 63% DAP market share (near-monopoly). Q1 2026 revenue up 48% to PKR 95B. Annualised ROE ~47% — exceptional. Net margin 18.4%. D/E only 0.4x — very conservative. Revenue boosted by PKR 10.6B other income (PKR 6.8B dividends). Key risk: planned PKR 65B PIA investment = major capital allocation concern. Dividend yield is primary investment case.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  EFERT: {
    eps:'2.49', dps:'2.00', netMargin:'8.8%', roe:'30%',
    grossMargin:'31%', debtToEquity:'0.85',
    revenue:'PKR 37.8B', netProfit:'PKR 3.3B', totalAssets:'PKR 205B',
    dividend:'PKR 2/share (Q1)',
    aiSummary:'High-dividend fertilizer with ROE annualised ~30%. EPS 2.49 with PKR 2/share dividend — payout culture is core investment case. Urea sales 601 KT vs 592 KT — stable demand. Market share ~27%. Global urea $400 → $800/ton but local prices regulated. D/E 0.85x manageable. Risks: gas input costs and government subsidy policy dependency. FFC = safety, EFERT = dividend + slightly more risk.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  LUCK: {
    eps:'25.07', dps:'N/A', netMargin:'44%', grossMargin:'26.5%',
    roe:'14%', debtToEquity:'0.4',
    revenue:'PKR 143B', netProfit:'PKR 64B', totalAssets:'PKR 796B',
    marketShare:'18.9%', cementSales:'Domestic +10.6%, Exports -9.7%',
    dividend:'N/A',
    aiSummary:"Largest cement company (18.9% market share). 9M FY26 EPS PKR 25.07 — up 34% YoY. Gross margin 26.5% improved from 24%. Net profit PKR 63.7B inflated by non-operational income — core gross margin is reliable gauge. D/E 0.4x — strong financial flexibility. Local volumes +10.6%, exports -9.7%. Chemicals/polyester segments -25-87%. Iraq/Congo expansion = 5-year growth catalyst. Diversification adds stability vs pure cement players.",
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  MLCF: {
    eps:'5.81', dps:'N/A', netMargin:'11.6%', grossMargin:'30.5%',
    roe:'8.2%', debtToEquity:'1.2',
    revenue:'PKR 52B', netProfit:'PKR 6B', totalAssets:'PKR 201B',
    longTermLoans:'PKR 83.5B', operatingCashflow:'PKR 31.9B',
    dividend:'N/A',
    aiSummary:'Serious earnings problem — 9M FY26 EPS PKR 5.81 down 50% YoY despite domestic volumes +21.8%. Pioneer Cement acquisition (77%) drove massive debt increase — D/E 1.2x is highest in sector. Finance cost rising sharply = profit destruction despite volume growth. Export collapse 54.9%. Gross margin 30.5% decent but net margin fell 23% → 11.6%. Domestic demand recovery insufficient to offset financial leverage stress.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  CHCC: {
    eps:'28.40', dps:'N/A', netMargin:'20%', grossMargin:'34.8%',
    roe:'14.7%', debtToEquity:'0.1',
    revenue:'PKR 27.5B', netProfit:'PKR 5.5B', totalAssets:'PKR 53.5B',
    financeCostReduction:'-45%', domesticSalesGrowth:'+12%',
    dividend:'N/A',
    aiSummary:'Highest-quality cement pick. D/E only 0.1x = massive advantage over MLCF (1.2x). Gross margin 34.8% = best in sector. Net margin 20% top-tier. Finance cost fell 45% from debt repayment. EPS PKR 28.40 — down 19% YoY but prior year had PKR 721M one-off tax credit so adjusted decline is smaller. Exports -36% (Afghanistan) is sector-wide. Solar + grid shift protect long-term margins. LOW RISK + STRONG MARGINS cement play.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
  },

  DGKC: {
    eps:'19.07', dps:'N/A', netMargin:'13.8%', grossMargin:'26.7%',
    roe:'7.6%', debtToEquity:'0.25',
    revenue:'PKR 60.5B', netProfit:'PKR 8.35B', totalAssets:'PKR 159B',
    capacityUtilization:'High', expansion:'11,000 TPD new production line',
    dividend:'N/A',
    aiSummary:'Strong earnings recovery — EPS up 50% YoY to PKR 19.07. Revenue 60.5B, OCF ~12.9B healthy. BUT ROE only 7-8% despite profit growth = capital inefficiency. D/E 0.25x manageable. New 11,000 TPD line adds future volumes. Other income (PKR 3.3B+) boosting earnings — quality adjustment needed. Finance cost still significant. High operating expenses drag efficiency vs CHCC. Large player with recovery underway but profitability metrics lag peers.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    roa:'N/A', opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A',
    totalCash:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', revenueGrowth:'N/A', earningsGrowth:'N/A',
    marketCap:'N/A', ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A',
    ps:'N/A', interestCover:'N/A',
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
• P/B: ${s.pb ?? 'N/A'} | P/E: ${s.pe ?? 'N/A'} | EPS: PKR ${s.eps ?? 'N/A'} (annualised)
• Div Yield: ${s.divYield ?? 'N/A'} | DPS: PKR ${s.dps ?? 'N/A'}
• ROE: ${s.roe ?? 'N/A'} | ROA: ${s.roa ?? 'N/A'}
• CASA: ${s.casaRatio ?? 'N/A'} | CAR: ${s.carRatio ?? 'N/A'} | CET1: ${s.cet1Ratio ?? 'N/A'}
• NPL/Infection Ratio: ${s.nplRatio ?? s.infectionRatio ?? 'N/A'}
• Net Profit: ${s.netProfit ?? 'N/A'} | Deposits: ${s.deposits ?? 'N/A'} | Assets: ${s.totalAssets ?? 'N/A'}
${s.investments ? `• Investment Book: ${s.investments}` : ''}
${s.liquidityCoverageRatio ? `• LCR: ${s.liquidityCoverageRatio}` : ''}
SECTOR RULES: P/B is primary valuation metric. High D/E is NORMAL for banks — NEVER flag it. CASA >50% = strong low-cost funding. CAR >18% = well-capitalised. SBP rate hike +100bps Apr 2026: near-term NIM pressure, medium-term investment book repricing positive. OCI losses are paper losses from bond revaluation — watch actual equity book value.`;
  }

  if (sector === 'ENERGY_EP') {
    return `SECTOR: Oil & Gas E&P (PSX)
KEY METRICS:
• P/E: ${s.pe ?? 'N/A'} | EPS: PKR ${s.eps ?? 'N/A'} (9M FY26)
• Div Yield: ${s.divYield ?? 'N/A'} | DPS: PKR ${s.dps ?? 'N/A'}
• Net Margin: ${s.netMargin ?? 'N/A'} | ROE: ${s.roe ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
• Circular Debt Exposure: ${s.tradeDebts ?? 'N/A'} | Cash: ${s.totalCash ?? 'N/A'}
SECTOR RULES: Revenue USD-linked — PKR weakness BOOSTS PKR earnings. Brent crude = #1 earnings driver. Circular debt means cash flow severely lags reported profit. Net margins 35-50% are NORMAL for E&P — not exceptional. Gas curtailment from RLNG oversupply is sector-wide risk.`;
  }

  if (sector === 'OMC') {
    return `SECTOR: Oil Marketing (PSX)
KEY METRICS:
• P/E: ${s.pe ?? 'N/A'} | EPS: PKR ${s.eps ?? 'N/A'} (9M FY26)
• Net Margin: ${s.netMargin ?? 'N/A'} | Revenue: ${s.revenue ?? 'N/A'}
• Current Ratio: ${s.currentRatio ?? 'N/A'} | Debt/Equity: ${s.debtToEquity ?? 'N/A'}
• Receivables: ${s.tradeDebts ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
${s.vitolOwnership ? `• Vitol Ownership: ${s.vitolOwnership}` : ''}
${s.currentRatio === '0.22' ? '⚠️ CRITICAL: Current ratio 0.22x — GOING CONCERN risk flagged in accounts' : ''}
SECTOR RULES: Net margins 1-3% NORMAL — not a red flag. D/E 2-3x NORMAL for OMC working capital. Inventory gains = major quarterly swing. PKR weakness HURTS OMCs (USD imports, PKR revenue). HASCOL = special turnaround situation, not normal business.`;
  }

  if (sector === 'FERTILISER') {
    return `SECTOR: Fertilizer (PSX)
KEY METRICS:
• P/E: ${s.pe ?? 'N/A'} | EPS: PKR ${s.eps ?? 'N/A'}
• Div Yield: ${s.divYield ?? 'N/A'} | DPS: PKR ${s.dps ?? 'N/A'}
• Net Margin: ${s.netMargin ?? 'N/A'} | ROE: ${s.roe ?? 'N/A'}
• Gross Margin: ${s.grossMargin ?? 'N/A'} | D/E: ${s.debtToEquity ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
${s.ureaMarketShare ? `• Urea Market Share: ${s.ureaMarketShare}` : ''}
${s.dapMarketShare ? `• DAP Market Share: ${s.dapMarketShare}` : ''}
${s.investmentIncome ? `• Other/Investment Income: ${s.investmentIncome}` : ''}
SECTOR RULES: Dividend yield = PRIMARY investment case for FFC/EFERT. Gas feedstock = core margin variable. ENGROH is a holding company — value from EFERT stake, not standalone P&L. FFC = market dominance + dividend. EFERT = growth + dividend. Seasonal urea demand: Kharif/Rabi crop cycles.`;
  }

  if (sector === 'CEMENT') {
    return `SECTOR: Cement (PSX)
KEY METRICS:
• P/E: ${s.pe ?? 'N/A'} | EPS: PKR ${s.eps ?? 'N/A'} (9M FY26)
• Gross Margin: ${s.grossMargin ?? 'N/A'} | Net Margin: ${s.netMargin ?? 'N/A'}
• ROE: ${s.roe ?? 'N/A'} | D/E: ${s.debtToEquity ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
${s.marketShare ? `• Market Share: ${s.marketShare}` : ''}
${s.financeCostReduction ? `• Finance Cost Change: ${s.financeCostReduction}` : ''}
${s.longTermLoans ? `• Long-term Debt: ${s.longTermLoans}` : ''}
${s.expansion ? `• Expansion: ${s.expansion}` : ''}
SECTOR RULES: Coal (USD) = #1 cost driver — PKR weakness hurts margins. PSDP + rate cuts drive demand. Sector overcapacity = retention price pressure. Exports (Afghanistan) weak across all. LUCK = giant diversified. MLCF = high debt risk. CHCC = quality low-debt. DGKC = recovery but weak ROE.`;
  }

  return `KEY METRICS:
• EPS: PKR ${s.eps ?? 'N/A'} | Net Margin: ${s.netMargin ?? 'N/A'}
• Revenue: ${s.revenue ?? 'N/A'} | Net Profit: ${s.netProfit ?? 'N/A'}
• ROE: ${s.roe ?? 'N/A'} | D/E: ${s.debtToEquity ?? 'N/A'}`;
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

// ── FETCH LIVE PRICE FROM PSX PROXY ───────────────────────────
async function getPSXPrice(ticker) {
  try {
    const data = await fetchJSON(`http://188.166.245.128:3000/timeseries/int/${ticker}`);
    if (!data?.data?.length) return null;
    const latest = data.data[0];
    const price = parseFloat(latest[1]);
    if (!price || price <= 0) return null;
    const oldest = data.data[data.data.length - 1];
    const openPrice = parseFloat(oldest[1]);
    const changeAmt = price - openPrice;
    const changePct = openPrice > 0 ? (changeAmt / openPrice) * 100 : 0;
    return {
      price:     price.toFixed(2),
      change:    changePct.toFixed(2),
      changeAmt: changeAmt.toFixed(2),
      dir:       changePct >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── CALCULATE LIVE P/E, P/B, DIV YIELD FROM LIVE PRICE ────────
function calculateLiveRatios(ticker, livePrice) {
  const RATIO_INPUTS = {
    OGDC:   { eps: 26.80, dps: 11.00, shares: 4300   },
    PPL:    { eps: 22.48, dps: 2.00,  shares: 2722   },
    MARI:   { eps: 31.32, dps: null,  shares: 1200   },
    PSO:    { eps: 81.19, dps: null,  shares: 469    },
    APL:    { eps: 118.67,dps: null,  shares: 124    },
    HASCOL: { eps: 0.45,  dps: null,  shares: 998    },
    HBL:    { eps: 44,    dps: 20.00, bvps: 310.4,   shares: 1466.9 },
    MCB:    { eps: 43,    dps: 36.00, bvps: 249.5,   shares: 1185   },
    UBL:    { eps: 78,    dps: 44.00, bvps: 166.1,   shares: 2504.2 },
    NBP:    { eps: 31,    dps: 3.50,  bvps: 205.3,   shares: 2127.5 },
    ABL:    { eps: 29,    dps: 4.00,  bvps: null,    shares: 1169   },
    BAFL:   { eps: 14,    dps: null,  bvps: null,    shares: 3148   },
    ENGROH: { eps: 8.5,   dps: null,  shares: 1420   },
    FFC:    { eps: 12.14, dps: 8.50,  shares: 1272   },
    EFERT:  { eps: 2.49,  dps: 2.00,  shares: 1314   },
    LUCK:   { eps: 25.07, dps: null,  shares: 323    },
    MLCF:   { eps: 5.81,  dps: null,  shares: 1048   },
    CHCC:   { eps: 28.40, dps: null,  shares: 194    },
    DGKC:   { eps: 19.07, dps: null,  shares: 438    },
  };

  const f = RATIO_INPUTS[ticker];
  if (!f || !livePrice || livePrice <= 0) return {};

  const ratios = {};

  if (f.eps && f.eps > 0) {
    ratios.pe = (livePrice / f.eps).toFixed(1);
    ratios.peNote = `P/E ${ratios.pe}× (PKR ${livePrice} / EPS PKR ${f.eps})`;
  }

  if (f.bvps && f.bvps > 0) {
    ratios.pb = (livePrice / f.bvps).toFixed(2);
    ratios.pbNote = `P/B ${ratios.pb}× (PKR ${livePrice} / BVPS PKR ${f.bvps})`;
  }

  if (f.dps && f.dps > 0) {
    ratios.divYield = ((f.dps / livePrice) * 100).toFixed(2) + '%';
    ratios.divNote = `Div Yield ${ratios.divYield} (DPS PKR ${f.dps})`;
  }

  if (f.shares) {
    ratios.marketCap = `PKR ${((livePrice * f.shares) / 1000).toFixed(1)}B`;
  }

  return ratios;
}

// ── ASSEMBLE FULL STOCK DATA ───────────────────────────────────
async function getStockData(ticker) {
  const fb = PSX_FUNDAMENTALS[ticker];
  if (!fb) return null;

  const livePrice = await getPSXPrice(ticker);

  const NAME_MAP = {
    OGDC:'Oil & Gas Dev Co', PPL:'Pakistan Petroleum',
    PSO:'Pakistan State Oil', MARI:'Mari Petroleum',
    APL:'Attock Petroleum', HASCOL:'Hascol Petroleum',
    HBL:'Habib Bank Ltd', MCB:'MCB Bank',
    UBL:'United Bank Ltd', NBP:'National Bank',
    ABL:'Allied Bank Ltd', BAFL:'Bank Al Falah',
    ENGROH:'Engro Holdings', FFC:'Fauji Fertiliser',
    EFERT:'Engro Fertilisers', LUCK:'Lucky Cement',
    MLCF:'Maple Leaf Cement', CHCC:'Cherat Cement', DGKC:'DG Khan Cement',
  };

  const SECTOR_LABEL = {
    ENERGY_EP:'Oil & Gas E&P', OMC:'Oil Marketing',
    BANKING:'Commercial Banking', FERTILISER:'Fertilizer', CEMENT:'Cement',
  };

  const sectorCode = SECTOR_MAP[ticker] || 'GENERAL';

  return {
    ticker,
    name:       NAME_MAP[ticker] || ticker,
    sector:     SECTOR_LABEL[sectorCode] || 'Pakistan Stock Exchange',
    sectorCode,
    price:      livePrice?.price     ?? null,
    change:     livePrice?.change    ?? null,
    changeAmt:  livePrice?.changeAmt ?? null,
    dir:        livePrice?.dir       ?? 'up',
    dataSource: livePrice ? 'PSX Live' : 'fundamentals only',
    ...fb,
  };
}

// ── VERDICT CACHE ──────────────────────────────────────────────
const verdictCache = {};
const CACHE_TTL = 6 * 60 * 60 * 1000;
function getCached(ticker) {
  const c = verdictCache[ticker];
  if (!c || Date.now() - c.timestamp > CACHE_TTL) { delete verdictCache[ticker]; return null; }
  return c.data;
}
function setCache(ticker, data) { verdictCache[ticker] = { data, timestamp: Date.now() }; }

// ── GENERATE AI VERDICT ────────────────────────────────────────
async function generateVerdict(stockData, macroContext) {
  const cached = getCached(stockData.ticker);
  if (cached) return { ...cached, cached: true };

  const sectorBlock = buildSectorDataBlock(stockData.ticker, stockData);

  const prompt = `You are a sharp PSX equity analyst for Wall-Trade — Pakistan's AI stock analysis platform.

LIVE PRICE DATA:
Ticker: ${stockData.ticker} — ${stockData.name}
Price: PKR ${stockData.price ?? '—'} (${stockData.change ?? '—'}% today)

${sectorBlock}

MICRO INTELLIGENCE (from quarterly reports — use this to inform your analysis, do not just rephrase it):
${stockData.aiSummary || ''}

PAKISTAN MACRO CONTEXT:
${macroContext}

INSTRUCTION: Sector-aware, data-driven verdict. Reference specific numbers. Apply sector logic strictly — do NOT flag high D/E for banks/OMCs, do NOT expect high margins from OMCs, do NOT treat HASCOL as normal valuation stock.

Return ONLY this JSON (no markdown):
{
  "verdict": "Positive" or "Neutral" or "Caution",
  "score": <integer 1-10>,
  "headline": "<sharp one-liner max 12 words with actual data>",
  "body": "<120-150 words. Lead with verdict rationale. Cover 2-3 strongest data points with numbers. One key risk with numbers. Connect to Pakistan macro. Short paragraphs. No buy/sell advice.>",
  "insights": [
    {"icon":"<emoji>","value":"<actual metric>","label":"<plain English max 10 words>","color":"green|amber|red|purple"},
    {"icon":"<emoji>","value":"<actual metric>","label":"<plain English max 10 words>","color":"green|amber|red|purple"},
    {"icon":"<emoji>","value":"<actual metric>","label":"<plain English max 10 words>","color":"green|amber|red|purple"}
  ],
  "signals": [
    {"label":"<2-4 word signal>","type":"green|amber|red|purple"},
    {"label":"<2-4 word signal>","type":"green|amber|red|purple"},
    {"label":"<2-4 word signal>","type":"green|amber|red|purple"}
  ],
  "scores": {
    "Financial health": <1-10>,
    "Macro environment": <1-10>,
    "Growth outlook": <1-10>,
    "Risk level": <1-10>
  },
  "factors": [
    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with actual numbers>"},
    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with actual numbers>"},
    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with actual numbers>"}
  ],
  "summary": "<one sentence summary with key number>"
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a senior PSX equity analyst. Generate accurate, sector-specific, data-driven analysis for Pakistani retail investors. Always cite exact figures. Never be generic. High D/E is normal for banks and OMCs. Thin margins are normal for OMCs. High margins are normal for E&P. HASCOL is a turnaround — not a normal stock. Be direct and specific.`,
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const verdict = JSON.parse(raw);
    setCache(stockData.ticker, verdict);
    return verdict;
  } catch(e) {
    console.error('Verdict error:', e.message);
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

  const { ticker, macroContext, priceOnly } = payload;

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const stockData = await getStockData(cleanTicker);
  if (!stockData) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: `No data for ${cleanTicker}. Supported: OGDC PPL MARI PSO APL HASCOL HBL MCB UBL NBP ABL BAFL ENGROH FFC EFERT LUCK MLCF CHCC DGKC` }) };
  }

  if (priceOnly) {
    return { statusCode: 200, headers, body: JSON.stringify({ stockData, verdict: null }) };
  }

  const liveRatios = calculateLiveRatios(cleanTicker, parseFloat(stockData.price) || 0);
  const stockDataWithRatios = { ...stockData, ...liveRatios };

  const verdict = await generateVerdict(stockDataWithRatios, macroContext);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ stockData: stockDataWithRatios, verdict, timestamp: new Date().toISOString() })
  };
};
