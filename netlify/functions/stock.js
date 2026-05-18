const https = require('https');

// ── PSX FUNDAMENTALS — Q3 FY26 (9M ending March 2026) ────────
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
    aiSummary:'Second-largest bank — PKR 5.4T deposits, PKR 8.1T assets. Q1 2026 profit PKR 16.1B — down 3% YoY from higher provisioning (4.3B vs 2.7B). CASA 38.7% improving. Digital 5.2M+ users, cards = 50% of fee income. CAR 16.7% strong. Rate hike: near-term NIM pressure but investment book repricing positive over 3-6 months. Coverage >100%.',
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
    aiSummary:'Exceptional Q1 2026 profit PKR 48.97B (+35% YoY) but PKR 30.5B came from capital gains — not core banking. EPS ~78 annualised makes it cheap on P/E. CRITICAL: equity collapsed PKR 499B to PKR 416B from PKR 62.8B OCI losses. CAR fell 20.97% to 16.35%. Largest bank by assets (PKR 12.7T) with PKR 9.9T investment book — extremely rate-sensitive. Borrowings 6.6T — high leverage.',
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
    aiSummary:'Sovereign/bond bank — PKR 5.16T govt securities out of PKR 7.18T assets. CASA 81.5% is best in Pakistan. But earnings under pressure — Q1 2026 profit DOWN 22% YoY to PKR 16.7B as NIM compressed 4.2% to 2.9%. Equity eroded PKR 531B to PKR 432B from OCI losses. BVPS PKR 205.3. CAR 21.57% very strong. LCR 199%. Government backing provides systemic safety.',
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
    eps:'14.12', dps:'N/A', netMargin:'N/A', grossMargin:'N/A',
    roe:'28.7%', roa:'1.4%', revenue:'N/A', netProfit:'N/A',
    totalAssets:'PKR 3.03T', totalCash:'N/A',
    deposits:'PKR 2.47T', investments:'N/A',
    casaRatio:'42.4%', carRatio:'16.2%', cet1Ratio:'N/A', nplRatio:'N/A',
    coverageRatio:'N/A', bvps:'N/A', netInterestIncome:'N/A',
    dividend:'N/A',
    aiSummary:'BAFL delivered strong earnings in Q1 FY26 with a quarterly EPS of PKR 3.53 (annualised PKR 14.12), reflecting robust profitability momentum driven by high non-interest income and trading gains on the securities book. Return on equity stood at a very strong 28.7% annualised while ROA reached 1.4%, indicating efficient asset deployment across a PKR 3.03T balance sheet. Asset quality showed a positive signal with provision reversals during the quarter, easing credit cost pressure and supporting bottom-line growth. CASA ratio of 42.4% on deposits of PKR 2.47T reflects a reasonably solid low-cost funding base, though there is room for improvement to reduce reliance on higher-cost deposits. Key risks include dependence on securities and trading income for profitability, exposure to OCI losses from bond holdings in a volatile rate environment, and rising operating costs that could compress the cost-to-income ratio going forward.',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    currentRatio:'N/A', quickRatio:'N/A', debtToEquity:'N/A',
    totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A', beta:'N/A',
    revenueGrowth:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
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
    aiSummary:'High-dividend fertilizer with ROE annualised ~30%. EPS 2.49 with PKR 2/share dividend — payout culture is core investment case. Urea sales 601 KT vs 592 KT — stable demand. Market share ~27%. Global urea $400 to $800/ton but local prices regulated. D/E 0.85x manageable. Risks: gas input costs and government subsidy policy dependency. FFC = safety, EFERT = dividend + slightly more risk.',
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
    aiSummary:'Largest cement company (18.9% market share). 9M FY26 EPS PKR 25.07 — up 34% YoY. Gross margin 26.5% improved from 24%. Net profit PKR 63.7B inflated by non-operational income — core gross margin is reliable gauge. D/E 0.4x — strong financial flexibility. Local volumes +10.6%, exports -9.7%. Chemicals/polyester segments -25-87%. Iraq/Congo expansion = 5-year growth catalyst. Diversification adds stability vs pure cement players.',
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
    aiSummary:'Serious earnings problem — 9M FY26 EPS PKR 5.81 down 50% YoY despite domestic volumes +21.8%. Pioneer Cement acquisition (77%) drove massive debt increase — D/E 1.2x is highest in sector. Finance cost rising sharply = profit destruction despite volume growth. Export collapse 54.9%. Gross margin 30.5% decent but net margin fell 23% to 11.6%. Domestic demand recovery insufficient to offset financial leverage stress.',
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
  OGDC:'ENERGY_EP', PPL:'ENERGY_EP', MARI:'ENERGY_EP', POL:'ENERGY_EP',
  PSO:'OMC', APL:'OMC', SHEL:'OMC', HASCOL:'OMC',
  HBL:'BANKING', MCB:'BANKING', UBL:'BANKING', NBP:'BANKING',
  MEBL:'BANKING', BAFL:'BANKING', ABL:'BANKING', FABL:'BANKING',
  BAHL:'BANKING', AKBL:'BANKING', BOP:'BANKING', SNBL:'BANKING',
  ENGROH:'FERTILISER', FFC:'FERTILISER', EFERT:'FERTILISER',
  FATIMA:'FERTILISER', FFBL:'FERTILISER',
  LUCK:'CEMENT', MLCF:'CEMENT', CHCC:'CEMENT', DGKC:'CEMENT',
  FCCL:'CEMENT', PIOC:'CEMENT', KOHC:'CEMENT', ACPL:'CEMENT', POWER:'CEMENT',
  HUBC:'POWER', KEL:'POWER', KAPCO:'POWER', NPL:'POWER', NCPL:'POWER', PKGP:'POWER',
  SYS:'TECH', TRG:'TECH', PTC:'TECH', AIRLINK:'TECH', AVN:'TECH', NETSOL:'TECH',
  INDU:'AUTO', HCAR:'AUTO', PSMC:'AUTO', GHNL:'AUTO', SAZEW:'AUTO', MTL:'AUTO', AGTL:'AUTO',
  NESTLE:'CONSUMER', UNITY:'CONSUMER', NATF:'CONSUMER', MUREB:'CONSUMER', COLG:'CONSUMER',
  ILP:'TEXTILE', NML:'TEXTILE', GATM:'TEXTILE', KTML:'TEXTILE', SAPT:'TEXTILE',
  DAWH:'HOLDING',
  EPCL:'CHEMICALS', LOTCHEM:'CHEMICALS', SNGP:'CHEMICALS', SSGC:'CHEMICALS',
  EFUG:'INSURANCE', EFUL:'INSURANCE', JGICL:'INSURANCE',
  SEARL:'PHARMA', AGP:'PHARMA', GLAXO:'PHARMA', ABOT:'PHARMA',
  MUGHAL:'STEEL', ASTL:'STEEL', ISL:'STEEL', ASL:'STEEL',
  PIBTL:'LOGISTICS', PIAA:'AVIATION', HUMNL:'MEDIA',
};

// ── SECTOR-SPECIFIC PROMPT BUILDERS ────────────────────────────
function buildSectorDataBlock(ticker, s) {
  const sector = SECTOR_MAP[ticker] || 'GENERAL';

  if (sector === 'BANKING') {
    return 'SECTOR: Banking (PSX)\nKEY METRICS:\n' +
      '- P/B: ' + (s.pb || 'N/A') + ' | P/E: ' + (s.pe || 'N/A') + ' | EPS: PKR ' + (s.eps || 'N/A') + ' (annualised)\n' +
      '- Div Yield: ' + (s.divYield || 'N/A') + ' | DPS: PKR ' + (s.dps || 'N/A') + '\n' +
      '- ROE: ' + (s.roe || 'N/A') + ' | ROA: ' + (s.roa || 'N/A') + '\n' +
      '- CASA: ' + (s.casaRatio || 'N/A') + ' | CAR: ' + (s.carRatio || 'N/A') + ' | CET1: ' + (s.cet1Ratio || 'N/A') + '\n' +
      '- NPL/Infection Ratio: ' + (s.nplRatio || s.infectionRatio || 'N/A') + '\n' +
      '- Net Profit: ' + (s.netProfit || 'N/A') + ' | Deposits: ' + (s.deposits || 'N/A') + ' | Assets: ' + (s.totalAssets || 'N/A') + '\n' +
      (s.investments ? '- Investment Book: ' + s.investments + '\n' : '') +
      (s.liquidityCoverageRatio ? '- LCR: ' + s.liquidityCoverageRatio + '\n' : '') +
      'SECTOR RULES: P/B is primary valuation metric. High D/E is NORMAL for banks. CASA >50% = strong low-cost funding. CAR >18% = well-capitalised. SBP rate hike +100bps Apr 2026: near-term NIM pressure, medium-term investment book repricing positive. OCI losses are paper losses from bond revaluation.';
  }

  if (sector === 'ENERGY_EP') {
    return 'SECTOR: Oil & Gas E&P (PSX)\nKEY METRICS:\n' +
      '- P/E: ' + (s.pe || 'N/A') + ' | EPS: PKR ' + (s.eps || 'N/A') + ' (9M FY26)\n' +
      '- Div Yield: ' + (s.divYield || 'N/A') + ' | DPS: PKR ' + (s.dps || 'N/A') + '\n' +
      '- Net Margin: ' + (s.netMargin || 'N/A') + ' | ROE: ' + (s.roe || 'N/A') + '\n' +
      '- Revenue: ' + (s.revenue || 'N/A') + ' | Net Profit: ' + (s.netProfit || 'N/A') + '\n' +
      '- Circular Debt Exposure: ' + (s.tradeDebts || 'N/A') + ' | Cash: ' + (s.totalCash || 'N/A') + '\n' +
      'SECTOR RULES: Revenue USD-linked — PKR weakness BOOSTS PKR earnings. Brent crude = #1 earnings driver. Circular debt means cash flow severely lags reported profit. Net margins 35-50% are NORMAL for E&P. Gas curtailment from RLNG oversupply is sector-wide risk.';
  }

  if (sector === 'OMC') {
    return 'SECTOR: Oil Marketing (PSX)\nKEY METRICS:\n' +
      '- P/E: ' + (s.pe || 'N/A') + ' | EPS: PKR ' + (s.eps || 'N/A') + ' (9M FY26)\n' +
      '- Net Margin: ' + (s.netMargin || 'N/A') + ' | Revenue: ' + (s.revenue || 'N/A') + '\n' +
      '- Current Ratio: ' + (s.currentRatio || 'N/A') + ' | Debt/Equity: ' + (s.debtToEquity || 'N/A') + '\n' +
      '- Receivables: ' + (s.tradeDebts || 'N/A') + ' | Net Profit: ' + (s.netProfit || 'N/A') + '\n' +
      (s.vitolOwnership ? '- Vitol Ownership: ' + s.vitolOwnership + '\n' : '') +
      (s.currentRatio === '0.22' ? 'CRITICAL: Current ratio 0.22x — GOING CONCERN risk flagged in accounts\n' : '') +
      'SECTOR RULES: Net margins 1-3% NORMAL. D/E 2-3x NORMAL for OMC working capital. Inventory gains = major quarterly swing. PKR weakness HURTS OMCs. HASCOL = special turnaround situation, not normal business.';
  }

  if (sector === 'FERTILISER') {
    return 'SECTOR: Fertilizer (PSX)\nKEY METRICS:\n' +
      '- P/E: ' + (s.pe || 'N/A') + ' | EPS: PKR ' + (s.eps || 'N/A') + '\n' +
      '- Div Yield: ' + (s.divYield || 'N/A') + ' | DPS: PKR ' + (s.dps || 'N/A') + '\n' +
      '- Net Margin: ' + (s.netMargin || 'N/A') + ' | ROE: ' + (s.roe || 'N/A') + '\n' +
      '- Gross Margin: ' + (s.grossMargin || 'N/A') + ' | D/E: ' + (s.debtToEquity || 'N/A') + '\n' +
      '- Revenue: ' + (s.revenue || 'N/A') + ' | Net Profit: ' + (s.netProfit || 'N/A') + '\n' +
      (s.ureaMarketShare ? '- Urea Market Share: ' + s.ureaMarketShare + '\n' : '') +
      (s.dapMarketShare ? '- DAP Market Share: ' + s.dapMarketShare + '\n' : '') +
      (s.investmentIncome ? '- Other/Investment Income: ' + s.investmentIncome + '\n' : '') +
      'SECTOR RULES: Dividend yield = PRIMARY investment case for FFC/EFERT. Gas feedstock = core margin variable. ENGROH is a holding company — value from EFERT stake. FFC = market dominance + dividend. EFERT = growth + dividend. Seasonal urea demand: Kharif/Rabi crop cycles.';
  }

  if (sector === 'CEMENT') {
    return 'SECTOR: Cement (PSX)\nKEY METRICS:\n' +
      '- P/E: ' + (s.pe || 'N/A') + ' | EPS: PKR ' + (s.eps || 'N/A') + ' (9M FY26)\n' +
      '- Gross Margin: ' + (s.grossMargin || 'N/A') + ' | Net Margin: ' + (s.netMargin || 'N/A') + '\n' +
      '- ROE: ' + (s.roe || 'N/A') + ' | D/E: ' + (s.debtToEquity || 'N/A') + '\n' +
      '- Revenue: ' + (s.revenue || 'N/A') + ' | Net Profit: ' + (s.netProfit || 'N/A') + '\n' +
      (s.marketShare ? '- Market Share: ' + s.marketShare + '\n' : '') +
      (s.financeCostReduction ? '- Finance Cost Change: ' + s.financeCostReduction + '\n' : '') +
      (s.longTermLoans ? '- Long-term Debt: ' + s.longTermLoans + '\n' : '') +
      (s.expansion ? '- Expansion: ' + s.expansion + '\n' : '') +
      'SECTOR RULES: Coal (USD) = #1 cost driver — PKR weakness hurts margins. PSDP + rate cuts drive demand. Sector overcapacity = retention price pressure. Exports (Afghanistan) weak across all. LUCK = giant diversified. MLCF = high debt risk. CHCC = quality low-debt. DGKC = recovery but weak ROE.';
  }

  return 'KEY METRICS:\n' +
    '- EPS: PKR ' + (s.eps || 'N/A') + ' | Net Margin: ' + (s.netMargin || 'N/A') + '\n' +
    '- Revenue: ' + (s.revenue || 'N/A') + ' | Net Profit: ' + (s.netProfit || 'N/A') + '\n' +
    '- ROE: ' + (s.roe || 'N/A') + ' | D/E: ' + (s.debtToEquity || 'N/A');
}

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, headers) {
  headers = headers || {};
  return new Promise(function(resolve) {
    var timer = setTimeout(function() { resolve(null); }, 4000);
    https.get(url, {
      headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)' }, headers)
    }, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', function() { clearTimeout(timer); resolve(null); });
  });
}

function callAnthropic(body) {
  return new Promise(function(resolve, reject) {
    var data = JSON.stringify(body);
    var req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function callOpenRouter(body) {
  return new Promise(function(resolve, reject) {
    // Hard 20-second timeout — prevents hanging until Netlify kills the function
    var hardTimeout = setTimeout(function() {
      reject(new Error('OpenRouter timeout after 20s'));
    }, 20000);

    var data = JSON.stringify(body);
    var req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://walltrade.markets',
        'X-Title': 'Wall-Trade',
        'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() {
        clearTimeout(hardTimeout);
        try { resolve(JSON.parse(b)); } catch(e) { reject(e); }
      });
    });
    req.on('error', function(e) { clearTimeout(hardTimeout); reject(e); });
    req.write(data);
    req.end();
  });
}

// ── FETCH LIVE PRICE ──────────────────────────────────────────
async function getPSXPrice(ticker) {
  try {
    var data = await fetchJSON('http://188.166.245.128:3000/timeseries/int/' + ticker);
    if (!data || !data.data || !data.data.length) return null;
    var latest = data.data[0];
    var price = parseFloat(latest[1]);
    if (!price || price <= 0) return null;
    var oldest = data.data[data.data.length - 1];
    var openPrice = parseFloat(oldest[1]);
    var changeAmt = price - openPrice;
    var changePct = openPrice > 0 ? (changeAmt / openPrice) * 100 : 0;
    return {
      price: price.toFixed(2),
      change: changePct.toFixed(2),
      changeAmt: changeAmt.toFixed(2),
      dir: changePct >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── CALCULATE LIVE RATIOS ─────────────────────────────────────
function calculateLiveRatios(ticker, livePrice) {
  var s = PSX_FUNDAMENTALS[ticker];
  if (!s || !livePrice || livePrice <= 0) return {};
  var ratios = {};
  var eps = parseFloat(s.eps);
  var dps = parseFloat(s.dps);
  var bvps = parseFloat(s.bvps);
  var shares = parseFloat(s.sharesOutstanding);
  if (eps > 0) {
    ratios.pe = (livePrice / eps).toFixed(1);
    ratios.peNote = 'P/E ' + ratios.pe + 'x (PKR ' + livePrice + ' / EPS PKR ' + eps + ')';
  }
  if (bvps > 0) {
    ratios.pb = (livePrice / bvps).toFixed(2);
    ratios.pbNote = 'P/B ' + ratios.pb + 'x (PKR ' + livePrice + ' / BVPS PKR ' + bvps + ')';
  }
  if (dps > 0) {
    ratios.divYield = ((dps / livePrice) * 100).toFixed(2) + '%';
    ratios.divNote = 'Div Yield ' + ratios.divYield + ' (DPS PKR ' + dps + ')';
  }
  if (shares > 0) {
    ratios.marketCap = 'PKR ' + ((livePrice * shares) / 1000).toFixed(1) + 'B';
  }
  return ratios;
}

// ── ASSEMBLE STOCK DATA ───────────────────────────────────────
async function getStockData(ticker) {
  var fb = PSX_FUNDAMENTALS[ticker];
  if (!fb) return null;
  var livePrice = await getPSXPrice(ticker);

  var NAME_MAP = {
    OGDC:'Oil & Gas Dev Co', PPL:'Pakistan Petroleum',
    PSO:'Pakistan State Oil', MARI:'Mari Petroleum',
    APL:'Attock Petroleum', HASCOL:'Hascol Petroleum',
    HBL:'Habib Bank Ltd', MCB:'MCB Bank',
    UBL:'United Bank Ltd', NBP:'National Bank',
    ABL:'Allied Bank Ltd', BAFL:'Bank Al Falah',
    ENGROH:'Engro Holdings', FFC:'Fauji Fertiliser',
    EFERT:'Engro Fertilisers', LUCK:'Lucky Cement',
    MLCF:'Maple Leaf Cement', CHCC:'Cherat Cement', DGKC:'DG Khan Cement',
    MEBL:'Meezan Bank', FABL:'Faysal Bank', BAHL:'Bank Al Habib',
    AKBL:'Askari Bank', BOP:'Bank of Punjab', SNBL:'Soneri Bank',
    POL:'Pakistan Oilfields', SHEL:'Shell Pakistan',
    FATIMA:'Fatima Fertilizer', FFBL:'Fauji Fertilizer Bin Qasim',
    FCCL:'Fauji Cement', PIOC:'Pioneer Cement', KOHC:'Kohat Cement',
    ACPL:'Attock Cement', POWER:'Power Cement',
    HUBC:'Hub Power', KEL:'K-Electric', KAPCO:'Kot Addu Power',
    NPL:'Nishat Power', NCPL:'Nishat Chunian Power', PKGP:'Pakgen Power',
    SYS:'Systems Limited', TRG:'TRG Pakistan', PTC:'Pakistan Telecom',
    AIRLINK:'Air Link Communication', AVN:'Avanceon', NETSOL:'NetSol Technologies',
    INDU:'Indus Motor', HCAR:'Honda Atlas Cars', PSMC:'Pak Suzuki',
    GHNL:'Ghandhara Nissan', SAZEW:'Sazgar Engineering',
    MTL:'Millat Tractors', AGTL:'Al-Ghazi Tractors',
    NESTLE:'Nestle Pakistan', UNITY:'Unity Foods', NATF:'National Foods',
    MUREB:'Murree Brewery', COLG:'Colgate Palmolive',
    ILP:'Interloop', NML:'Nishat Mills', GATM:'Gul Ahmed Textile',
    KTML:'Kohinoor Textile', SAPT:'Sapphire Textile',
    DAWH:'Dawood Hercules', EPCL:'Engro Polymer',
    LOTCHEM:'LOTTE Chemical', SNGP:'Sui Northern Gas', SSGC:'Sui Southern Gas',
    EFUG:'EFU General', EFUL:'EFU Life', JGICL:'Jubilee General',
    SEARL:'Searle Company', AGP:'AGP Limited',
    GLAXO:'GlaxoSmithKline Pakistan', ABOT:'Abbott Laboratories',
    MUGHAL:'Mughal Iron & Steel', ASTL:'Amreli Steels',
    ISL:'International Steels', ASL:'Aisha Steel',
    PIBTL:'Pakistan Int. Bulk Terminal',
    PIAA:'PIA Holding', HUMNL:'Hum Network',
  };

  var SECTOR_LABEL = {
    ENERGY_EP:'Oil & Gas E&P', OMC:'Oil Marketing',
    BANKING:'Commercial Banking', FERTILISER:'Fertilizer', CEMENT:'Cement',
    POWER:'Power & Utilities', TECH:'Technology & Telecom',
    AUTO:'Auto & Engineering', CONSUMER:'Consumer & Food',
    TEXTILE:'Textile Exports', HOLDING:'Holding & Diversified',
    CHEMICALS:'Chemicals & Industrial', INSURANCE:'Insurance',
    PHARMA:'Pharmaceuticals', STEEL:'Steel & Materials',
    LOGISTICS:'Logistics & Ports', AVIATION:'Aviation', MEDIA:'Media',
  };

  var sectorCode = SECTOR_MAP[ticker] || 'GENERAL';

  return Object.assign({
    ticker: ticker,
    name: NAME_MAP[ticker] || ticker,
    sector: SECTOR_LABEL[sectorCode] || 'Pakistan Stock Exchange',
    sectorCode: sectorCode,
    price: livePrice ? livePrice.price : null,
    change: livePrice ? livePrice.change : null,
    changeAmt: livePrice ? livePrice.changeAmt : null,
    dir: livePrice ? livePrice.dir : 'up',
    dataSource: livePrice ? 'PSX Live' : 'fundamentals only',
  }, fb);
}

// ── IN-MEMORY VERDICT CACHE ───────────────────────────────────
var verdictCache = {};
var CACHE_TTL = 6 * 60 * 60 * 1000;
function getCached(ticker) {
  var c = verdictCache[ticker];
  if (!c || Date.now() - c.timestamp > CACHE_TTL) { delete verdictCache[ticker]; return null; }
  return c.data;
}
function setCache(ticker, data) { verdictCache[ticker] = { data: data, timestamp: Date.now() }; }

// ── GENERATE AI VERDICT ────────────────────────────────────────
async function generateVerdict(stockData, macroContext) {
  var cached = getCached(stockData.ticker);
  if (cached) return Object.assign({}, cached, { cached: true });

  var sectorBlock = buildSectorDataBlock(stockData.ticker, stockData);

  // Build technicals block if frontend passed indicator data
  var techBlock = '';
  if (stockData.technicals) {
    var t = stockData.technicals;
    var rsiRead = !t.rsi ? 'N/A'
      : t.rsi < 30 ? 'Oversold (' + t.rsi + ')'
      : t.rsi > 70 ? 'Overbought (' + t.rsi + ')'
      : 'Neutral (' + t.rsi + ')';
    var macdRead = t.macd
      ? (t.macd.histogram >= 0
          ? 'Positive histogram (+' + t.macd.histogram + ') — momentum building'
          : 'Negative histogram (' + t.macd.histogram + ') — momentum fading')
      : 'N/A';
    var bbRead = t.bb
      ? (t.bb.percentB > 0.8
          ? 'Near upper band (' + (t.bb.percentB * 100).toFixed(0) + '%) — price extended'
          : t.bb.percentB < 0.2
          ? 'Near lower band (' + (t.bb.percentB * 100).toFixed(0) + '%) — price compressed'
          : 'Mid-range (' + (t.bb.percentB * 100).toFixed(0) + '%)')
      : 'N/A';
    var p = parseFloat(stockData.price);
    var maRead = (t.ma20 && t.ma50 && p)
      ? 'Price ' + (p > t.ma20 ? 'above' : 'below') + ' MA20 (PKR ' + t.ma20 + ') and '
        + (p > t.ma50 ? 'above' : 'below') + ' MA50 (PKR ' + t.ma50 + ')'
      : 'N/A';
    techBlock = '\n\nTECHNICAL INDICATORS (supporting context only — fundamentals take priority):\n' +
      'RSI(14): ' + rsiRead + '\n' +
      'MACD: ' + macdRead + '\n' +
      'Bollinger %B: ' + bbRead + '\n' +
      'Moving Averages: ' + maRead + '\n' +
      'NOTE: Use technicals only to corroborate or flag divergence from fundamentals. Never lead with them.';
  }

  var prompt = 'You are a sharp PSX equity analyst for Wall-Trade.\n\n' +
    'LIVE PRICE DATA:\n' +
    'Ticker: ' + stockData.ticker + ' - ' + stockData.name + '\n' +
    'Price: PKR ' + (stockData.price || '-') + ' (' + (stockData.change || '-') + '% today)\n\n' +
    sectorBlock + '\n\n' +
    'COMPANY ANALYSIS:\n' + (stockData.aiSummary || '') + '\n\n' +
    'PAKISTAN MACRO CONTEXT:\n' + macroContext +
    techBlock + '\n\n' +
    'INSTRUCTION: Sector-aware, data-driven analysis. Reference specific numbers. Apply sector logic strictly.\n\n' +
    'Return ONLY this JSON (no markdown):\n' +
    '{\n' +
    '  "verdict": "Strong Fundamentals" or "Mixed Picture" or "Needs Monitoring",\n' +
    '  "score": <integer 1-10>,\n' +
    '  "headline": "<sharp one-liner max 12 words with actual data>",\n' +
    '  "body": "<120-150 words. Lead with fundamental rationale. Cover 2-3 strongest data points with numbers. One key risk with numbers. Where technicals support or contradict fundamentals, note it briefly. Connect to Pakistan macro. No buy/sell advice.>",\n' +
    '  "technicalRead": "<1 factual sentence on what RSI, MACD and Bollinger Bands collectively show about recent price momentum — no advice, just what the data says>",\n' +
    '  "insights": [\n' +
    '    {"icon":"<emoji>","value":"<actual metric>","label":"<plain English max 10 words>","color":"green|amber|red|purple"},\n' +
    '    {"icon":"<emoji>","value":"<actual metric>","label":"<plain English max 10 words>","color":"green|amber|red|purple"},\n' +
    '    {"icon":"<emoji>","value":"<actual metric>","label":"<plain English max 10 words>","color":"green|amber|red|purple"}\n' +
    '  ],\n' +
    '  "signals": [\n' +
    '    {"label":"<2-4 word signal>","type":"green|amber|red|purple"},\n' +
    '    {"label":"<2-4 word signal>","type":"green|amber|red|purple"},\n' +
    '    {"label":"<2-4 word signal>","type":"green|amber|red|purple"}\n' +
    '  ],\n' +
    '  "scores": {"Financial health":<1-10>,"Macro environment":<1-10>,"Growth outlook":<1-10>,"Risk level":<1-10>},\n' +
    '  "factors": [\n' +
    '    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with actual numbers>"},\n' +
    '    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with actual numbers>"},\n' +
    '    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with actual numbers>"}\n' +
    '  ],\n' +
    '  "summary": "<one sentence summary with key number>"\n' +
    '}';

  var systemPrompt = 'You are a senior equity analyst at a top Pakistani brokerage, writing for Wall-Trade.\n\n' +
    'YOUR JOB: Generate a sharp, data-driven analysis that helps a Pakistani retail investor understand this stock RIGHT NOW.\n\n' +
    'RULES:\n' +
    '- Always cite exact figures — never say "strong margins", say "38.4% net margin"\n' +
    '- Never be generic — every sentence must be specific to THIS stock\n' +
    '- Connect macro to stock impact directly with numbers\n' +
    '- Sector logic is mandatory: BANKING = P/B primary, high D/E normal. E&P = circular debt = cash flow risk, high margins normal. OMC = 1-3% margins normal. CEMENT = coal cost is #1 driver. FERTILIZER = dividend yield is the investment case.\n' +
    '- The body field MUST be 120-150 words minimum — do not truncate\n' +
    '- Every factor detail MUST include at least one actual number\n' +
    '- Never give buy or sell advice — use "Strong Fundamentals", "Mixed Picture", or "Needs Monitoring" only\n' +
    '- NEVER mention analyst price targets or consensus ratings\n' +
    '- If technicalRead data is unavailable, set "technicalRead" to an empty string ""';

  try {
    var result = await callOpenRouter({
      model: 'minimax/minimax-m2.7',
      max_tokens: 2500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });

    var raw = '';
    if (result && result.choices && result.choices[0] && result.choices[0].message) {
      raw = result.choices[0].message.content || '';
    }
    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    var verdict = JSON.parse(raw);
    setCache(stockData.ticker, verdict);
    return verdict;
  } catch(e) {
    console.error('Verdict error:', e.message);
    return null;
  }
}

// ── SUPABASE HELPERS ──────────────────────────────────────────
var SUPABASE_URL = process.env.SUPABASE_URL;
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
var VERDICT_CACHE_TTL = 6 * 60 * 60 * 1000;

function supabase(path, method, body) {
  method = method || 'GET';
  body = body || null;
  return new Promise(function(resolve) {
    var data = body ? JSON.stringify(body) : null;
    var hostname = SUPABASE_URL.replace('https://', '');
    var headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation',
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    var req = https.request({
      hostname: hostname,
      path: '/rest/v1/' + path,
      method: method,
      headers: headers
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() { try { resolve(JSON.parse(b)); } catch(e) { resolve(null); } });
    });
    req.on('error', function() { resolve(null); });
    if (data) req.write(data);
    req.end();
  });
}

function supabaseRpc(fn, params) {
  return new Promise(function(resolve) {
    var data = JSON.stringify(params);
    var hostname = SUPABASE_URL.replace('https://', '');
    var req = https.request({
      hostname: hostname,
      path: '/rest/v1/rpc/' + fn,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() { try { resolve(JSON.parse(b)); } catch(e) { resolve(null); } });
    });
    req.on('error', function() { resolve(null); });
    req.write(data);
    req.end();
  });
}

async function getLatestMacro() {
  try {
    var rows = await supabase('macro?select=content,updated_at&order=updated_at.desc&limit=1');
    if (!rows || !rows[0] || !rows[0].content) return null;
    return { content: rows[0].content, updated_at: rows[0].updated_at };
  } catch(e) {
    console.error('Macro fetch error:', e.message);
    return null;
  }
}

async function getCachedVerdict(ticker) {
  try {
    var rows = await supabase('verdict_cache?ticker=eq.' + ticker + '&select=verdict,updated_at');
    if (!rows || !rows[0]) return null;
    var age = Date.now() - new Date(rows[0].updated_at).getTime();
    if (age > VERDICT_CACHE_TTL) return null;
    return rows[0].verdict;
  } catch(e) { return null; }
}

async function saveVerdictCache(ticker, verdict) {
  try {
    await supabase('verdict_cache?ticker=eq.' + ticker, 'PATCH', { verdict: verdict, updated_at: new Date().toISOString() });
  } catch(e) {
    try {
      await supabase('verdict_cache', 'POST', { ticker: ticker, verdict: verdict, updated_at: new Date().toISOString() });
    } catch(e2) {}
  }
}

function decodeJWT(token) {
  try {
    var parts = token.split('.');
    if (parts.length !== 3) return null;
    var payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.sub || null;
  } catch(e) { return null; }
}

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: headers, body: '' };

  var payload;
  try { payload = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  var ticker = payload.ticker;
  var macroContext = payload.macroContext;
  var priceOnly = payload.priceOnly;
  var token = payload.token;
  var technicals = payload.technicals || null; // passed from frontend indicatorCache

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  var cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Run stock data fetch and verdict cache check in parallel — saves 2-6s
  var [stockData, cachedVerdict] = await Promise.all([
    getStockData(cleanTicker),
    getCachedVerdict(cleanTicker)
  ]);

  if (!stockData) {
    return { statusCode: 404, headers: headers, body: JSON.stringify({ error: 'No data for ' + cleanTicker }) };
  }

  var liveRatios = calculateLiveRatios(cleanTicker, parseFloat(stockData.price) || 0);
  var stockDataWithRatios = Object.assign({}, stockData, liveRatios);

  // Attach technicals from frontend so generateVerdict can use them in the prompt
  if (technicals) stockDataWithRatios.technicals = technicals;

  if (priceOnly) {
    return { statusCode: 200, headers: headers, body: JSON.stringify({ stockData: stockDataWithRatios, verdict: null }) };
  }

  var userId = token ? decodeJWT(token) : null;
  if (!userId) {
    return { statusCode: 401, headers: headers, body: JSON.stringify({ error: 'Please sign in to generate verdicts.' }) };
  }

  if (cachedVerdict) {
    console.log('Cache hit for ' + cleanTicker);
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ stockData: stockDataWithRatios, verdict: cachedVerdict, cached: true, timestamp: new Date().toISOString() })
    };
  }

  // Run rate limit check and macro fetch in parallel — saves 1-3s
  var [usageCheck, latestMacro] = await Promise.all([
    supabaseRpc('check_and_increment_usage', { p_user_id: userId, p_type: 'verdict' }),
    getLatestMacro()
  ]);

  if (!usageCheck || !usageCheck.allowed) {
    var tier = (usageCheck && usageCheck.tier) || 'free';
    var limit = (usageCheck && usageCheck.limit) || 5;
    var isPremium = tier === 'premium';
    return {
      statusCode: 429,
      headers: headers,
      body: JSON.stringify({
        error: 'Daily limit reached. ' + (isPremium ? 'Premium users get ' + limit + ' verdicts/day.' : 'Beta users get ' + limit + ' AI verdicts/day. Upgrade to Premium for 15 verdicts/day.'),
        tier: tier,
        limit: limit,
        upgrade: !isPremium
      })
    };
  }

  var finalMacro = (latestMacro && latestMacro.content)
    ? latestMacro.content + '\n\nMacro last updated: ' + latestMacro.updated_at
    : (macroContext && macroContext.length > 50 ? macroContext : 'Pakistan macro context unavailable.');

  var verdict = await generateVerdict(stockDataWithRatios, finalMacro);

  if (verdict) await saveVerdictCache(cleanTicker, verdict);

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify({ stockData: stockDataWithRatios, verdict: verdict, cached: false, timestamp: new Date().toISOString() })
  };
};
