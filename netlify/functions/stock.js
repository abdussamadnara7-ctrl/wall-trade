const https = require('https');

// ─────────────────────────────────────────────────────────────────────────────
// PSX FUNDAMENTALS — Updated April 2026
// Sources: PSX annual reports, company financials FY2024/FY2025
// Live prices are fetched from PSX Terminal — NOT stored here
// For banks: high D/E is normal (deposit-funded) — not a risk flag
// ENGROH = Engro Holdings Ltd (replaced ENGRO Jan 14 2025)
// ─────────────────────────────────────────────────────────────────────────────
const FUNDAMENTALS = {

  // ── ENERGY & OIL ─────────────────────────────────────────────────
  OGDC: {
    name:'Oil & Gas Development Co.', sector:'Energy', industry:'Exploration & Production',
    pe:'8.1', pb:'1.1', eps:'38.40', divYield:'6.2%',
    roe:'14.1%', roa:'10.5%', grossMargin:'59.2%', netMargin:'43.1%', opMargin:'52.8%',
    ebitda:'Rs. 148B', revenue:'Rs. 344B', currentRatio:'2.14', debtToEquity:'0.04',
    totalDebt:'Rs. 1.2B', totalCash:'Rs. 30B', fcf:'Rs. 92B', marketCap:'Rs. 440B',
    revenueGrowth:'8.8%', earningsGrowth:'6.4%', beta:'0.72',
    week52Note:'State-backed E&P leader — circular debt is the key overhang'
  },
  PPL: {
    name:'Pakistan Petroleum Ltd', sector:'Energy', industry:'Exploration & Production',
    pe:'7.0', pb:'0.9', eps:'30.20', divYield:'7.4%',
    roe:'12.8%', roa:'9.2%', grossMargin:'55.1%', netMargin:'39.4%', opMargin:'49.2%',
    ebitda:'Rs. 100B', revenue:'Rs. 258B', currentRatio:'1.88', debtToEquity:'0.11',
    totalDebt:'Rs. 4.6B', totalCash:'Rs. 19B', fcf:'Rs. 64B', marketCap:'Rs. 240B',
    revenueGrowth:'6.4%', earningsGrowth:'5.0%', beta:'0.80',
    week52Note:'Sui gas field in long-term decline — new discoveries are the catalyst'
  },
  PSO: {
    name:'Pakistan State Oil', sector:'Energy', industry:'Oil Marketing Company',
    pe:'6.2', pb:'0.8', eps:'84.60', divYield:'5.6%',
    roe:'14.6%', roa:'3.2%', grossMargin:'3.1%', netMargin:'1.7%', opMargin:'2.0%',
    ebitda:'Rs. 29B', revenue:'Rs. 1620B', currentRatio:'1.10', debtToEquity:'1.88',
    totalDebt:'Rs. 50B', totalCash:'Rs. 8B', fcf:'Rs. 12B', marketCap:'Rs. 106B',
    revenueGrowth:'4.4%', earningsGrowth:'-3.4%', beta:'1.08',
    week52Note:'Rs. 800B+ unpaid receivables — state-backed but deep value trap'
  },
  MARI: {
    name:'Mari Petroleum Co.', sector:'Energy', industry:'Exploration & Production',
    pe:'9.6', pb:'2.4', eps:'244.80', divYield:'4.3%',
    roe:'25.2%', roa:'18.8%', grossMargin:'63.4%', netMargin:'46.8%', opMargin:'57.1%',
    ebitda:'Rs. 66B', revenue:'Rs. 143B', currentRatio:'3.48', debtToEquity:'0.02',
    totalDebt:'Rs. 0.4B', totalCash:'Rs. 23B', fcf:'Rs. 50B', marketCap:'Rs. 292B',
    revenueGrowth:'12.8%', earningsGrowth:'11.2%', beta:'0.67',
    week52Note:'Highest quality E&P on PSX — essentially debt-free with best margins'
  },
  APL: {
    name:'Attock Petroleum Ltd', sector:'Energy', industry:'Oil Marketing Company',
    pe:'11.0', pb:'1.8', eps:'70.20', divYield:'5.6%',
    roe:'16.6%', roa:'10.1%', grossMargin:'6.2%', netMargin:'3.8%', opMargin:'4.6%',
    ebitda:'Rs. 8.8B', revenue:'Rs. 230B', currentRatio:'1.64', debtToEquity:'0.27',
    totalDebt:'Rs. 4.1B', totalCash:'Rs. 6.6B', fcf:'Rs. 5.0B', marketCap:'Rs. 60B',
    revenueGrowth:'7.6%', earningsGrowth:'5.6%', beta:'0.91',
    week52Note:'Zero-debt OMC — Attock Group backing with exceptional yield'
  },
  HASCOL: {
    name:'Hascol Petroleum Ltd', sector:'Energy', industry:'Oil Marketing Company',
    pe:'N/A', pb:'2.0', eps:'-4.40', divYield:'N/A',
    roe:'-8.6%', roa:'-2.9%', grossMargin:'1.6%', netMargin:'-1.7%', opMargin:'-1.3%',
    ebitda:'Rs. -0.9B', revenue:'Rs. 152B', currentRatio:'0.61', debtToEquity:'4.94',
    totalDebt:'Rs. 25B', totalCash:'Rs. 0.8B', fcf:'Rs. -2.6B', marketCap:'Rs. 4.9B',
    revenueGrowth:'-2.6%', earningsGrowth:'-19%', beta:'1.42',
    week52Note:'Under active debt restructuring — highly speculative, risk of total loss'
  },
  SNGP: {
    name:'Sui Northern Gas Pipelines', sector:'Energy', industry:'Gas Distribution',
    pe:'8.4', pb:'1.2', eps:'22.40', divYield:'4.2%',
    roe:'14.8%', roa:'5.2%', grossMargin:'12.4%', netMargin:'6.8%', opMargin:'9.6%',
    ebitda:'Rs. 28B', revenue:'Rs. 412B', currentRatio:'1.42', debtToEquity:'0.68',
    totalDebt:'Rs. 38B', totalCash:'Rs. 12B', fcf:'Rs. 8.4B', marketCap:'Rs. 62B',
    revenueGrowth:'4.2%', earningsGrowth:'3.8%', beta:'0.88',
    week52Note:'State gas distributor — gas curtailment and regulatory risk'
  },
  SSGC: {
    name:'Sui Southern Gas Co.', sector:'Energy', industry:'Gas Distribution',
    pe:'N/A', pb:'0.9', eps:'-8.20', divYield:'N/A',
    roe:'-12.4%', roa:'-4.2%', grossMargin:'4.8%', netMargin:'-3.8%', opMargin:'-2.4%',
    ebitda:'Rs. -2.8B', revenue:'Rs. 216B', currentRatio:'0.72', debtToEquity:'2.84',
    totalDebt:'Rs. 62B', totalCash:'Rs. 4.2B', fcf:'Rs. -6.8B', marketCap:'Rs. 18B',
    revenueGrowth:'-1.8%', earningsGrowth:'-28%', beta:'1.28',
    week52Note:'Loss-making — gas theft losses and severe circular debt exposure'
  },

  // ── BANKING ───────────────────────────────────────────────────────
  HBL: {
    name:'Habib Bank Ltd', sector:'Banking', industry:'Commercial Banking',
    pe:'7.6', pb:'1.2', eps:'44.20', divYield:'7.0%',
    roe:'16.8%', roa:'1.3%', grossMargin:'N/A', netMargin:'25.2%', opMargin:'49.4%',
    ebitda:'Rs. 88B', revenue:'Rs. 360B', currentRatio:'N/A', debtToEquity:'8.6',
    totalDebt:'Rs. 146B', totalCash:'Rs. 292B', fcf:'Rs. 44B', marketCap:'Rs. 256B',
    revenueGrowth:'18.8%', earningsGrowth:'14.6%', beta:'0.87',
    casaRatio:'78%', nplRatio:'6.1%',
    week52Note:'Pakistan\'s largest bank — rate cut cycle is a NIM headwind'
  },
  MCB: {
    name:'MCB Bank Ltd', sector:'Banking', industry:'Commercial Banking',
    pe:'8.2', pb:'1.6', eps:'56.40', divYield:'8.4%',
    roe:'22.8%', roa:'2.2%', grossMargin:'N/A', netMargin:'33.2%', opMargin:'56.2%',
    ebitda:'Rs. 74B', revenue:'Rs. 228B', currentRatio:'N/A', debtToEquity:'7.0',
    totalDebt:'Rs. 86B', totalCash:'Rs. 190B', fcf:'Rs. 40B', marketCap:'Rs. 290B',
    revenueGrowth:'15.2%', earningsGrowth:'12.8%', beta:'0.75',
    casaRatio:'92%', nplRatio:'4.1%',
    week52Note:'Best quality bank — 92% CASA is sector-best, cheapest funding'
  },
  UBL: {
    name:'United Bank Ltd', sector:'Banking', industry:'Commercial Banking',
    pe:'7.0', pb:'1.1', eps:'50.40', divYield:'7.6%',
    roe:'18.6%', roa:'1.7%', grossMargin:'N/A', netMargin:'29.2%', opMargin:'53.8%',
    ebitda:'Rs. 66B', revenue:'Rs. 232B', currentRatio:'N/A', debtToEquity:'7.4',
    totalDebt:'Rs. 98B', totalCash:'Rs. 168B', fcf:'Rs. 34B', marketCap:'Rs. 192B',
    revenueGrowth:'16.6%', earningsGrowth:'11.8%', beta:'0.81',
    casaRatio:'76%', nplRatio:'7.8%',
    week52Note:'Strong GCC international franchise — remittance leader'
  },
  NBP: {
    name:'National Bank of Pakistan', sector:'Banking', industry:'Commercial Banking',
    pe:'4.6', pb:'0.6', eps:'29.20', divYield:'4.4%',
    roe:'13.2%', roa:'0.9%', grossMargin:'N/A', netMargin:'19.1%', opMargin:'39.2%',
    ebitda:'Rs. 50B', revenue:'Rs. 264B', currentRatio:'N/A', debtToEquity:'10.1',
    totalDebt:'Rs. 128B', totalCash:'Rs. 248B', fcf:'Rs. 19B', marketCap:'Rs. 102B',
    revenueGrowth:'12.8%', earningsGrowth:'8.4%', beta:'0.93',
    casaRatio:'73%', nplRatio:'18.2%',
    week52Note:'State-owned — deepest value but 18% NPL ratio is high'
  },
  ABL: {
    name:'Allied Bank Ltd', sector:'Banking', industry:'Commercial Banking',
    pe:'6.6', pb:'1.0', eps:'40.20', divYield:'6.6%',
    roe:'17.2%', roa:'1.5%', grossMargin:'N/A', netMargin:'27.1%', opMargin:'49.8%',
    ebitda:'Rs. 44B', revenue:'Rs. 166B', currentRatio:'N/A', debtToEquity:'7.8',
    totalDebt:'Rs. 70B', totalCash:'Rs. 132B', fcf:'Rs. 24B', marketCap:'Rs. 132B',
    revenueGrowth:'14.6%', earningsGrowth:'11.2%', beta:'0.85',
    casaRatio:'82%', nplRatio:'4.8%',
    week52Note:'Best digital banking platform — Ibrahim Group conservative management'
  },
  BAFL: {
    name:'Bank Al Falah Ltd', sector:'Banking', industry:'Commercial Banking',
    pe:'7.2', pb:'1.1', eps:'15.40', divYield:'6.0%',
    roe:'16.8%', roa:'1.3%', grossMargin:'N/A', netMargin:'25.4%', opMargin:'48.0%',
    ebitda:'Rs. 39B', revenue:'Rs. 158B', currentRatio:'N/A', debtToEquity:'8.4',
    totalDebt:'Rs. 64B', totalCash:'Rs. 116B', fcf:'Rs. 19B', marketCap:'Rs. 86B',
    revenueGrowth:'17.2%', earningsGrowth:'12.8%', beta:'0.91',
    casaRatio:'71%', nplRatio:'5.2%',
    week52Note:'Fast-growing Islamic banking franchise — Abu Dhabi Group backing'
  },
  BAHL: {
    name:'Bank Al Habib Ltd', sector:'Banking', industry:'Commercial Banking',
    pe:'9.2', pb:'1.8', eps:'22.80', divYield:'5.4%',
    roe:'20.2%', roa:'1.8%', grossMargin:'N/A', netMargin:'28.4%', opMargin:'52.4%',
    ebitda:'Rs. 38B', revenue:'Rs. 134B', currentRatio:'N/A', debtToEquity:'7.6',
    totalDebt:'Rs. 58B', totalCash:'Rs. 106B', fcf:'Rs. 22B', marketCap:'Rs. 144B',
    revenueGrowth:'16.4%', earningsGrowth:'13.2%', beta:'0.78',
    casaRatio:'84%', nplRatio:'3.4%',
    week52Note:'Premium quality mid-tier bank — 84% CASA and lowest NPLs'
  },
  MEBL: {
    name:'Meezan Bank Ltd', sector:'Banking', industry:'Islamic Banking',
    pe:'12.4', pb:'3.2', eps:'28.60', divYield:'4.2%',
    roe:'28.4%', roa:'2.4%', grossMargin:'N/A', netMargin:'32.6%', opMargin:'58.4%',
    ebitda:'Rs. 52B', revenue:'Rs. 160B', currentRatio:'N/A', debtToEquity:'8.2',
    totalDebt:'Rs. 72B', totalCash:'Rs. 148B', fcf:'Rs. 32B', marketCap:'Rs. 232B',
    revenueGrowth:'22.4%', earningsGrowth:'18.6%', beta:'0.82',
    casaRatio:'88%', nplRatio:'2.8%',
    week52Note:'Pakistan\'s largest Islamic bank — fastest growth and highest ROE'
  },
  FABL: {
    name:'Faysal Bank Ltd', sector:'Banking', industry:'Islamic Banking',
    pe:'8.4', pb:'1.2', eps:'12.40', divYield:'5.8%',
    roe:'14.8%', roa:'1.1%', grossMargin:'N/A', netMargin:'22.4%', opMargin:'44.8%',
    ebitda:'Rs. 24B', revenue:'Rs. 108B', currentRatio:'N/A', debtToEquity:'8.8',
    totalDebt:'Rs. 48B', totalCash:'Rs. 88B', fcf:'Rs. 12B', marketCap:'Rs. 56B',
    revenueGrowth:'14.8%', earningsGrowth:'10.4%', beta:'0.96',
    casaRatio:'68%', nplRatio:'5.8%',
    week52Note:'Converting to full Islamic banking — transition costs weigh on near-term'
  },

  // ── FERTILISER ───────────────────────────────────────────────────
  ENGROH: {
    name:'Engro Holdings Ltd', sector:'Conglomerate', industry:'Diversified Industrials',
    pe:'14.4', pb:'1.6', eps:'18.80', divYield:'4.9%',
    roe:'11.4%', roa:'4.8%', grossMargin:'22.8%', netMargin:'10.6%', opMargin:'17.2%',
    ebitda:'Rs. 29B', revenue:'Rs. 280B', currentRatio:'1.30', debtToEquity:'0.80',
    totalDebt:'Rs. 19B', totalCash:'Rs. 13B', fcf:'Rs. 15B', marketCap:'Rs. 128B',
    revenueGrowth:'6.4%', earningsGrowth:'5.0%', beta:'1.03',
    week52Note:'Holding co: EFERT stake + LNG terminal + telecom towers + foods'
  },
  FFC: {
    name:'Fauji Fertiliser Co.', sector:'Fertiliser', industry:'Chemicals',
    pe:'8.4', pb:'4.2', eps:'33.60', divYield:'10.2%',
    roe:'49.2%', roa:'22.8%', grossMargin:'33.2%', netMargin:'21.0%', opMargin:'27.4%',
    ebitda:'Rs. 39B', revenue:'Rs. 192B', currentRatio:'1.86', debtToEquity:'0.27',
    totalDebt:'Rs. 6.4B', totalCash:'Rs. 15B', fcf:'Rs. 29B', marketCap:'Rs. 170B',
    revenueGrowth:'6.6%', earningsGrowth:'5.0%', beta:'0.75',
    week52Note:'Largest urea producer — 10%+ yield; Fauji Group provides stability'
  },
  EFERT: {
    name:'Engro Fertilisers Ltd', sector:'Fertiliser', industry:'Chemicals',
    pe:'9.6', pb:'3.2', eps:'29.20', divYield:'8.6%',
    roe:'33.2%', roa:'18.8%', grossMargin:'39.2%', netMargin:'25.2%', opMargin:'33.0%',
    ebitda:'Rs. 44B', revenue:'Rs. 176B', currentRatio:'2.28', debtToEquity:'0.41',
    totalDebt:'Rs. 8.2B', totalCash:'Rs. 13B', fcf:'Rs. 33B', marketCap:'Rs. 152B',
    revenueGrowth:'12.8%', earningsGrowth:'10.4%', beta:'0.81',
    week52Note:'Enven plant is world-class — gas curtailment is the primary risk'
  },
  FFBL: {
    name:'Fauji Fertiliser Bin Qasim', sector:'Fertiliser', industry:'Chemicals',
    pe:'N/A', pb:'1.4', eps:'-2.80', divYield:'N/A',
    roe:'-4.9%', roa:'-1.8%', grossMargin:'8.2%', netMargin:'-1.9%', opMargin:'-2.6%',
    ebitda:'Rs. -1.3B', revenue:'Rs. 70B', currentRatio:'0.81', debtToEquity:'2.92',
    totalDebt:'Rs. 17B', totalCash:'Rs. 2.4B', fcf:'Rs. -4.4B', marketCap:'Rs. 15B',
    revenueGrowth:'-4.4%', earningsGrowth:'-25%', beta:'1.28',
    week52Note:'Loss-making — high debt burden and weak phosphate operations'
  },

  // ── CEMENT ───────────────────────────────────────────────────────
  LUCK: {
    name:'Lucky Cement Ltd', sector:'Cement', industry:'Building Materials',
    pe:'13.8', pb:'1.8', eps:'64.40', divYield:'3.9%',
    roe:'12.8%', roa:'6.6%', grossMargin:'18.8%', netMargin:'11.0%', opMargin:'14.6%',
    ebitda:'Rs. 29B', revenue:'Rs. 270B', currentRatio:'1.64', debtToEquity:'0.46',
    totalDebt:'Rs. 19B', totalCash:'Rs. 13B', fcf:'Rs. 13B', marketCap:'Rs. 220B',
    revenueGrowth:'5.0%', earningsGrowth:'2.6%', beta:'1.11',
    week52Note:'Best quality cement — Iraq & DRC international operations unique on PSX'
  },
  MLCF: {
    name:'Maple Leaf Cement', sector:'Cement', industry:'Building Materials',
    pe:'18.0', pb:'1.6', eps:'4.90', divYield:'2.5%',
    roe:'8.8%', roa:'4.3%', grossMargin:'14.4%', netMargin:'6.5%', opMargin:'11.0%',
    ebitda:'Rs. 8.6B', revenue:'Rs. 54B', currentRatio:'1.30', debtToEquity:'0.80',
    totalDebt:'Rs. 8.8B', totalCash:'Rs. 2.9B', fcf:'Rs. 2.5B', marketCap:'Rs. 25B',
    revenueGrowth:'6.4%', earningsGrowth:'-8.6%', beta:'1.23',
    week52Note:'Rate cut beneficiary — leveraged play on construction recovery'
  },
  CHCC: {
    name:'Cherat Cement Co.', sector:'Cement', industry:'Building Materials',
    pe:'22.0', pb:'2.4', eps:'8.40', divYield:'1.9%',
    roe:'11.0%', roa:'5.5%', grossMargin:'17.0%', netMargin:'8.4%', opMargin:'12.6%',
    ebitda:'Rs. 7.0B', revenue:'Rs. 43B', currentRatio:'1.50', debtToEquity:'0.60',
    totalDebt:'Rs. 6.4B', totalCash:'Rs. 2.5B', fcf:'Rs. 1.9B', marketCap:'Rs. 29B',
    revenueGrowth:'8.6%', earningsGrowth:'-4.4%', beta:'1.17',
    week52Note:'Mid-size cement with solid dividend — single plant is concentration risk'
  },
  DGKC: {
    name:'D.G. Khan Cement', sector:'Cement', industry:'Building Materials',
    pe:'N/A', pb:'0.8', eps:'-4.80', divYield:'N/A',
    roe:'-4.4%', roa:'-2.2%', grossMargin:'6.6%', netMargin:'-3.5%', opMargin:'-2.9%',
    ebitda:'Rs. -1.7B', revenue:'Rs. 50B', currentRatio:'0.91', debtToEquity:'1.88',
    totalDebt:'Rs. 19B', totalCash:'Rs. 1.9B', fcf:'Rs. -2.9B', marketCap:'Rs. 19B',
    revenueGrowth:'-2.6%', earningsGrowth:'-29%', beta:'1.31',
    week52Note:'Nishat Group quality at distressed price — debt paydown is the story'
  },
  PIOC: {
    name:'Pioneer Cement', sector:'Cement', industry:'Building Materials',
    pe:'16.4', pb:'2.0', eps:'6.80', divYield:'2.1%',
    roe:'12.4%', roa:'5.8%', grossMargin:'16.2%', netMargin:'8.8%', opMargin:'12.8%',
    ebitda:'Rs. 5.8B', revenue:'Rs. 38B', currentRatio:'1.38', debtToEquity:'0.54',
    totalDebt:'Rs. 5.2B', totalCash:'Rs. 2.2B', fcf:'Rs. 1.6B', marketCap:'Rs. 22B',
    revenueGrowth:'7.2%', earningsGrowth:'-3.8%', beta:'1.19',
    week52Note:'North Pakistan market — KPK and northern infrastructure exposure'
  },
  FCCL: {
    name:'Fauji Cement Co.', sector:'Cement', industry:'Building Materials',
    pe:'14.8', pb:'1.4', eps:'3.60', divYield:'2.8%',
    roe:'9.4%', roa:'4.8%', grossMargin:'15.6%', netMargin:'7.8%', opMargin:'11.4%',
    ebitda:'Rs. 6.2B', revenue:'Rs. 48B', currentRatio:'1.42', debtToEquity:'0.62',
    totalDebt:'Rs. 7.4B', totalCash:'Rs. 2.8B', fcf:'Rs. 1.4B', marketCap:'Rs. 24B',
    revenueGrowth:'6.8%', earningsGrowth:'-2.8%', beta:'1.14',
    week52Note:'Fauji Group conservative operator — steady but not exciting'
  },

  // ── TECHNOLOGY ───────────────────────────────────────────────────
  TRG: {
    name:'TRG Pakistan Ltd', sector:'Technology', industry:'IT Services & BPO',
    pe:'22.4', pb:'3.8', eps:'8.40', divYield:'1.2%',
    roe:'16.8%', roa:'8.2%', grossMargin:'28.4%', netMargin:'12.4%', opMargin:'16.8%',
    ebitda:'Rs. 12B', revenue:'Rs. 98B', currentRatio:'2.42', debtToEquity:'0.28',
    totalDebt:'Rs. 4.2B', totalCash:'Rs. 8.4B', fcf:'Rs. 6.8B', marketCap:'Rs. 84B',
    revenueGrowth:'14.2%', earningsGrowth:'12.4%', beta:'1.38',
    week52Note:'USD-earning BPO via Ibex — dollar revenues hedge PKR depreciation'
  },
  SYS: {
    name:'Systems Ltd', sector:'Technology', industry:'Software & IT Services',
    pe:'18.6', pb:'4.2', eps:'18.20', divYield:'1.8%',
    roe:'22.6%', roa:'14.2%', grossMargin:'32.4%', netMargin:'16.8%', opMargin:'22.4%',
    ebitda:'Rs. 8.4B', revenue:'Rs. 50B', currentRatio:'3.12', debtToEquity:'0.08',
    totalDebt:'Rs. 0.8B', totalCash:'Rs. 6.8B', fcf:'Rs. 5.6B', marketCap:'Rs. 62B',
    revenueGrowth:'18.6%', earningsGrowth:'16.4%', beta:'1.24',
    week52Note:'Best software co on PSX — near-zero debt with USD export revenues'
  },
  NETSOL: {
    name:'NetSol Technologies', sector:'Technology', industry:'Software & IT Services',
    pe:'24.2', pb:'3.6', eps:'12.60', divYield:'1.4%',
    roe:'14.8%', roa:'9.6%', grossMargin:'48.4%', netMargin:'18.4%', opMargin:'24.6%',
    ebitda:'Rs. 4.8B', revenue:'Rs. 26B', currentRatio:'2.84', debtToEquity:'0.06',
    totalDebt:'Rs. 0.4B', totalCash:'Rs. 4.2B', fcf:'Rs. 3.4B', marketCap:'Rs. 28B',
    revenueGrowth:'12.4%', earningsGrowth:'10.8%', beta:'1.18',
    week52Note:'Global fleet management software — APAC and Europe focused'
  },

  // ── OTHER ────────────────────────────────────────────────────────
  PAKT: {
    name:'Pakistan Tobacco Co.', sector:'Consumer Staples', industry:'Tobacco',
    pe:'16.8', pb:'12.4', eps:'88.40', divYield:'3.8%',
    roe:'74.2%', roa:'22.4%', grossMargin:'38.4%', netMargin:'14.2%', opMargin:'20.8%',
    ebitda:'Rs. 28B', revenue:'Rs. 198B', currentRatio:'0.82', debtToEquity:'1.24',
    totalDebt:'Rs. 12B', totalCash:'Rs. 6.4B', fcf:'Rs. 12B', marketCap:'Rs. 124B',
    revenueGrowth:'8.4%', earningsGrowth:'6.2%', beta:'0.68',
    week52Note:'BAT subsidiary cash machine — high excise duty risk from government'
  },
  PNSC: {
    name:'Pakistan National Shipping', sector:'Transportation', industry:'Marine Shipping',
    pe:'8.4', pb:'1.2', eps:'42.40', divYield:'6.2%',
    roe:'14.2%', roa:'8.6%', grossMargin:'24.8%', netMargin:'16.4%', opMargin:'20.2%',
    ebitda:'Rs. 6.8B', revenue:'Rs. 42B', currentRatio:'2.84', debtToEquity:'0.18',
    totalDebt:'Rs. 2.8B', totalCash:'Rs. 8.4B', fcf:'Rs. 4.8B', marketCap:'Rs. 38B',
    revenueGrowth:'6.4%', earningsGrowth:'5.2%', beta:'0.82',
    week52Note:'State-owned fleet — import recovery and remittance flows positive'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function get(url, extraHeaders = {}, ms = 6000) {
  return new Promise(resolve => {
    const t = setTimeout(() => { console.log(`TIMEOUT: ${url.slice(0,70)}`); resolve(null); }, ms);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json', ...extraHeaders }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { clearTimeout(t); try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    }).on('error', () => { clearTimeout(t); resolve(null); });
  });
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const hardTimeout = setTimeout(() => reject(new Error('Anthropic timeout')), 20000);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { clearTimeout(hardTimeout); try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', e => { clearTimeout(hardTimeout); reject(e); });
    req.write(data); req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH LIVE PRICE — PSX Terminal (primary)
// ─────────────────────────────────────────────────────────────────────────────
const PSX_H = { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/' };

async function getLivePrice(ticker) {
  try {
    const resp = await get(`https://psxterminal.com/api/ticks/REG/${ticker}`, PSX_H, 6000);
    if (!resp) return null;
    const d = resp.data ?? resp;
    if (!d || !d.price) return null;

    const pNum   = Number(d.price);
    if (isNaN(pNum) || pNum <= 0) return null;

    const rawPct = d.changePercent ?? d.change ?? 0;
    const pct    = Math.abs(Number(rawPct)) < 1 ? Number(rawPct) * 100 : Number(rawPct);

    return {
      price:      pNum.toFixed(2),
      change:     pct.toFixed(2),
      changeAmt:  d.ldcp ? (pNum - Number(d.ldcp)).toFixed(2) : null,
      dir:        pct >= 0 ? 'up' : 'dn',
      high:       d.high      ? Number(d.high).toFixed(2)      : null,
      low:        d.low       ? Number(d.low).toFixed(2)       : null,
      prevClose:  d.ldcp      ? Number(d.ldcp).toFixed(2)      : null,
      volume:     d.volume    ? Number(d.volume).toLocaleString() : null,
      week52High: d.yearHigh  ? Number(d.yearHigh).toFixed(2)  : null,
      week52Low:  d.yearLow   ? Number(d.yearLow).toFixed(2)   : null,
    };
  } catch(e) {
    console.error(`PSX Terminal error for ${ticker}:`, e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD FULL STOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
async function getStockData(ticker) {
  const fb = FUNDAMENTALS[ticker];
  const lp = await getLivePrice(ticker);

  if (!lp && !fb) return null;

  if (!lp) console.log(`${ticker}: PSX Terminal returned no price — fundamentals-only response`);

  return {
    ticker,
    name:     fb?.name     || ticker,
    sector:   fb?.sector   || 'Pakistan Stock Exchange',
    industry: fb?.industry || '',

    // Live price (PSX Terminal)
    price:      lp?.price     || null,
    change:     lp?.change    || null,
    changeAmt:  lp?.changeAmt || null,
    dir:        lp?.dir       || 'up',
    high:       lp?.high      || null,
    low:        lp?.low       || null,
    prevClose:  lp?.prevClose || null,
    volume:     lp?.volume    || null,
    week52High: lp?.week52High || null,
    week52Low:  lp?.week52Low  || null,
    priceSource: lp ? 'PSX Terminal (live)' : 'unavailable',

    // Fundamentals (Wall-Trade research database, FY2025)
    pe:            fb?.pe            || 'N/A',
    pb:            fb?.pb            || 'N/A',
    eps:           fb?.eps           || 'N/A',
    divYield:      fb?.divYield      || 'N/A',
    roe:           fb?.roe           || 'N/A',
    roa:           fb?.roa           || 'N/A',
    grossMargin:   fb?.grossMargin   || 'N/A',
    netMargin:     fb?.netMargin     || 'N/A',
    opMargin:      fb?.opMargin      || 'N/A',
    ebitda:        fb?.ebitda        || 'N/A',
    revenue:       fb?.revenue       || 'N/A',
    currentRatio:  fb?.currentRatio  || 'N/A',
    debtToEquity:  fb?.debtToEquity  || 'N/A',
    totalDebt:     fb?.totalDebt     || 'N/A',
    totalCash:     fb?.totalCash     || 'N/A',
    fcf:           fb?.fcf           || 'N/A',
    marketCap:     fb?.marketCap     || 'N/A',
    revenueGrowth: fb?.revenueGrowth || 'N/A',
    earningsGrowth:fb?.earningsGrowth || 'N/A',
    beta:          fb?.beta          || 'N/A',
    casaRatio:     fb?.casaRatio     || null,
    nplRatio:      fb?.nplRatio      || null,
    week52Note:    fb?.week52Note    || '',
    fundamentalsSource: 'Wall-Trade Research Database (FY2025)',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI VERDICT
// ─────────────────────────────────────────────────────────────────────────────
const verdictCache = {};
const CACHE_TTL    = 6 * 60 * 60 * 1000; // 6h

function getCached(ticker) {
  const c = verdictCache[ticker];
  if (!c || Date.now() - c.ts > CACHE_TTL) { delete verdictCache[ticker]; return null; }
  return c.data;
}
function setCache(ticker, data) { verdictCache[ticker] = { data, ts: Date.now() }; }

async function generateVerdict(s, macroContext) {
  const cached = getCached(s.ticker);
  if (cached) return { ...cached, cached: true };

  // Build banking-specific extra context so AI doesn't misread D/E
  const bankExtra = s.casaRatio
    ? `\nBANKING METRICS:\n• CASA Ratio: ${s.casaRatio} (higher = cheaper funding cost)\n• NPL Ratio: ${s.nplRatio} (lower = better loan quality)\n• IMPORTANT: D/E of ${s.debtToEquity} is deposit-funded — NORMAL for banks. Do NOT treat as leverage risk. Assess banks on CASA, NPL, ROE instead.`
    : '';

  const prompt = `You are a sharp, data-driven PSX equity analyst for Wall-Trade — Pakistan's AI markets intelligence platform for retail investors.

LIVE STOCK DATA: ${s.ticker} — ${s.name}
Sector: ${s.sector} | Industry: ${s.industry}
Live Price: PKR ${s.price ?? 'unavailable'} (${s.change ?? '?'}% today) | Source: ${s.priceSource}
Day Range: PKR ${s.low ?? '?'} – ${s.high ?? '?'} | Volume: ${s.volume ?? 'N/A'}
52-Week Range: PKR ${s.week52Low ?? '?'} – ${s.week52High ?? '?'}
Market Cap: ${s.marketCap}

VALUATION (FY2025):
P/E: ${s.pe}x | P/B: ${s.pb}x | EPS: PKR ${s.eps} | Dividend Yield: ${s.divYield}

PROFITABILITY:
ROE: ${s.roe} | ROA: ${s.roa} | Gross Margin: ${s.grossMargin} | Operating Margin: ${s.opMargin} | Net Margin: ${s.netMargin}
EBITDA: ${s.ebitda} | Revenue: ${s.revenue}

FINANCIAL HEALTH:
Current Ratio: ${s.currentRatio} | D/E: ${s.debtToEquity} | Total Cash: ${s.totalCash} | Total Debt: ${s.totalDebt} | FCF: ${s.fcf}${bankExtra}

GROWTH:
Revenue Growth: ${s.revenueGrowth} | Earnings Growth: ${s.earningsGrowth} | Beta: ${s.beta}

ANALYST NOTE: ${s.week52Note}

PAKISTAN MACRO:
${macroContext}

Return ONLY valid JSON (no markdown, no backticks, no extra text):
{
  "verdict": "Positive" or "Neutral" or "Caution",
  "score": <integer 1-10>,
  "headline": "<verdict word>: <one sharp specific reason, max 12 words>",
  "body": "<130-160 words. Confident verdict. Use REAL numbers from data. 2-3 key drivers. One clear risk. Pakistan macro connection. Short mobile-friendly paragraphs. No jargon. No buy/sell advice.>",
  "insights": [
    {"icon":"<emoji>","value":"<specific metric>","label":"<plain English, max 10 words>","color":"green"},
    {"icon":"<emoji>","value":"<specific metric>","label":"<plain English, max 10 words>","color":"green"},
    {"icon":"<emoji>","value":"<risk or caution>","label":"<plain English, max 10 words>","color":"amber"}
  ],
  "signals": [
    {"label":"<2-3 word signal>","type":"green"},
    {"label":"<2-3 word signal>","type":"amber"},
    {"label":"<2-3 word signal>","type":"purple"}
  ],
  "scores": {
    "Financial health": <1-10>,
    "Macro environment": <1-10>,
    "Growth outlook": <1-10>,
    "Risk level": <1-10>
  },
  "factors": [
    {"icon":"<emoji>","title":"<max 6 words>","detail":"<2-3 sentences. Specific, Pakistan-relevant, plain English.>"},
    {"icon":"<emoji>","title":"<max 6 words>","detail":"<2-3 sentences. Specific, Pakistan-relevant, plain English.>"},
    {"icon":"<emoji>","title":"<max 6 words>","detail":"<2-3 sentences. Specific, Pakistan-relevant, plain English.>"}
  ],
  "summary": "<one concise sentence overall verdict>"
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: 'You are a senior PSX equity analyst. Base analysis strictly on the numbers provided. Be specific — cite the actual figures. Return only valid JSON.',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON found in response');
    const verdict = JSON.parse(m[0]);
    setCache(s.ticker, verdict);
    console.log(`[stock] ${s.ticker} verdict: ${verdict.verdict} (${verdict.score}/10)`);
    return verdict;
  } catch(e) {
    console.error('[stock] AI error:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
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
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const { ticker, macroContext } = payload;
  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker symbol' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  console.log(`[stock] Request: ${cleanTicker}`);

  const stockData = await getStockData(cleanTicker);
  if (!stockData) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `${cleanTicker} not found. Check the symbol or try: OGDC, HBL, MCB, LUCK, ENGROH, FFC` })
    };
  }

  if (!stockData.price) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: `Live price for ${cleanTicker} is temporarily unavailable. PSX Terminal may be closed or blocking. Try again shortly.` })
    };
  }

  const verdict = await generateVerdict(stockData, macroContext || '');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ stockData, verdict, timestamp: new Date().toISOString() })
  };
};
