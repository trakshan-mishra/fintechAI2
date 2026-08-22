// src/components/MarketDynamics.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';
import { Network, ArrowRight, TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';

// Accurate, real-world market-relationship reference.
// Each entry: driver → what it affects → mechanism → historical trend → who it helps/hurts.
const DYNAMICS = [
  {
    id: 'usd-inr',
    title: 'USD / INR Exchange Rate',
    icon: '₹',
    color: 'text-blue-500',
    affects: 'Every USD-priced asset held by an Indian investor — US stocks, crypto, gold, crude oil.',
    how: 'If you own Bitcoin at $60,000 and USD/INR moves from ₹83 to ₹95, your holding rises from ₹49.8L to ₹57L in INR — even though BTC didn\'t move. Strong USD = Indian investors gain on USD assets; weak USD = the opposite.',
    trend: 'INR has depreciated steadily over decades — ~₹45 (2010) → ~₹75 (2020) → ~₹95 (2026). A structural, one-directional drift driven by India\'s inflation being higher than the US.',
    helps: 'Exporters (TCS, Infosys — earn USD, spend INR), NRIs remitting money home, Indian holders of US stocks/crypto.',
    hurts: 'Importers (oil, electronics, machinery), students studying abroad, travellers, anyone paid in INR buying USD goods.',
  },
  {
    id: 'crude-oil',
    title: 'Crude Oil Prices',
    icon: '🛢️',
    color: 'text-amber-500',
    affects: 'INR strength, inflation, RBI policy, and specific sectors — aviation, paints, tyres, OMCs, chemicals.',
    how: 'India imports ~85% of its crude. Oil up → bigger import bill → trade deficit widens → INR weakens → imported inflation → RBI may hike rates → home/auto loans get costlier → rate-sensitive stocks fall.',
    trend: 'Geopolitical shocks spike oil (Russia-Ukraine 2022 → $130/bbl). OPEC+ supply cuts support floors. US shale + EV adoption cap long-term upside.',
    helps: 'Oil producers (ONGC, Oil India, Reliance) when prices rise. Refiners (Reliance, BPCL) in high-margin phases.',
    hurts: 'Airlines (fuel ≈ 30–40% of costs), paints (crude derivatives = raw material), consumers (petrol/diesel, inflation), holders of INR.',
  },
  {
    id: 'gold',
    title: 'Gold Prices',
    icon: '🥇',
    color: 'text-yellow-500',
    affects: 'INR (India is the #2 gold importer), jewellery stocks (Titan, Kalyan), equity sentiment.',
    how: 'Gold is the classic safe haven — it rises on fear (wars, recessions, banking stress) and when real interest rates fall. It usually moves inversely to the USD. India\'s seasonal demand (weddings, Diwali, Akshaya Tritiya) can lift global prices.',
    trend: 'Gold rallies in crises — 2008, 2020, 2022 bank failures. It underperforms in strong-growth, high-rate eras. INR depreciation makes gold costlier in India even when global price is flat.',
    helps: 'Gold ETFs, jewellery stocks, investors seeking a crisis hedge, inflation protection.',
    hurts: 'Equity investors — gold rising often signals risk-off and equities falling. It is an opportunity cost when stocks are booming.',
  },
  {
    id: 'fed-rates',
    title: 'US Federal Reserve Rates',
    icon: '🏛️',
    color: 'text-indigo-500',
    affects: 'Foreign capital flows into India (FII), INR, IT stocks, crypto, gold, emerging-market equities.',
    how: 'When the Fed hikes, US yields rise → global capital leaves riskier emerging markets like India for safe US bonds → INR weakens and Nifty drops. Indian IT firms benefit because they bill in USD. Crypto and gold often fall (risk-off, higher opportunity cost).',
    trend: '2022–23 Fed hiking cycle (0.25% → 5.5%) saw record FII outflows, INR hitting ₹83, Nifty correction. 2024 pivot to cuts reversed flows.',
    helps: 'IT services (exporters) in hiking cycles, USD-cash holders, US Treasury investors.',
    hurts: 'Emerging-market equity investors, USD borrowers (incl. Indian corporates with forex debt), crypto and risk-asset holders.',
  },
  {
    id: 'rbi-repo',
    title: 'RBI Repo Rate',
    icon: '🏦',
    color: 'text-emerald-500',
    affects: 'Home/auto loans, banks & NBFCs, real estate, autos, bond yields, fixed deposits.',
    how: 'RBI hikes repo → banks raise lending rates → EMIs rise → home and car sales slow → bank NPA risk rises. Bond prices fall (yields rise). Fixed deposits become more attractive, pulling money from equities.',
    trend: 'RBI hiked from 4.0% (May 2022) to 6.5% (Feb 2023) to curb inflation, then held. Each 0.25% hike adds ~₹1,500/₹1L to annual home-loan interest.',
    helps: 'Savers and FD holders (higher interest), banks\' net interest margins (initially), fixed-income investors.',
    hurts: 'Borrowers (home/auto/personal loans), real estate and auto sales, rate-sensitive stocks, bondholders (price falls).',
  },
  {
    id: 'crypto-tech',
    title: 'Crypto ↔ Tech Stocks',
    icon: '₿',
    color: 'text-orange-500',
    affects: 'Bitcoin and major cryptos move increasingly with the Nasdaq / tech-heavy indices.',
    how: 'Both are "risk-on" assets that thrive on cheap liquidity. When rates are low and money is loose, both rally. When liquidity tightens or panic hits, both sell off together. The idea that crypto is an "uncorrelated hedge" mostly fails in serious crashes.',
    trend: '2020–21: low rates → BTC and Nasdaq both surged. 2022: hikes → both fell ~65% and ~33%. 2023–24: AI rally + rate-pause → both recovered. Correlation spikes in stress.',
    helps: 'Diversified investors who understand the correlation — using it to size positions, not chase a "hedge".',
    hurts: 'Anyone treating crypto as a safe-hedge during a stock crash — both often fall together.',
  },
  {
    id: 'inflation',
    title: 'Inflation (CPI)',
    icon: '📈',
    color: 'text-red-500',
    affects: 'Purchasing power, RBI policy, equity valuations, bond yields, real wages.',
    how: 'High inflation → RBI hikes to cool demand → equity valuations compress (P/E falls) → stocks drop. Companies that can pass on costs (FMCG, cement) survive; those that can\'t (utilities, airlines) get squeezed. Real (inflation-adjusted) returns matter more than nominal.',
    trend: 'RBI\'s tolerance band is 2–6% CPI. Sustained >6% triggers rate action. Food and fuel are the most volatile components in India.',
    helps: 'Real assets (gold, real estate, commodities), producers with pricing power, borrowers with fixed-rate debt (pay back in cheaper rupees).',
    hurts: 'Fixed-income savers, salaried workers without inflation-linked raises, consumers, bondholders.',
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
          Real relationships that move your money. Tap any driver to see what it affects, how, the historical trend, and who it helps or hurts.
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
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
          <TrendingDown className="w-3 h-3 mt-0.5 shrink-0" />
          Educational reference based on real economic relationships, not predictions. Not financial advice.
        </p>
      </CardContent>
    </Card>
  );
}
