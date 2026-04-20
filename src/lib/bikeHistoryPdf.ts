import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatDistance, formatDuration, formatElevation } from '../utils/greetingMessages';
import {
  bikeName,
  componentDisplay,
  type HistoryBike,
  type HistoryTotals,
  type TimelineItem,
} from './bikeHistory';

const SAGE = '#4f7a5a';
const INK = '#0c0c0e';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function buildBikeHistoryHtml(params: {
  bike: HistoryBike;
  totals: HistoryTotals;
  yearGroups: Array<{ year: number; items: TimelineItem[] }>;
  distanceUnit: 'mi' | 'km';
  timeframeLabel: string;
  truncated: boolean;
}): string {
  const { bike, totals, yearGroups, distanceUnit, timeframeLabel, truncated } = params;
  const generated = new Date().toLocaleDateString();

  const renderRow = (item: TimelineItem): string => {
    if (item.kind === 'ride') {
      const r = item.ride;
      const title = r.trailSystem || r.location || `${r.rideType} ride`;
      return `
        <div class="row row-ride">
          <div class="tag">RIDE</div>
          <div class="content">
            <div class="title">${escapeHtml(title)}</div>
            <div class="meta">${escapeHtml(formatDate(r.startTime))} &middot; ${escapeHtml(formatDuration(r.durationSeconds))} &middot; ${escapeHtml(formatDistance(r.distanceMeters, distanceUnit))} &middot; ${escapeHtml(formatElevation(r.elevationGainMeters, distanceUnit))}</div>
          </div>
        </div>`;
    }
    if (item.kind === 'service') {
      const s = item.service;
      const notes = s.notes ? ` &middot; ${escapeHtml(s.notes)}` : '';
      return `
        <div class="row">
          <div class="tag">SERVICE</div>
          <div class="content">
            <div class="title">${escapeHtml(componentDisplay(s.component))}</div>
            <div class="meta">${escapeHtml(formatDate(s.performedAt))} &middot; ${s.hoursAtService.toFixed(0)} hrs${notes}</div>
          </div>
        </div>`;
    }
    const i = item.install;
    const tag = i.eventType === 'INSTALLED' ? 'INSTALL' : 'REMOVE';
    return `
      <div class="row">
        <div class="tag">${tag}</div>
        <div class="content">
          <div class="title">${escapeHtml(componentDisplay(i.component))}</div>
          <div class="meta">${escapeHtml(formatDate(i.occurredAt))}</div>
        </div>
      </div>`;
  };

  const yearsHtml = yearGroups
    .map(
      ({ year, items }) => `
        <section class="year">
          <h2>${year}</h2>
          ${items.map(renderRow).join('')}
        </section>`
    )
    .join('');

  const truncatedNote = truncated
    ? `<p class="truncated">History was capped to the most recent entries — some older events may not appear.</p>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(bikeName(bike))} – Loam Logger history</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; color: ${INK}; margin: 0; padding: 32px; font-size: 10pt; }
  header { margin-bottom: 16px; }
  .brand { font-size: 9pt; color: ${SAGE}; letter-spacing: 1px; font-weight: 700; }
  h1 { font-size: 20pt; margin: 2px 0 0; }
  .subtitle { font-size: 9pt; color: ${MUTED}; margin-top: 2px; }
  .totals { display: flex; border-top: 1px solid ${BORDER}; border-bottom: 1px solid ${BORDER}; padding: 10px 0; margin: 12px 0 16px; }
  .total { flex: 1; }
  .total .label { font-size: 7pt; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px; }
  .total .value { font-size: 12pt; font-weight: 700; margin-top: 2px; }
  .truncated { font-style: italic; color: ${MUTED}; font-size: 8pt; margin-bottom: 8px; }
  section.year { page-break-inside: auto; margin-bottom: 12px; }
  section.year h2 { font-size: 11pt; color: ${SAGE}; border-bottom: 1px solid ${BORDER}; padding-bottom: 3px; margin: 10px 0 4px; }
  .row { display: flex; padding: 4px 0; border-bottom: 0.5px solid ${BORDER}; page-break-inside: avoid; }
  .row-ride { padding-left: 24px; }
  .tag { width: 64px; font-size: 7pt; color: ${MUTED}; font-weight: 700; letter-spacing: 0.5px; padding-top: 2px; }
  .content { flex: 1; }
  .title { font-size: 10pt; }
  .meta { color: ${MUTED}; font-size: 8.5pt; }
  .empty { color: ${MUTED}; font-size: 10pt; }
  /*
   * Footer is placed inline at the end of the document rather than fixed
   * per-page. expo-print's WKWebView (iOS) / WebView (Android) print path
   * does not honor "position: fixed" the way a desktop browser does — the
   * footer would land on page 1 only, or not at all. @page margin boxes
   * would give us true per-page footers, but support across the two
   * render engines is inconsistent and hard to test in the simulator.
   * Accepting a single end-of-document signature is the reliable choice
   * for a typical 1–3 page bike history export.
   */
  footer { display: flex; justify-content: space-between; font-size: 7pt; color: ${MUTED}; margin-top: 32px; padding-top: 12px; border-top: 1px solid ${BORDER}; page-break-inside: avoid; }
</style>
</head>
<body>
<header>
  <div class="brand">LOAM LOGGER</div>
  <h1>${escapeHtml(bikeName(bike))}</h1>
  <div class="subtitle">${bike.year ? `${bike.year} · ` : ''}${escapeHtml(timeframeLabel)} · Generated ${generated}</div>
</header>

<div class="totals">
  <div class="total"><div class="label">Rides</div><div class="value">${totals.rideCount.toLocaleString()}</div></div>
  <div class="total"><div class="label">Distance</div><div class="value">${escapeHtml(formatDistance(totals.totalDistanceMeters, distanceUnit))}</div></div>
  <div class="total"><div class="label">Elevation</div><div class="value">${escapeHtml(formatElevation(totals.totalElevationGainMeters, distanceUnit))}</div></div>
  <div class="total"><div class="label">Service &amp; installs</div><div class="value">${(totals.serviceEventCount + totals.installEventCount).toLocaleString()}</div></div>
</div>

${truncatedNote}

${yearGroups.length === 0 ? '<p class="empty">No events in this timeframe.</p>' : yearsHtml}

<footer>
  <span>Generated by Loam Logger · ${generated}</span>
</footer>
</body>
</html>`;
}

export async function exportBikeHistoryPdf(params: {
  bike: HistoryBike;
  totals: HistoryTotals;
  yearGroups: Array<{ year: number; items: TimelineItem[] }>;
  distanceUnit: 'mi' | 'km';
  timeframeLabel: string;
  truncated: boolean;
}): Promise<void> {
  const html = buildBikeHistoryHtml(params);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${bikeName(params.bike)} history`,
      UTI: 'com.adobe.pdf',
    });
    return;
  }
  // Fallback when the share sheet isn't available (some Android configs,
  // Expo Go, simulators). Open the OS print dialog instead — the user can
  // still save-to-PDF or print a hard copy. Without this, the export
  // silently succeeds but produces no visible output, leaving the user
  // wondering whether the button worked.
  await Print.printAsync({ uri });
}
