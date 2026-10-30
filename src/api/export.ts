import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getAccessToken } from '../lib/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export interface MaintenanceExportResult {
  /** Where the file was written in the app's cache directory. */
  uri: string;
  filename: string;
  /** False when no share sheet was available and the file was only saved. */
  shared: boolean;
}

/**
 * Download the rider's whole maintenance history as a CSV and hand it to the
 * share sheet. Free for every tier: a rider can always take their own record
 * with them. The API attaches the Garmin attribution rows when any ride came
 * from Garmin; they sit in the first column after the event rows.
 */
export async function exportMaintenanceCsv(): Promise<MaintenanceExportResult> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');

  const response = await fetch(`${API_URL}/api/export/maintenance.csv`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' },
  });
  if (response.status === 429) {
    throw new Error('Too many exports in the last hour. Please try again later.');
  }
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? `loam-logger-maintenance-${new Date().toISOString().slice(0, 10)}.csv`;
  const csv = await response.text();

  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error('No writable directory for the export');
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Maintenance history',
      UTI: 'public.comma-separated-values-text',
    });
    return { uri, filename, shared: true };
  }
  return { uri, filename, shared: false };
}
