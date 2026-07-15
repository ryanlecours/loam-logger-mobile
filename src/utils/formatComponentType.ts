/**
 * Canonical component-type display formatter for the mobile app.
 *
 * DUPLICATE of loam-logger monorepo's libs/shared/src/utils/formatComponentType.ts.
 * Kept in sync manually because the mobile app is a separate repo that cannot
 * import from the monorepo. The monorepo copy has the unit tests — treat it as
 * the canonical spec. Any change here must also land there (and vice versa).
 *
 *   formatComponentType('BRAKE_PAD')                             -> 'Brake Pad'
 *   formatComponentType('BRAKE_PAD', 'FRONT')                    -> 'Front Brake Pad'
 *   formatComponentType('BRAKE_PAD', 'NONE')                     -> 'Brake Pad'
 *   formatComponentType('BRAKE_PAD', null, { case: 'lower' })    -> 'brake pad'
 */
export function formatComponentType(
  type: string,
  location?: string | null,
  options: { case?: 'title' | 'lower' | 'upper' } = {},
): string {
  const caseMode = options.case ?? 'title';
  const parts = [location, type]
    .filter((p): p is string => Boolean(p) && p !== 'NONE')
    .map((p) => p.replace(/_/g, ' '));
  const joined = parts.join(' ');

  switch (caseMode) {
    case 'lower':
      return joined.toLowerCase();
    case 'upper':
      return joined.toUpperCase();
    case 'title':
    default:
      return joined.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
