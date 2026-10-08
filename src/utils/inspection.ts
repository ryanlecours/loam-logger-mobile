import { ServiceLogKind } from '../graphql/generated';

/**
 * "Looks good" logs an inspection that stands in for the due service: the
 * next service is due this many hours later, and the next real service ends
 * the extension. The server suggests half the service interval; the fallback
 * covers a prediction cached before it sent the suggestion. Null when there is
 * no interval to take half of, so the rider enters the hours themselves.
 */
export function suggestedInspectionHours(
  recommendedExtensionHours: number | null | undefined,
  serviceIntervalHours: number | null | undefined
): number | null {
  if (recommendedExtensionHours != null && recommendedExtensionHours > 0) {
    return recommendedExtensionHours;
  }
  if (serviceIntervalHours != null && serviceIntervalHours > 0) {
    return Math.round(serviceIntervalHours / 2);
  }
  return null;
}

/** The server clamps a custom extension to this range. */
export const MIN_INSPECTION_HOURS = 1;
export const MAX_INSPECTION_HOURS = 400;

export function isValidInspectionHours(hours: number): boolean {
  return hours >= MIN_INSPECTION_HOURS && hours <= MAX_INSPECTION_HOURS;
}

/**
 * The inspection a "Looks good" just logged, so Undo can delete it. Logs come
 * back newest first, and the new one is dated now.
 */
export function newestInspectionId(
  serviceLogs: ReadonlyArray<{ id: string; kind: ServiceLogKind }>
): string | null {
  return serviceLogs.find((log) => log.kind === ServiceLogKind.Inspection)?.id ?? null;
}
