const https = require('https');

// ── SECTOR MAP — KSE-100 COMPLETE ─────────────────────────────
const SECTOR_MAP = {
  // Banking
  HBL:'BANKING', MCB:'BANKING', UBL:'BANKING', NBP:'BANKING',
  MEBL:'BANKING', BAFL:'BANKING', ABL:'BANKING', FABL:'BANKING',
  BAHL:'BANKING', AKBL:'BANKING', BOP:'BANKING', SNBL:'BANKING',
  // E&P
  OGDC:'ENERGY_EP', PPL:'ENERGY_EP', MARI:'ENERGY_EP', POL:'ENERGY_EP',
  // OMC
  PSO:'OMC', APL:'OMC', SHEL:'OMC', HASCOL:'OMC',
  // Fertilizer
  FFC:'FERTILISER', EFERT:'FERTILISER', FATIMA:'FERTILISER', FFBL:'FERTILISER',
  // Cement
  LUCK:'CEMENT', DGKC:'CEMENT', MLCF:'CEMENT', CHCC:'CEMENT',
  FCCL:'CEMENT', PIOC:'CEMENT', KOHC:'CEMENT', ACPL:'CEMENT', POWER:'CEMENT',
  // Power
  HUBC:'POWER', KEL:'POWER', KAPCO:'POWER', NPL:'POWER',
  NCPL:'POWER', PKGP:'POWER',
  // Technology / Telecom
  SYS:'TECH', TRG:'TECH', PTC:'TECH', AIRLINK:'TECH', AVN:'TECH', NETSOL:'TECH',
  // Auto & Engineering
  INDU:'AUTO', HCAR:'AUTO', PSMC:'AUTO', GHNL:'AUTO',
  SAZEW:'AUTO', MTL:'AUTO', AGTL:'AUTO',
  // Consumer / Food
  NESTLE:'CONSUMER', UNITY:'CONSUMER', NATF:'CONSUMER',
  MUREB:'CONSUMER', COLG:'CONSUMER',
  // Textile
  ILP:'TEXTILE', NML:'TEXTILE', GATM:'TEXTILE', KTML:'TEXTILE', SAPT:'TEXTILE',
  // Holding / Diversified
  ENGROH:'HOLDING', DAWH:'HOLDING',
  // Chemicals / Industrial
  EPCL:'CHEMICALS', LOTCHEM:'CHEMICALS', SNGP:'CHEMICALS', SSGC:'CHEMICALS',
  // Insurance / Financial
  EFUG:'INSURANCE', EFUL:'INSURANCE', JGICL:'INSURANCE',
  // Pharma
  SEARL:'PHARMA', AGP:'PHARMA', GLAXO:'PHARMA', ABOT:'PHARMA',
  // Steel / Materials
  MUGHAL:'STEEL', ASTL:'STEEL', ISL:'STEEL', ASL:'STEEL',
  // Logistics
  PIBTL:'LOGISTICS',
  // Aviation
  PIAA:'AVIATION',
  // Media
  HUMNL:'MEDIA',
};

// ── SECTOR-SPECIFIC EXTRACTION PROMPTS ────────────────────────
const SECTOR_PROMPTS = {

  BANKING: `Extract these fields from this Pakistani bank quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period — annualise if quarterly (multiply by 4), state basis
- dps: dividend per share declared this period
- roe: return on equity — annualise if quarterly
- roa: return on assets — annualise if quarterly
- netProfit: net profit with units e.g. "PKR 16.1B"

BALANCE SHEET QUALITY:
- deposits: total deposits with units
- totalAssets: total assets with units  
- advances: total advances/loans with units
- investments: investment book with units
- casaRatio: CASA ratio percentage
- carRatio: Capital Adequacy Ratio percentage
- cet1Ratio: CET1 ratio percentage
- nplRatio: NPL or infection ratio percentage
- coverageRatio: provision coverage ratio percentage
- bvps: book value per share

INCOME QUALITY:
- netInterestIncome: NII with units
- provisioning: total provisioning charge with units
- costToIncome: cost-to-income ratio percentage

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: profit drivers and YoY change with exact numbers, NIM direction, asset quality (NPL trend), CASA strength, one key risk or opportunity. Must include actual PKR figures.`,

  ENERGY_EP: `Extract these fields from this Pakistani E&P company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period — state if 9M, quarterly or annual
- dps: dividend per share declared
- roe: return on equity percentage
- netMargin: net profit margin percentage
- revenue: total revenue with units
- netProfit: net profit with units
- operatingCashFlow: OCF with units if disclosed
- totalCash: cash and equivalents

PRODUCTION & RESERVES:
- productionOil: oil production rate if mentioned e.g. "32,000 bbl/day"
- productionGas: gas production if mentioned e.g. "648 MMcfd"
- discoveries: number of new discoveries if mentioned
- circularDebt: trade receivables / circular debt exposure with units

COST & CAPEX:
- capex: capital expenditure with units if disclosed
- liftingCost: lifting cost per barrel if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: revenue and profit drivers, YoY change with exact numbers, circular debt situation, production performance, one key project or catalyst (Reko Diq/offshore etc). Must be specific.`,

  OMC: `Extract these fields from this Pakistani OMC quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- netMargin: net profit margin percentage — note if unusually high/low due to inventory gains/losses
- grossMargin: gross profit margin percentage
- revenue: total revenue with units
- netProfit: net profit with units

BALANCE SHEET:
- currentRatio: current ratio
- debtToEquity: debt to equity ratio
- tradeDebts: receivables / circular debt with units
- inventory: inventory value with units
- financeCost: finance cost with units

OPERATIONAL:
- retailOutlets: number of retail outlets if mentioned
- fuelVolumes: volumes sold if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: profit drivers (inventory gains/losses explicitly flagged), receivables situation, YoY change with exact numbers, margin quality, one key risk or development. Flag if HASCOL — highlight going concern or turnaround progress.`,

  FERTILISER: `Extract these fields from this Pakistani fertilizer company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share declared — VERY IMPORTANT
- roe: return on equity percentage
- grossMargin: gross profit margin percentage
- netMargin: net profit margin percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- ureaOfftake: urea sales volume if mentioned e.g. "601 KT"
- ureaMarketShare: urea market share percentage
- dapMarketShare: DAP market share percentage
- inventory: inventory level if mentioned
- gasFeedstockCost: gas cost or any feedstock cost mention
- investmentIncome: other income / investment income with units

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: revenue and profit drivers, urea volumes and pricing, dividend sustainability (MOST IMPORTANT for fertilizer), gas feedstock situation, YoY comparison with exact numbers.`,

  CEMENT: `Extract these fields from this Pakistani cement company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- grossMargin: gross profit margin — MOST IMPORTANT
- netMargin: net profit margin percentage
- roe: return on equity percentage
- debtToEquity: debt to equity ratio — IMPORTANT
- revenue: total revenue with units
- netProfit: net profit with units

OPERATIONAL:
- capacityUtilization: capacity utilization percentage
- domesticVolume: domestic dispatches/sales volume
- exportVolume: export dispatches/sales volume
- domesticSalesGrowth: YoY domestic volume growth percentage
- exportSalesGrowth: YoY export volume growth percentage
- coalCost: coal cost mention if any
- financeCost: finance cost with units
- longTermLoans: long term debt with units
- retentionPrice: retention price per bag if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: margin drivers (coal cost impact), volume performance domestic vs export, finance cost trend, YoY comparison with exact numbers, one key risk or catalyst (PSDP/housing/debt).`,

  POWER: `Extract these fields from this Pakistani power company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share declared
- roe: return on equity percentage
- netMargin: net profit margin percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio
- operatingCashFlow: OCF with units

OPERATIONAL:
- capacityPayments: capacity payments received with units
- receivables: receivables / circular debt with units
- financeCost: finance cost with units
- plantAvailability: plant availability factor percentage if mentioned
- fuelCost: fuel cost with units if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: revenue and profit drivers, circular debt/receivables situation (critical for power sector), capacity payments, YoY comparison with exact numbers, one key risk.`,

  TECH: `Extract these fields from this Pakistani tech/telecom company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- roe: return on equity percentage
- grossMargin: gross profit margin percentage
- netMargin: net profit margin percentage
- ebitdaMargin: EBITDA margin percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio
- totalCash: cash position with units

GROWTH:
- revenueGrowth: YoY revenue growth percentage
- exportRevenue: export/USD revenue percentage or amount
- headcount: employee count if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: revenue growth drivers (USD vs PKR split), margin trend, client concentration if mentioned, PKR impact on earnings, YoY comparison with exact numbers.`,

  AUTO: `Extract these fields from this Pakistani auto company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- grossMargin: gross profit margin percentage
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- salesVolume: units sold this period
- salesVolumeGrowth: YoY volume growth percentage
- inventory: inventory levels if mentioned
- localContentRatio: local content percentage if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: volume trends and YoY comparison, margin drivers (localisation/FX impact), demand environment, one key risk (interest rates/FX/competition).`,

  CONSUMER: `Extract these fields from this Pakistani consumer/food company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- grossMargin: gross profit margin — MOST IMPORTANT
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- revenueGrowth: YoY revenue growth percentage
- volumeGrowth: volume growth if mentioned
- inventoryTurnover: inventory turnover if mentioned
- rawMaterialCost: raw material cost trend if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: revenue and volume growth, gross margin trend (pricing power vs input costs), YoY comparison with exact numbers, one key risk (commodity prices/competition/FX).`,

  TEXTILE: `Extract these fields from this Pakistani textile company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- grossMargin: gross profit margin percentage
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio — IMPORTANT
- financeCost: finance cost with units

OPERATIONAL:
- exportRevenue: export revenue amount or percentage
- exportGrowth: YoY export growth percentage
- inventory: inventory value if mentioned
- capacityUtilization: capacity utilization if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: export revenue trend, margin drivers (energy costs/FX benefit), finance cost burden, YoY comparison with exact numbers, one key catalyst or risk.`,

  HOLDING: `Extract these fields from this Pakistani holding/conglomerate quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share declared
- roe: return on equity percentage
- netMargin: net profit margin percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio
- totalAssets: total assets with units

SUBSIDIARY PERFORMANCE:
- dividendIncome: dividend income from subsidiaries with units
- segmentContribution: key segment contributions if mentioned
- keySubsidiary: most important subsidiary and its performance

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: key subsidiaries driving performance, dividend income from holdings, sum-of-parts value note, YoY comparison with exact numbers. Note: always evaluate as holding company not single-sector business.`,

  CHEMICALS: `Extract these fields from this Pakistani chemicals/industrial/gas company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- grossMargin: gross profit margin percentage
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- capacityUtilization: plant utilization if mentioned
- financeCost: finance cost with units
- rawMaterialCost: key input cost if mentioned
- receivables: receivables/circular debt if applicable

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: revenue and profit drivers, margin trend, any circular debt exposure (for gas utilities), YoY comparison with exact numbers, one key risk or catalyst.`,

  INSURANCE: `Extract these fields from this Pakistani insurance company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- roe: return on equity percentage
- netProfit: net profit with units
- investmentIncome: investment income with units

INSURANCE METRICS:
- netPremium: net premium revenue with units
- premiumGrowth: YoY premium growth percentage
- claimsRatio: claims ratio or loss ratio percentage
- combinedRatio: combined ratio percentage if mentioned
- solvencyRatio: solvency ratio if mentioned
- underwritingProfit: underwriting profit/loss with units

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: premium growth, claims experience, investment income performance, solvency position, YoY comparison with exact numbers.`,

  PHARMA: `Extract these fields from this Pakistani pharma company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- grossMargin: gross profit margin percentage — IMPORTANT
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- revenueGrowth: YoY revenue growth percentage
- exportRevenue: export revenue if mentioned
- localSales: local market sales if broken out
- rawMaterialCost: API/raw material cost trend if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: revenue and margin drivers, pricing environment (DRAP regulations), export vs local mix, YoY comparison with exact numbers, one key risk.`,

  STEEL: `Extract these fields from this Pakistani steel/materials company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- grossMargin: gross profit margin percentage
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio — IMPORTANT
- financeCost: finance cost with units

OPERATIONAL:
- capacityUtilization: production capacity utilization percentage
- salesVolume: volume sold in tons if mentioned
- rawMaterialCost: scrap/iron ore cost if mentioned
- revenueGrowth: YoY revenue growth percentage

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: volume and revenue drivers, margin trend (raw material cost impact), leverage situation, construction sector demand link, YoY comparison with exact numbers.`,

  LOGISTICS: `Extract these fields from this Pakistani logistics/port company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- cargoThroughput: cargo volume handled if mentioned
- capacityUtilization: berth/terminal utilization
- revenueGrowth: YoY revenue growth

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: throughput trends, revenue drivers, margin performance, trade volume link to Pakistan economy, YoY comparison with exact numbers.`,

  AVIATION: `Extract these fields from this Pakistani aviation company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- netMargin: net profit margin percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- loadFactor: passenger load factor percentage
- revenuePerSeat: revenue per seat or yield if mentioned
- fuelCostRatio: fuel cost as percentage of revenue
- fleetSize: number of aircraft if mentioned
- passengerGrowth: YoY passenger growth

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: load factor and yield trends, fuel cost impact, route performance, financial stress level, YoY comparison with exact numbers.`,

  MEDIA: `Extract these fields from this Pakistani media company quarterly report:

VALUATION & EARNINGS:
- eps: EPS this period
- dps: dividend per share if declared
- netMargin: net profit margin percentage
- roe: return on equity percentage
- revenue: total revenue with units
- netProfit: net profit with units
- debtToEquity: debt to equity ratio

OPERATIONAL:
- advertisingRevenue: advertising revenue with units or as percentage
- revenueGrowth: YoY revenue growth percentage
- contentCost: content/programming cost if mentioned

MICRO ANALYSIS:
- aiSummary: 4-5 sentence analysis covering: advertising market conditions, revenue trend, margin drivers, digital vs traditional split if mentioned, YoY comparison with exact numbers.`,
};

// ── BUILD EXTRACTION PROMPT ────────────────────────────────────
function getExtractionPrompt(ticker, sector) {
  const sectorPrompt = SECTOR_PROMPTS[sector] || SECTOR_PROMPTS.CHEMICALS;

  return `You are extracting financial data from a Pakistani company quarterly report for the Wall-Trade stock analysis platform.

TICKER: ${ticker}
SECTOR: ${sector}

First identify the reporting period (e.g. "Q1 FY26", "9M FY26", "H1 FY26").

${sectorPrompt}

EXTRACTION RULES:
- If a value is not found in the document, use null — never invent numbers
- Monetary values must include units: "PKR 16.1B" or "PKR 530M"
- Percentages must include % sign: "38.4%"
- Plain ratios as numbers only: "1.27"
- EPS and DPS as plain numbers: "22.48"
- aiSummary must be one continuous string — no line breaks, no bullet points
- Always compare to prior year period where data is available

Return ONLY valid JSON with no markdown or explanation:
{
  "period": "Q1 FY26",
  "eps": null,
  "dps": null,
  "roe": null,
  "roa": null,
  "netMargin": null,
  "grossMargin": null,
  "ebitdaMargin": null,
  "revenue": null,
  "netProfit": null,
  "totalAssets": null,
  "deposits": null,
  "advances": null,
  "investments": null,
  "casaRatio": null,
  "carRatio": null,
  "cet1Ratio": null,
  "nplRatio": null,
  "coverageRatio": null,
  "bvps": null,
  "netInterestIncome": null,
  "provisioning": null,
  "costToIncome": null,
  "tradeDebts": null,
  "totalCash": null,
  "currentRatio": null,
  "debtToEquity": null,
  "financeCost": null,
  "operatingCashFlow": null,
  "capex": null,
  "circularDebt": null,
  "productionOil": null,
  "productionGas": null,
  "discoveries": null,
  "ureaOfftake": null,
  "ureaMarketShare": null,
  "dapMarketShare": null,
  "investmentIncome": null,
  "capacityUtilization": null,
  "domesticSalesGrowth": null,
  "exportSalesGrowth": null,
  "longTermLoans": null,
  "receivables": null,
  "salesVolume": null,
  "revenueGrowth": null,
  "exportRevenue": null,
  "dividendIncome": null,
  "loadFactor": null,
  "combinedRatio": null,
  "netPremium": null,
  "dividend": null,
  "marketShare": null,
  "aiSummary": null
}`;
}

// ── ANTHROPIC CALL ─────────────────────────────────────────────
function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(data)
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

// ── GITHUB API ─────────────────────────────────────────────────
async function getGitHubFile() {
  const OWNER = process.env.GITHUB_OWNER;
  const REPO  = process.env.GITHUB_REPO;
  const PATH  = 'netlify/functions/stock.js';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path:     `/repos/${OWNER}/${REPO}/contents/${PATH}`,
      method:   'GET',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent':    'WallTrade-Admin/1.0',
        'Accept':        'application/vnd.github+json'
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function commitGitHubFile(content, sha, ticker, period) {
  const OWNER = process.env.GITHUB_OWNER;
  const REPO  = process.env.GITHUB_REPO;
  const PATH  = 'netlify/functions/stock.js';
  const body  = JSON.stringify({
    message: `Update ${ticker} fundamentals — ${period}`,
    content: Buffer.from(content).toString('base64'),
    sha
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path:     `/repos/${OWNER}/${REPO}/contents/${PATH}`,
      method:   'PUT',
      headers: {
        'Authorization':  `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent':     'WallTrade-Admin/1.0',
        'Accept':         'application/vnd.github+json',
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── UPDATE TICKER BLOCK IN stock.js ───────────────────────────
function updateTickerBlock(content, ticker, extracted) {
  const pattern = new RegExp(`(  ${ticker}:\\s*\\{)`);
  const startMatch = content.match(pattern);

  // If ticker not found — append new block to PSX_FUNDAMENTALS
  if (!startMatch) {
    const insertPoint = content.lastIndexOf('};') ;
    if (insertPoint === -1) return null;
    const newBlock = buildTickerBlock(ticker, extracted);
    return content.slice(0, insertPoint) + newBlock + ',\n\n' + content.slice(insertPoint);
  }

  const startIdx = content.indexOf(startMatch[0]);
  let depth = 0, endIdx = startIdx;
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
  }

  return content.slice(0, startIdx) + buildTickerBlock(ticker, extracted) + content.slice(endIdx);
}

function buildTickerBlock(ticker, e) {
  const safe = v => v != null ? v.toString().replace(/'/g, "\\'") : 'N/A';

  return `  ${ticker}: {
    eps:'${safe(e.eps)}', dps:'${safe(e.dps)}',
    netMargin:'${safe(e.netMargin)}', grossMargin:'${safe(e.grossMargin)}',
    roe:'${safe(e.roe)}', roa:'${safe(e.roa)}',
    revenue:'${safe(e.revenue)}', netProfit:'${safe(e.netProfit)}',
    totalAssets:'${safe(e.totalAssets)}', totalCash:'${safe(e.totalCash)}',
    deposits:'${safe(e.deposits)}', advances:'${safe(e.advances)}',
    investments:'${safe(e.investments)}',
    casaRatio:'${safe(e.casaRatio)}', carRatio:'${safe(e.carRatio)}',
    cet1Ratio:'${safe(e.cet1Ratio)}', nplRatio:'${safe(e.nplRatio)}',
    coverageRatio:'${safe(e.coverageRatio)}', bvps:'${safe(e.bvps)}',
    netInterestIncome:'${safe(e.netInterestIncome)}',
    provisioning:'${safe(e.provisioning)}', costToIncome:'${safe(e.costToIncome)}',
    tradeDebts:'${safe(e.tradeDebts)}', circularDebt:'${safe(e.circularDebt)}',
    currentRatio:'${safe(e.currentRatio)}', debtToEquity:'${safe(e.debtToEquity)}',
    financeCost:'${safe(e.financeCost)}', operatingCashFlow:'${safe(e.operatingCashFlow)}',
    capex:'${safe(e.capex)}',
    productionOil:'${safe(e.productionOil)}', productionGas:'${safe(e.productionGas)}',
    discoveries:'${safe(e.discoveries)}',
    ureaOfftake:'${safe(e.ureaOfftake)}', ureaMarketShare:'${safe(e.ureaMarketShare)}',
    dapMarketShare:'${safe(e.dapMarketShare)}', investmentIncome:'${safe(e.investmentIncome)}',
    capacityUtilization:'${safe(e.capacityUtilization)}',
    domesticSalesGrowth:'${safe(e.domesticSalesGrowth)}',
    exportSalesGrowth:'${safe(e.exportSalesGrowth)}',
    longTermLoans:'${safe(e.longTermLoans)}', receivables:'${safe(e.receivables)}',
    salesVolume:'${safe(e.salesVolume)}', revenueGrowth:'${safe(e.revenueGrowth)}',
    exportRevenue:'${safe(e.exportRevenue)}', dividendIncome:'${safe(e.dividendIncome)}',
    loadFactor:'${safe(e.loadFactor)}', combinedRatio:'${safe(e.combinedRatio)}',
    netPremium:'${safe(e.netPremium)}', marketShare:'${safe(e.marketShare)}',
    dividend:'${safe(e.dividend)}',
    aiSummary:'${safe(e.aiSummary)}',
    pe:'N/A', pb:'N/A', divYield:'N/A', fwdPe:'N/A',
    opMargin:'N/A', ebitdaMargin:'N/A', ebitda:'N/A',
    quickRatio:'N/A', totalDebt:'N/A', fcf:'N/A', fcfYield:'N/A',
    beta:'N/A', earningsGrowth:'N/A', marketCap:'N/A',
    ev_ebitda:'N/A', roic:'N/A', payoutRatio:'N/A', ps:'N/A', interestCover:'N/A',
  }`;
}

async function uploadToFilesAPI(base64Data) {
  return new Promise((resolve) => {
    const buffer = Buffer.from(base64Data, 'base64');
    const boundary = '----FormBoundary' + Date.now();
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="report.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, buffer, footer]);

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/files',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(b);
          resolve(parsed.id || null);
        } catch(e) { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
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
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let payload;
  try { payload = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON: ' + e.message }) }; }

  console.log('Extract called — ticker:', payload?.ticker, 'type:', payload?.type);

  const { ticker, type, data, mediaType, text } = payload;

  if (!ticker) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing ticker' }) };

  const cleanTicker = ticker.toUpperCase().trim();
  const sector = SECTOR_MAP[cleanTicker];
  if (!sector) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown ticker: ${cleanTicker}. Add it to SECTOR_MAP first.` }) };

  const extractionPrompt = getExtractionPrompt(cleanTicker, sector);

  // Build Claude message
  let messages;
if (type === 'pdf') {
    const fileId = await uploadToFilesAPI(data);
    if (!fileId) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to upload PDF to Anthropic Files API' }) };
    messages = [{ role: 'user', content: [
      { type: 'document', source: { type: 'file', file_id: fileId } },
      { type: 'text', text: extractionPrompt }
    ]}];
  } else if (type === 'image') {
    const fileId = await uploadToFilesAPI(data);
    if (!fileId) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to upload image to Anthropic Files API' }) };
    messages = [{ role: 'user', content: [
      { type: 'document', source: { type: 'file', file_id: fileId } },
      { type: 'text', text: extractionPrompt }
    ]}];
  } else if (type === 'text') {
    messages = [{ role: 'user', content: `${extractionPrompt}\n\nDOCUMENT TEXT:\n${text}` }];
  } else {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type. Must be pdf, image or text.' }) };
  }

  // Extract via Claude
  let extracted;
  try {
    const result = await callAnthropic({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      system:     'You are a financial data extraction specialist for Pakistani stock market quarterly reports. Extract all requested fields accurately. Return only valid JSON with no markdown.',
      messages
    });
    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    extracted = JSON.parse(raw);
  } catch(e) {
    console.error('Claude extraction error:', e.message, JSON.stringify(e));
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Extraction failed: ' + e.message }) };
  }

  // Get stock.js from GitHub
  let fileData;
  try {
    fileData = await getGitHubFile();
    if (!fileData.sha) throw new Error('Could not get file SHA: ' + JSON.stringify(fileData));
  } catch(e) {
    console.error('GitHub read error:', e.message, JSON.stringify(fileData));
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GitHub read failed: ' + e.message }) };
  }

  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');

  // Update ticker block
  const updatedContent = updateTickerBlock(currentContent, cleanTicker, extracted);
  if (!updatedContent) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Could not update ${cleanTicker} in stock.js` }) };
  }

  // Commit to GitHub
  try {
    const commitResult = await commitGitHubFile(
      updatedContent,
      fileData.sha,
      cleanTicker,
      extracted.period || 'latest quarter'
    );
    if (!commitResult.commit) throw new Error('Commit response missing: ' + JSON.stringify(commitResult));
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GitHub commit failed: ' + e.message }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success:  true,
      ticker:   cleanTicker,
      sector,
      period:   extracted.period,
      extracted,
      message:  `${cleanTicker} (${sector}) updated for ${extracted.period || 'latest quarter'}. Netlify deploys in ~60 seconds.`
    })
  };
};
