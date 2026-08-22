// src/components/MarketDynamics.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';
import { Network, ArrowRight, TrendingUp, TrendingDown, Users, Clock, Signal } from 'lucide-react';

// Accurate, sourced market-relationship reference.
// Each entry: driver → affects → mechanism → trend → helps → hurts → cross-asset signal.
// Prices/levels cited as of Aug 2026 from public sources (RBI, Reuters, Univest).
const DYNAMICS = [
  {
    id: 'usd-inr',
    title: 'USD / INR Exchange Rate',
    icon: '₹',
    color: 'text-blue-500',
    affects: 'Every USD-priced asset held by an Indian investor — US stocks, crypto, gold, crude oil, international ETFs.',
    how: 'If you own Bitcoin at $60,000 and USD/INR moves from ₹83 to ₹95, your holding rises from ~₹49.8L to ~₹57L in INR — even if BTC didn\'t move. That\'s a ~14.5% INR gain purely from currency. Strong USD = Indian investors gain on USD-denominated assets; weak USD = the opposite.',
    trend: 'INR has depreciated over the long term — RBI annual averages were ~₹45.73 (2010) and ~₹74.10 (2020). In 2026, the rupee crossed ₹95/USD (Reuters, Mar 2026) and has traded around ₹95.7. This is not just about inflation differentials — oil prices, capital flows, interest-rate gaps, trade balance, USD strength globally, and RBI intervention all drive it. In 2026, high crude is pressuring INR while RBI intervention limits the decline (Reuters, Aug 2026).',
    helps: 'Exporters (TCS, Infosys — earn USD, spend INR), NRIs remitting money home, Indian holders of US stocks/crypto/gold priced in USD.',
    hurts: 'Importers (oil, electronics, machinery), students studying abroad, travellers, anyone paid in INR buying USD goods.',
    signal: 'USD/INR ↑ + Crude ↑ → India inflation risk ↑ → RBI rate-hold pressure → rate-sensitive stocks (real estate, autos) vulnerable',
  },
  {
    id: 'crude-oil',
    title: 'Crude Oil (Brent)',
    icon: '🛢️',
    color: 'text-amber-500',
    affects: 'Inflation, INR strength, transport costs, airlines, paints, chemicals, OMCs, interest-rate trajectory.',
    how: 'India imports the vast majority of its crude. Higher oil → larger import bill → trade deficit widens → INR weakens → imported inflation → RBI may hold or hike rates → home/auto loans stay costly → rate-sensitive stocks pressured. Brent was ~$93.8/bbl on Aug 21, 2026, driven by geopolitical/supply-disruption concerns (Univest).',
    trend: 'Geopolitical shocks spike oil (Russia-Ukraine 2022 → ~$130/bbl). OPEC+ supply cuts support floors. US shale + EV adoption cap long-term upside. In 2026, Iran supply-disruption fears are adding a risk premium (Reuters, Aug 2026).',
    helps: 'Upstream oil producers (ONGC, Oil India), some energy majors, oil-services companies when prices rise.',
    hurts: 'Airlines (fuel ≈ 30–40% of costs), transport-intensive businesses, paint/chemical companies (crude derivatives = raw material), consumers (petrol/diesel, inflation), holders of INR.',
    signal: 'Oil ↑ + INR ↓ → India inflation risk ↑ → RBI rate-cut delay → Indian equities face margin + valuation pressure',
  },
  {
    id: 'gold',
    title: 'Gold Prices',
    icon: '🥇',
    color: 'text-yellow-500',
    affects: 'INR (India is among the top gold importers), jewellery stocks (Titan, Kalyan), equity sentiment, safe-haven flows.',
    how: 'Gold is the classic safe haven — it rises on fear (wars, recessions, banking stress) and when real interest rates fall. It typically moves inversely to the USD. India\'s seasonal demand (weddings, Diwali, Akshaya Tritiya) can lift global prices. For Indian investors, INR depreciation makes gold costlier locally even when the global price is flat.',
    trend: 'Gold rallies in crises — 2008, 2020, 2022–2023 bank failures. It underperforms in strong-growth, high-rate eras. In 2026, gold has remained supported by geopolitical risk and central-bank buying.',
    helps: 'Gold ETFs, jewellery stocks, investors seeking a crisis hedge or inflation protection, central banks diversifying reserves.',
    hurts: 'Equity investors — gold rising often signals risk-off sentiment and equities falling. Opportunity cost when stocks are booming.',
    signal: 'Gold ↑ + USD ↑ → Risk-off regime → Equity outflows likely → Defensive sectors (FMCG, pharma) outperform cyclicals',
  },
  {
    id: 'fed-rates',
    title: 'US Federal Reserve Rates',
    icon: '🏛️',
    color: 'text-indigo-500',
    affects: 'Foreign capital flows into India (FII/FPI), INR, IT stocks, crypto, gold, emerging-market equities, global risk appetite.',
    how: 'When the Fed hikes, US yields rise → global capital leaves riskier emerging markets like India for safe US bonds → INR weakens and Nifty drops. Indian IT firms benefit because they bill in USD. Crypto and gold often fall (risk-off, higher opportunity cost). When the Fed cuts, the reverse: capital flows back into EMs, INR strengthens, risk assets rally.',
    trend: '2022–23 Fed hiking cycle (0.25% → 5.5%) saw record FII outflows, INR hitting ₹83, Nifty correction. 2024 pivot to cuts reversed flows into EM equities. In 2026, Fed policy stance continues to drive FII flows into/out of India (Reuters, Aug 2026).',
    helps: 'IT services (exporters) in hiking cycles, USD-cash holders, US Treasury investors.',
    hurts: 'Emerging-market equity investors, Indian corporates with forex debt, crypto and risk-asset holders during hiking cycles.',
    signal: 'Fed hawkish + Oil ↑ → FII outflows from India → INR ↓ + Nifty ↓ → IT sector relatively insulated (USD revenue)',
  },
  {
    id: 'rbi-repo',
    title: 'RBI Repo Rate',
    icon: '🏦',
    color: 'text-emerald-500',
    affects: 'Home/auto/personal loan EMIs, banks & NBFCs, real estate, autos, bond yields, fixed deposits, equity valuations.',
    how: 'RBI hikes repo → banks raise lending rates → EMIs rise → home and car sales slow → bank NPA risk rises. Bond prices fall (yields rise). Fixed deposits become more attractive, pulling money from equities. When RBI cuts, the reverse: cheaper credit stimulates borrowing, spending, and rate-sensitive stocks.',
    trend: 'RBI hiked from 4.0% (May 2022) to 6.5% (Feb 2023) to curb inflation, then held. Each 0.25% hike adds ~₹1,500 per ₹1L to annual home-loan interest. In 2026, high crude is keeping RBI in a rate-hold stance despite growth concerns (Reuters, Aug 2026).',
    helps: 'Savers and FD holders (higher interest), banks\' net interest margins (initially), fixed-income investors.',
    hurts: 'Borrowers (home/auto/personal loans), real estate and auto sales, rate-sensitive stocks, bondholders (price falls).',
    signal: 'RBI on hold + Crude ↑ → Rate-cut delay → Real estate/auto stocks stay pressured → Financials mixed (NIM stable, credit growth slow)',
  },
  {
    id: 'crypto-tech',
    title: 'Crypto ↔ Tech Stocks Correlation',
    icon: '₿',
    color: 'text-orange-500',
    affects: 'Bitcoin and major cryptos move increasingly with the Nasdaq / tech-heavy indices, especially in stress periods.',
    how: 'Both are "risk-on" assets that thrive on cheap liquidity. When rates are low and money is loose, both rally. When liquidity tightens or panic hits, both sell off together. The idea that crypto is an "uncorrelated hedge" mostly fails in serious crashes — correlation spikes precisely when diversification matters most.',
    trend: '2020–21: low rates → BTC and Nasdaq both surged. 2022: hikes → BTC fell ~65%, Nasdaq ~33%. 2023–24: AI rally + rate-pause → both recovered. Correlation is highest during market stress, lower in calm periods.',
    helps: 'Diversified investors who understand the correlation — using it to size positions, not chase a "hedge".',
    hurts: 'Anyone treating crypto as a safe-hedge during a stock crash — both often fall together, amplifying losses.',
    signal: 'Nasdaq ↓ + Liquidity tightening → BTC likely ↓ → Risk-off across crypto + growth tech → Defensive rotation (utilities, staples)',
  },
  {
    id: 'inflation',
    title: 'Inflation (CPI)',
    icon: '📈',
    color: 'text-red-500',
    affects: 'Purchasing power, RBI policy, equity valuations, bond yields, real wages, consumer spending, sector rotation.',
    how: 'High inflation → RBI hikes to cool demand → equity valuations compress (P/E falls) → stocks drop. Companies that can pass on costs (FMCG, cement) survive; those that can\'t (utilities, airlines) get squeezed. Real (inflation-adjusted) returns matter more than nominal. Food and fuel are the most volatile components in India\'s CPI.',
    trend: 'RBI\'s tolerance band is 2–6% CPI. Sustained >6% triggers rate action. In 2026, crude-driven imported inflation is keeping CPI elevated, preventing rate cuts despite slowing growth (Reuters, Aug 2026).',
    helps: 'Real assets (gold, real estate, commodities), producers with pricing power, borrowers with fixed-rate debt (pay back in cheaper rupees).',
    hurts: 'Fixed-income savers, salaried workers without inflation-linked raises, consumers, bondholders, rate-sensitive sectors.',
    signal: 'CPI >6% + Crude ↑ → RBI forced to hold rates → Stagflation risk → Equity valuations compress, defensive sectors preferred',
  },
];

const Row = ({ icon, label, value, valueClass = '' }) => (
  <div className="flex gap-3">
    <span className="flex items-center gap-1.5 text-muted-foreground shrink-0 w-28 text-xs pt-0.5">
      {icon}
      {label}
    </span>
    <span className={`text-sm leading-relaxed ${valueClass}`}>{value}</span>
  </div>
);

export default function MarketDynamics() {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          How Markets Influence Each Other
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Real relationships that move your money. Tap any driver to see what it affects, how, the historical trend, who it helps or hurts, and the cross-asset signal.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {DYNAMICS.map(d => (
            <AccordionItem key={d.id} value={d.id}>
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-left">
                  <span className={`text-lg ${d.color}`}>{d.icon}</span>
                  <span className="font-semibold">{d.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-1">
                  <Row icon={<ArrowRight className="w-3 h-3" />} label="Affects" value={d.affects} />
                  <Row icon={<Network className="w-3 h-3" />} label="How" value={d.how} />
                  <Row icon={<Clock className="w-3 h-3" />} label="Trend" value={d.trend} />
                  <Row icon={<Users className="w-3 h-3" />} label="Helps" value={d.helps} valueClass="text-emerald-600 dark:text-emerald-400" />
                  <Row icon={<Users className="w-3 h-3" />} label="Hurts" value={d.hurts} valueClass="text-rose-600 dark:text-rose-400" />
                  <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                    <span className="flex items-center gap-1.5 text-primary shrink-0 w-28 text-xs pt-0.5">
                      <Signal className="w-3 h-3" />
                      Signal
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-primary p-2 rounded-lg bg-primary/10 border border-primary/20">{d.signal}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
          <TrendingDown className="w-3 h-3 mt-0.5 shrink-0" />
          Educational reference based on real economic relationships and public sources (RBI, Reuters). Not financial advice. Prices cited as of Aug 2026.
        </p>
      </CardContent>
    </Card>
  );
}
