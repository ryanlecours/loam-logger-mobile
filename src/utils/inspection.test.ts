import { ServiceLogKind } from '../graphql/generated';
import {
  isValidInspectionHours,
  newestInspectionId,
  suggestedInspectionHours,
} from './inspection';

describe('suggestedInspectionHours', () => {
  it("uses the server's suggestion", () => {
    expect(suggestedInspectionHours(25, 50)).toBe(25);
  });

  // A prediction cached before the server sent the suggestion.
  it('falls back to half the service interval', () => {
    expect(suggestedInspectionHours(undefined, 75)).toBe(38);
    expect(suggestedInspectionHours(0, 50)).toBe(25);
  });

  it('has no suggestion without an interval', () => {
    expect(suggestedInspectionHours(null, null)).toBeNull();
    expect(suggestedInspectionHours(0, 0)).toBeNull();
  });
});

describe('isValidInspectionHours', () => {
  it('accepts the range the server keeps', () => {
    expect(isValidInspectionHours(1)).toBe(true);
    expect(isValidInspectionHours(400)).toBe(true);
  });

  it('rejects hours the server would clamp', () => {
    expect(isValidInspectionHours(0)).toBe(false);
    expect(isValidInspectionHours(401)).toBe(false);
    expect(isValidInspectionHours(NaN)).toBe(false);
  });
});

describe('newestInspectionId', () => {
  it('picks the first inspection, skipping newer services', () => {
    expect(
      newestInspectionId([
        { id: 's2', kind: ServiceLogKind.Service },
        { id: 'i2', kind: ServiceLogKind.Inspection },
        { id: 'i1', kind: ServiceLogKind.Inspection },
      ])
    ).toBe('i2');
  });

  it('is null when there is no inspection', () => {
    expect(newestInspectionId([{ id: 's1', kind: ServiceLogKind.Service }])).toBeNull();
    expect(newestInspectionId([])).toBeNull();
  });
});
