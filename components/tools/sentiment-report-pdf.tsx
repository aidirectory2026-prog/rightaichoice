'use client'

// Phase 12 Bug-3 (2026-06-23) — branded, vector PDF of the Market Sentiment
// Report (the paid deliverable). @react-pdf/renderer is heavy, so this module is
// ONLY ever dynamic-imported from the report's Download button (see
// downloadSentimentPdf) — it never lands in the initial page bundle.
//
// Robustness: the layout is View/Text based (react-pdf's most reliable
// primitives) — bars are sized Views, the score gauge is a bordered circular
// View — so it renders identically everywhere without depending on SVG arc
// support. Light theme: prints + shares like a real research report.

import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { sourceMeta } from '@/components/tools/source-icon'
import { overallPositivity, bandColor } from '@/lib/sentiment/chart-geometry'

export type SentimentPdfData = {
  ai_verdict: string
  bottom_line?: string
  sentiment_score: 'positive' | 'mixed' | 'negative'
  sentiment_breakdown?: Record<string, number>
  pros: string[]
  cons: string[]
  scorecard?: { overall: number; value: number; ease_of_use: number; support: number; reliability: number; performance: number }
  themes?: { theme: string; sources?: string[]; sentiment?: string }[]
  standout_quotes?: { text: string; source: string; sentiment?: string; date?: string }[]
  red_flags?: { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[]
  best_for?: string[]
  not_for?: string[]
  learning_curve?: { time_to_start?: string; skill_level?: string; hurdles?: string[] }
  pricing_analysis?: { hidden_costs?: string[]; verdict?: string }
  faqs?: { q: string; a: string }[]
  source_breakdown?: { source: string; label: string; count: number; positivity: number | null }[]
  mentions?: { source: string; date: string | null }[]
}

const EMERALD = '#059669'
const INK = '#18181b'
const MUTED = '#71717a'
const LINE = '#e4e4e7'

const s = StyleSheet.create({
  page: { paddingTop: 38, paddingBottom: 46, paddingHorizontal: 40, fontSize: 9.5, color: INK, lineHeight: 1.45, fontFamily: 'Helvetica' },
  // Header
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  brand: { fontSize: 8, color: EMERALD, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  kicker: { fontSize: 8, color: MUTED },
  h1: { fontSize: 21, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 2 },
  subtitle: { fontSize: 9, color: MUTED, marginBottom: 14 },
  // Verdict band
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 14, marginBottom: 16, backgroundColor: '#fafafa' },
  gauge: { width: 78, height: 78, borderRadius: 39, borderWidth: 7, alignItems: 'center', justifyContent: 'center' },
  gaugePct: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: INK },
  gaugeLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 0.6 },
  verdictBody: { flex: 1 },
  sentiment: { fontSize: 17, fontFamily: 'Helvetica-Bold', textTransform: 'capitalize' },
  bottomLine: { fontSize: 10, color: '#065f46', marginTop: 3, fontFamily: 'Helvetica-Bold' },
  statsRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  stat: { fontSize: 8, color: MUTED },
  statN: { color: INK, fontFamily: 'Helvetica-Bold' },
  // Sections
  section: { marginBottom: 13 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: INK, borderBottomWidth: 1.5, borderBottomColor: EMERALD, paddingBottom: 3, marginBottom: 7 },
  para: { fontSize: 9.5, color: '#3f3f46' },
  // two-column
  cols: { flexDirection: 'row', gap: 18 },
  col: { flex: 1 },
  li: { flexDirection: 'row', gap: 4, marginBottom: 3 },
  liMark: { width: 8 },
  liText: { flex: 1, fontSize: 9 },
  // bars
  barRow: { marginBottom: 6 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  barLabel: { fontSize: 8.5, color: '#3f3f46', flex: 1 },
  barVal: { fontSize: 8, color: MUTED },
  track: { height: 5, backgroundColor: '#e4e4e7', borderRadius: 3 },
  fill: { height: 5, borderRadius: 3 },
  // quotes
  quote: { borderLeftWidth: 2.5, borderLeftColor: '#d4d4d8', paddingLeft: 8, marginBottom: 7 },
  quoteText: { fontSize: 9, fontStyle: 'italic', color: '#3f3f46' },
  quoteMeta: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  // red flags
  flag: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 7, marginBottom: 5 },
  flagTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  flagDetail: { fontSize: 8.5, color: '#52525b', marginTop: 2 },
  sev: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
  // faqs
  faq: { marginBottom: 7 },
  faqQ: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: INK },
  faqA: { fontSize: 9, color: '#3f3f46', marginTop: 1.5 },
  // source chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: LINE, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 5 },
  badge: { width: 13, height: 13, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 6, color: '#fff', fontFamily: 'Helvetica-Bold' },
  chipText: { fontSize: 8, color: '#3f3f46' },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, fontSize: 7, color: '#a1a1aa', flexDirection: 'row', justifyContent: 'space-between' },
})

const SCORE_AXES: { key: keyof NonNullable<SentimentPdfData['scorecard']>; label: string }[] = [
  { key: 'value', label: 'Value for money' },
  { key: 'ease_of_use', label: 'Ease of use' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'performance', label: 'Performance' },
  { key: 'support', label: 'Support' },
]

function SourceChip({ source, suffix }: { source: string; suffix?: string }) {
  const m = sourceMeta(source)
  return (
    <View style={s.chip}>
      <View style={[s.badge, { backgroundColor: m.color }]}><Text style={s.badgeText}>{m.glyph}</Text></View>
      <Text style={s.chipText}>{m.label}{suffix ? ` · ${suffix}` : ''}</Text>
    </View>
  )
}

function Bar({ label, pct, val, color }: { label: string; pct: number; val?: string; color: string }) {
  return (
    <View style={s.barRow}>
      <View style={s.barLabelRow}>
        <Text style={s.barLabel}>{label}</Text>
        {val ? <Text style={s.barVal}>{val}</Text> : null}
      </View>
      <View style={s.track}><View style={[s.fill, { width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color }]} /></View>
    </View>
  )
}

function fmt(d?: string | null): string {
  if (!d) return ''
  const t = Date.parse(d)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function SentimentReportPdf({ report, toolName }: { report: SentimentPdfData; toolName: string }) {
  const positivity = overallPositivity(report.sentiment_breakdown, report.sentiment_score)
  const gaugeColor = bandColor(positivity)
  const sentColor = report.sentiment_score === 'positive' ? EMERALD : report.sentiment_score === 'negative' ? '#dc2626' : '#d97706'
  const mentions = report.mentions ?? []
  const dated = mentions.map((m) => (m.date ? Date.parse(m.date) : NaN)).filter((t) => !Number.isNaN(t))
  const latest = dated.length ? fmt(new Date(Math.max(...dated)).toISOString()) : ''
  const sources = report.source_breakdown ?? []
  const themeMax = Math.max(1, ...(report.themes ?? []).map((t) => t.sources?.length ?? 1))
  const themeColor = (x?: string) => (x === 'positive' ? EMERALD : x === 'critical' ? '#dc2626' : '#a1a1aa')
  const sevColor: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#71717a' }

  return (
    <Document title={`${toolName} — Market Sentiment Report`} author="RightAIChoice">
      <Page size="A4" style={s.page}>
        <View style={s.brandRow}>
          <Text style={s.brand}>RIGHTAICHOICE · MARKET SENTIMENT</Text>
          <Text style={s.kicker}>Generated {new Date().toLocaleDateString()}</Text>
        </View>
        <Text style={s.h1}>{toolName}</Text>
        <Text style={s.subtitle}>An honest, real-time synthesis of public user opinion across the web.</Text>

        {/* Verdict band */}
        <View style={s.verdictRow}>
          <View style={[s.gauge, { borderColor: gaugeColor }]}>
            <Text style={s.gaugePct}>{positivity}%</Text>
            <Text style={s.gaugeLabel}>POSITIVE</Text>
          </View>
          <View style={s.verdictBody}>
            <Text style={[s.sentiment, { color: sentColor }]}>{report.sentiment_score} sentiment</Text>
            {report.bottom_line ? <Text style={s.bottomLine}>{report.bottom_line}</Text> : null}
            <View style={s.statsRow}>
              <Text style={s.stat}><Text style={s.statN}>{mentions.length || sources.reduce((n, x) => n + x.count, 0)}</Text> mentions</Text>
              <Text style={s.stat}><Text style={s.statN}>{sources.length}</Text> sources</Text>
              {latest ? <Text style={s.stat}>latest <Text style={s.statN}>{latest}</Text></Text> : null}
            </View>
          </View>
        </View>

        {/* Scorecard */}
        {report.scorecard ? (
          <View style={s.section}>
            <Text style={s.h2}>How it scores</Text>
            <Bar label="Overall" pct={report.scorecard.overall} val={String(report.scorecard.overall)} color={bandColor(report.scorecard.overall)} />
            <View style={{ height: 4 }} />
            {SCORE_AXES.map((a) => (
              <Bar key={a.key} label={a.label} pct={report.scorecard![a.key]} val={String(report.scorecard![a.key])} color={bandColor(report.scorecard![a.key])} />
            ))}
          </View>
        ) : null}

        {/* Per-source sentiment */}
        {sources.length > 0 ? (
          <View style={s.section}>
            <Text style={s.h2}>Sentiment by source</Text>
            {sources.map((src) => (
              <Bar
                key={src.source}
                label={`${src.label}  (${src.count})`}
                pct={src.positivity != null ? Math.round(src.positivity * 100) : 0}
                val={src.positivity != null ? `${Math.round(src.positivity * 100)}%` : '—'}
                color={src.positivity != null ? bandColor(Math.round(src.positivity * 100)) : '#a1a1aa'}
              />
            ))}
          </View>
        ) : null}

        {/* Verdict */}
        <View style={s.section}>
          <Text style={s.h2}>The honest verdict</Text>
          <Text style={s.para}>{report.ai_verdict}</Text>
        </View>

        {/* Themes */}
        {report.themes && report.themes.length > 0 ? (
          <View style={s.section} wrap={false}>
            <Text style={s.h2}>What everyone keeps saying</Text>
            {report.themes.slice(0, 8).map((t, i) => (
              <Bar key={i} label={t.theme} pct={((t.sources?.length ?? 1) / themeMax) * 100} color={themeColor(t.sentiment)} />
            ))}
          </View>
        ) : null}

        {/* Praise / Gripes */}
        <View style={s.section} wrap={false}>
          <View style={s.cols}>
            <View style={s.col}>
              <Text style={s.h2}>What users love</Text>
              {report.pros.map((p, i) => (
                <View key={i} style={s.li}><Text style={[s.liMark, { color: EMERALD }]}>+</Text><Text style={s.liText}>{p}</Text></View>
              ))}
            </View>
            <View style={s.col}>
              <Text style={s.h2}>What frustrates them</Text>
              {report.cons.map((c, i) => (
                <View key={i} style={s.li}><Text style={[s.liMark, { color: '#dc2626' }]}>–</Text><Text style={s.liText}>{c}</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* Quotes */}
        {report.standout_quotes && report.standout_quotes.length > 0 ? (
          <View style={s.section}>
            <Text style={s.h2}>In their words</Text>
            {report.standout_quotes.slice(0, 8).map((q, i) => (
              <View key={i} style={s.quote} wrap={false}>
                <Text style={s.quoteText}>&ldquo;{q.text}&rdquo;</Text>
                <Text style={s.quoteMeta}>— {sourceMeta(q.source).label}{q.date && fmt(q.date) ? ` · ${fmt(q.date)}` : ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Red flags */}
        {report.red_flags && report.red_flags.length > 0 ? (
          <View style={s.section}>
            <Text style={s.h2}>Watch-outs before you commit</Text>
            {report.red_flags.map((f, i) => (
              <View key={i} style={s.flag} wrap={false}>
                <Text style={[s.sev, { color: sevColor[f.severity] ?? MUTED }]}>{f.severity}</Text>
                <Text style={s.flagTitle}>{f.title}</Text>
                <Text style={s.flagDetail}>{f.detail}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Who for / skip */}
        {(report.best_for?.length || report.not_for?.length) ? (
          <View style={s.section} wrap={false}>
            <View style={s.cols}>
              {report.best_for && report.best_for.length > 0 ? (
                <View style={s.col}>
                  <Text style={s.h2}>Who it&apos;s for</Text>
                  {report.best_for.map((b, i) => <View key={i} style={s.li}><Text style={[s.liMark, { color: EMERALD }]}>✓</Text><Text style={s.liText}>{b}</Text></View>)}
                </View>
              ) : null}
              {report.not_for && report.not_for.length > 0 ? (
                <View style={s.col}>
                  <Text style={s.h2}>Who should skip it</Text>
                  {report.not_for.map((b, i) => <View key={i} style={s.li}><Text style={[s.liMark, { color: '#dc2626' }]}>✗</Text><Text style={s.liText}>{b}</Text></View>)}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Hidden costs */}
        {report.pricing_analysis?.hidden_costs && report.pricing_analysis.hidden_costs.length > 0 ? (
          <View style={s.section} wrap={false}>
            <Text style={s.h2}>Hidden costs people mention</Text>
            {report.pricing_analysis.hidden_costs.map((h, i) => <View key={i} style={s.li}><Text style={s.liMark}>•</Text><Text style={s.liText}>{h}</Text></View>)}
            {report.pricing_analysis.verdict ? <Text style={[s.para, { marginTop: 3 }]}>{report.pricing_analysis.verdict}</Text> : null}
          </View>
        ) : null}

        {/* FAQs */}
        {report.faqs && report.faqs.length > 0 ? (
          <View style={s.section}>
            <Text style={s.h2}>Real questions, real answers</Text>
            {report.faqs.map((f, i) => (
              <View key={i} style={s.faq} wrap={false}>
                <Text style={s.faqQ}>{f.q}</Text>
                <Text style={s.faqA}>{f.a}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Sources footer */}
        {sources.length > 0 ? (
          <View style={s.section} wrap={false}>
            <Text style={s.h2}>Where this came from</Text>
            <View style={s.chips}>
              {sources.map((src) => <SourceChip key={src.source} source={src.source} suffix={String(src.count)} />)}
            </View>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text>RightAIChoice — Market Sentiment Checker. Synthesized from public user opinion; provided as-is for research.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

/** Build the PDF and trigger a browser download. Called from the report's
 *  Download button via a dynamic import so react-pdf stays out of the main bundle. */
export async function downloadSentimentPdf(report: SentimentPdfData, toolName: string, slug: string): Promise<void> {
  const blob = await pdf(<SentimentReportPdf report={report} toolName={toolName} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug}-sentiment-report.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
