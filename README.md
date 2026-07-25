# GMD Interactive Equity Research

An interactive, source-audited equity-research project that links Vietnam's trade and FDI backdrop to national container throughput, Gemadept's market share, earnings, cash flow and valuation.

![GMD Interactive Equity Research](public/og.png)

## Investment conclusion

| Metric | Base case |
|---|---:|
| Rating | **BUY — execution-sensitive** |
| Current price | VND 73,200 |
| Target price | VND 84,500 |
| Upside | 15.4% |
| Probability-weighted target | VND 84,000 |
| Probability-weighted upside | 14.8% |
| Bear value | VND 51,000 |

The Base case only narrowly clears the project's 15% BUY hurdle. The thesis depends on new capacity converting into market share, Gemalink Phase 2 ramping on schedule and capex normalizing into stronger cash conversion.

## Research question

> If Vietnam's export recovery continues, which listed port operator converts the macro improvement into the most reliable attributable earnings and free cash flow?

The research chain is:

`Trade and FDI → national TEU → GMD market share → system throughput → revenue and margins → earnings and FCFF → valuation`

Ports and shipping lines are not combined into one thesis because shipping profitability introduces freight-rate, vessel-supply and fuel-price drivers that are materially different from port economics.

## Interactive features

- Dynamic Base, Bull, Bear and Custom scenarios.
- Live target price and BUY/HOLD/SELL rating.
- Adjustable national TEU growth, GMD share, unit/mix, margin, associate growth and capex.
- Live WACC, terminal-growth and target-P/E controls.
- Dynamic DCF sensitivity matrix.
- Peer-screen weighting lab for GMD, PHP, VSC and DVP.
- Interactive five-year historical charts.
- Catalyst and falsifier views.
- Searchable source explorer with original links.
- Seven-step recruiter presentation mode.
- Embedded downloads for the Excel model, investment note and interview script.

## Historical and forecast scope

- Five years of historical financials: FY2021–FY2025.
- Base, Bull and Bear forecasts: FY2026–FY2030.
- Raw financial statements obtained through VNStock and reconciled to issuer filings.
- Gemalink and other equity-accounted assets modeled separately from consolidated operations.
- Parent PAT and non-controlling interests bridged explicitly.
- Valuation based on a 2026E P/E and DCF/SOTP blend.

## Key Base-case outputs

| Metric | 2025A | 2026E | 2030E |
|---|---:|---:|---:|
| GMD system throughput | 5.079m TEU | 5.685m TEU | 8.538m TEU |
| Revenue | VND 5,956bn | VND 6,757bn | VND 11,100bn |
| Core PBT | VND 2,521bn | VND 3,009bn | VND 5,239bn |
| Parent PAT | VND 1,756bn | VND 2,124bn | VND 3,678bn |
| EPS | VND 4,116 | VND 4,981 | VND 8,623 |

## Quality control

- 137/137 Phase 4 forecast and valuation controls passed.
- 14/14 Phase 5 packaging controls passed.
- No formula errors found in the final workbook.
- Facts, analyst assumptions and model outputs are separately labeled.
- Source IDs, publication dates, definitions, units and original URLs are retained in the workbook.

## Repository structure

```text
app/
  ResearchDashboard.tsx   Interactive research application
  globals.css             Responsive visual system
public/
  downloads/              Excel, PDF, PowerPoint and interview script
  og.png                  Social-preview artwork
.openai/
  hosting.json            Deployment metadata
```

## Run locally

Requirements: Node.js 22.13 or later and pnpm.

```bash
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
```

## Key public sources

- [Vietnam National Statistics Office — 1H2026 report](https://www.nso.gov.vn/wp-content/uploads/2026/07/VN.-T6.2026-final.pdf)
- [Gemadept Annual Report 2025](https://www.gemadept.com.vn/wp-content/uploads/2026/04/GMD-AR-2025_EN.pdf)
- [Gemadept Q1 2026 IR Newsletter](https://www.gemadept.com.vn/wp-content/uploads/2026/05/IR-NEWSLETTER-Q12026.pdf)
- [Gemadept 2026 AGM Business Plan](https://www.gemadept.com.vn/wp-content/uploads/2026/04/AGM-2026-7.3.-Submission-03-Business-Plan-2026.pdf)
- [VNStock fundamental-data documentation](https://vnstocks.com/docs/vnstock/phan-tich-co-ban-fundamental)
- [AsianBondsOnline — Vietnam](https://asianbondsonline.adb.org/vietnam/)

The complete source register is available in the downloadable Excel model.

## Disclaimer

This is an educational equity-research and portfolio project based on public information and analyst assumptions. It is not investment advice or a solicitation to trade securities.
