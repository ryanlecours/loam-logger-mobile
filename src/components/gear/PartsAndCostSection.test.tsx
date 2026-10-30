import { render, screen, fireEvent } from '@testing-library/react-native';

import {
  PartsAndCostSection,
  newPartDraft,
  partsAndCostInvalid,
  partsToInput,
  sumPartPrices,
  type PartDraft,
} from './PartsAndCostSection';

const part = (over: Partial<PartDraft>): PartDraft => ({ ...newPartDraft(), brand: '', model: '', price: '', vendor: '', ...over });

describe('partsToInput', () => {
  it('sends trimmed parts with prices in minor units and drops unnamed rows', () => {
    const parts = [
      part({ brand: ' Fox ', model: ' Seal kit 36mm ', price: '38', vendor: ' Jenson ' }),
      part({ model: '20wt Gold oil' }),
      part({ brand: 'orphan brand with no model' }),
    ];
    expect(partsToInput(parts, 'USD')).toEqual([
      { brand: 'Fox', model: 'Seal kit 36mm', priceMinor: 3800, vendor: 'Jenson' },
      { brand: null, model: '20wt Gold oil', priceMinor: null, vendor: null },
    ]);
  });
});

describe('sumPartPrices and validation', () => {
  it('sums priced parts and is null when none is priced', () => {
    expect(sumPartPrices([part({ model: 'a', price: '38' }), part({ model: 'b', price: '9.50' })], 'USD')).toBe(4750);
    expect(sumPartPrices([part({ model: 'a' })], 'USD')).toBeNull();
  });

  it('flags an ambiguous amount or a priced part without a name', () => {
    expect(partsAndCostInvalid('85', [], 'USD')).toBe(false);
    expect(partsAndCostInvalid('1,200', [], 'USD')).toBe(true);
    expect(partsAndCostInvalid('', [part({ model: 'a', price: '1.005' })], 'USD')).toBe(true);
    expect(partsAndCostInvalid('', [part({ brand: 'Fox', price: '38' })], 'USD')).toBe(true);
    expect(partsAndCostInvalid('', [part({ model: 'a', price: '38' })], 'USD')).toBe(false);
  });
});

describe('PartsAndCostSection', () => {
  it('starts closed and explains itself when more than one part is selected', async () => {
    await render(
      <PartsAndCostSection
        currency="USD"
        cost=""
        onCostChange={jest.fn()}
        parts={[]}
        onPartsChange={jest.fn()}
        enabled={false}
        disabledHint="Select one part to record parts and cost."
      />
    );
    expect(screen.queryByText('Select one part to record parts and cost.')).toBeNull();
    await fireEvent.press(screen.getByText('Parts and cost'));
    expect(screen.getByText('Select one part to record parts and cost.')).toBeTruthy();
  });

  it('pre-fills the total from priced parts until the rider types one', async () => {
    const onCostChange = jest.fn();
    const onPartsChange = jest.fn();
    const parts = [part({ model: 'Seal kit' })];
    await render(
      <PartsAndCostSection
        currency="USD"
        cost=""
        onCostChange={onCostChange}
        parts={parts}
        onPartsChange={onPartsChange}
        initiallyExpanded
      />
    );
    await fireEvent.changeText(screen.getByLabelText('Part 1 price'), '38');
    expect(onPartsChange).toHaveBeenCalledWith([expect.objectContaining({ price: '38' })]);
    expect(onCostChange).toHaveBeenCalledWith('38.00');
  });

  it('leaves a cost the rider already has alone when a part price changes', async () => {
    // An edited log is seeded after mount, and a typed total must never be
    // replaced by the sum of the parts: that would drop labour.
    const onCostChange = jest.fn();
    const parts = [part({ model: 'Seal kit' })];
    await render(
      <PartsAndCostSection
        currency="USD"
        cost="120.00"
        onCostChange={onCostChange}
        parts={parts}
        onPartsChange={jest.fn()}
        initiallyExpanded
      />
    );
    await fireEvent.changeText(screen.getByLabelText('Part 1 price'), '38');
    expect(onCostChange).not.toHaveBeenCalled();
  });

  it('refuses an amount over the cap the API enforces', () => {
    expect(partsAndCostInvalid('5000000', [], 'USD')).toBe(true);
    expect(partsAndCostInvalid('999999', [], 'USD')).toBe(false);
  });

  it('shows an error for an ambiguous amount instead of coercing it', async () => {
    await render(
      <PartsAndCostSection
        currency="USD"
        cost="1,200"
        onCostChange={jest.fn()}
        parts={[]}
        onPartsChange={jest.fn()}
        initiallyExpanded
      />
    );
    expect(screen.getByText(/Enter a plain amount under/)).toBeTruthy();
  });
});
