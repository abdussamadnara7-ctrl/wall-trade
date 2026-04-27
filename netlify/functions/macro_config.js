// ── WALL-TRADE MACRO CONFIG ────────────────────────────────────
// UPDATE THIS BLOCK whenever macro conditions change.
// This is the ONLY place you need to edit for macro updates.
// Last updated: April 2026

const MACRO_CONFIG = {

  // ── SBP MONETARY POLICY ──────────────────────────────────────
  // Update after every MPC meeting
 sbp: {
  policyRate:        '11.50',
  ceiling:           '12.50',
  floor:             '10.50',
  lastDecision:      'HIKE',
  lastMoveBps:       100,
  nextMPCDate:       'June 2026',
  trend:             'Surprise hawkish hike — 100bps increase to 11.50% on April 27 2026. Reversal of easing cycle.',
  marketExpectation: 'Market now pricing in rate staying elevated. Negative for rate sensitive sectors near term.',
},

  // ── PKR / EXCHANGE RATE ───────────────────────────────────────
  // Approximate — live rate comes from FMP in prices.js
  pkr: {
    usdRate:        '278-282',   // approximate interbank range
    trend:          'Relatively stable after 2023 depreciation',
    sbpManagement:  'SBP managed float — intervening to limit volatility',
  },

  // ── INFLATION ─────────────────────────────────────────────────
  cpi: {
    current:        '8-10',    // % — update monthly after PBS release
    peak:           '38',      // % — 2023 peak
    trend:          'Sharp disinflation underway',
    target:         '5-7',     // SBP medium term target
  },

  // ── IMF PROGRAMME ─────────────────────────────────────────────
  imf: {
    status:         'ACTIVE',  // 'ACTIVE' | 'SUSPENDED' | 'COMPLETED'
    programmeType:  'EFF',     // Extended Fund Facility
    duration:       '37 months',
    keyConditions:  'Energy pricing reforms, circular debt reduction, DISCO privatisation, cost-reflective tariffs',
    nextReview:     'Q2 2026',
    risk:           'LOW',     // 'LOW' | 'MEDIUM' | 'HIGH'
  },

  // ── EXTERNAL SECTOR ───────────────────────────────────────────
  external: {
    currentAccount: 'Near-balanced or slight surplus',
    fxReserves:     '~$15B+',  // Update monthly
    trend:          'Recovering after 2023 crisis lows',
  },

  // ── ENERGY / CIRCULAR DEBT ────────────────────────────────────
  energy: {
    circularDebt:   'Rs. 2.3tn+',
    status:         'Structurally problematic — slow progress on reduction',
    discoPrivatisation: 'Ongoing — IMF condition',
  },

  // ── GEOPOLITICAL ──────────────────────────────────────────────
  geopolitical: {
    iranUSTensions: 'ELEVATED',  // 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL'
    hormuzRisk:     'OIL SUPPLY RISK — Strait of Hormuz closure would spike Brent and PKR import costs',
    chinaRelations: 'STABLE — CPEC Phase 2 ongoing',
    indiaRelations: 'TENSE',   // Update as needed
    globalRisk:     'Fed higher-for-longer, USD strength, China slowdown — all weigh on EMs',
  },

  // ── PSX MARKET ────────────────────────────────────────────────
  psx: {
    kse100Status:   'At record highs',
    driver:         'Market re-rating on macro stabilisation + aggressive rate cuts',
    outlook:        'Positive — further rate cuts and IMF stability supportive',
    peRatio:        'Still cheap vs regional peers despite rally',
  },

  // ── PSDP / FISCAL ─────────────────────────────────────────────
  fiscal: {
    psdpStatus:     'Recovering as fiscal space improves with lower interest burden',
    deficitTrend:   'Improving — primary surplus achieved',
    keyRisk:        'Revenue shortfall, energy subsidies creeping back',
  },

};

// ── BUILD MACRO CONTEXT STRING FOR AI PROMPTS ─────────────────
// This is what gets passed into every Claude prompt
function buildStaticMacroContext() {
  const s = MACRO_CONFIG.sbp;
  const rateChange = s.lastDecision === 'CUT'
    ? `JUST CUT by ${Math.abs(s.lastMoveBps)}bps to ${s.policyRate}% — RATE SENSITIVE VERDICTS SHOULD REFLECT THIS`
    : s.lastDecision === 'HIKE'
    ? `JUST HIKED by ${s.lastMoveBps}bps to ${s.policyRate}% — RATE SENSITIVE VERDICTS SHOULD REFLECT THIS`
    : `HELD at ${s.policyRate}%`;

  return [
    `SBP Policy Rate: ${s.policyRate}% p.a. (${rateChange})`,
    `SBP Ceiling: ${s.ceiling}% | Floor: ${s.floor}%`,
    `Monetary Policy Trend: ${s.trend}`,
    `Market Rate Expectation: ${s.marketExpectation}`,
    `Next MPC Meeting: ${s.nextMPCDate}`,
    `PKR/USD: ${MACRO_CONFIG.pkr.usdRate} — ${MACRO_CONFIG.pkr.trend}`,
    `CPI Inflation: ~${MACRO_CONFIG.cpi.current}% (down from ${MACRO_CONFIG.cpi.peak}% peak) — ${MACRO_CONFIG.cpi.trend}`,
    `IMF EFF Programme: ${MACRO_CONFIG.imf.status} — ${MACRO_CONFIG.imf.keyConditions}. Next review: ${MACRO_CONFIG.imf.nextReview}`,
    `Current Account: ${MACRO_CONFIG.external.currentAccount} | FX Reserves: ${MACRO_CONFIG.external.fxReserves}`,
    `Circular Debt: ${MACRO_CONFIG.energy.circularDebt} — ${MACRO_CONFIG.energy.status}`,
    `PSX KSE-100: ${MACRO_CONFIG.psx.kse100Status} — ${MACRO_CONFIG.psx.driver}`,
    `PSDP: ${MACRO_CONFIG.fiscal.psdpStatus}`,
    `Geopolitical: Iran-US tensions ${MACRO_CONFIG.geopolitical.iranUSTensions} — ${MACRO_CONFIG.geopolitical.hormuzRisk}`,
    `Global Risk: ${MACRO_CONFIG.geopolitical.globalRisk}`,
    `Key Risks: Oil price spike, IMF slippage, political instability, rupee vulnerability`,
  ].join('. ');
}

module.exports = { MACRO_CONFIG, buildStaticMacroContext };
