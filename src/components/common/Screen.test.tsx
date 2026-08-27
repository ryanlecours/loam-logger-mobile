import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { Screen } from './Screen';

/**
 * What matters here is the contract Screen offers its callers, because the
 * padding itself is applied natively and a JS test cannot observe it: the
 * default must reserve BOTH device insets, a caller must be able to narrow
 * that, and any padding the caller declares must survive the style merge
 * (the native view adds the inset on top of it, so a dropped value would
 * silently collapse a screen's design spacing).
 *
 * `render` is async in @testing-library/react-native v14; queries come from
 * the global `screen`.
 */

/** A notched phone: status bar above, home indicator below. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderScreen(ui: ReactNode) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}

describe('Screen', () => {
  it('reserves both device insets by default', async () => {
    await renderScreen(
      <Screen testID="screen">
        <Text>Are your components stock?</Text>
      </Screen>,
    );

    // The native view normalizes the edge list, and "additive" is the mode
    // this component's contract depends on: inset ON TOP OF caller padding.
    expect(screen.getByTestId('screen').props.edges).toEqual({
      top: 'additive',
      bottom: 'additive',
      left: 'off',
      right: 'off',
    });
  });

  it('reserves only the edges it is given', async () => {
    await renderScreen(
      <Screen testID="screen" edges={['top']}>
        <Text>Dashboard</Text>
      </Screen>,
    );

    expect(screen.getByTestId('screen').props.edges).toEqual({
      top: 'additive',
      bottom: 'off',
      left: 'off',
      right: 'off',
    });
  });

  it("keeps the caller's own padding", async () => {
    await renderScreen(
      <Screen testID="screen" style={{ paddingTop: 16 }}>
        <Text>Add Your Bike</Text>
      </Screen>,
    );

    expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: 16 });
  });

  it('renders its children', async () => {
    await renderScreen(
      <Screen>
        <Text>Continue</Text>
      </Screen>,
    );

    expect(screen.getByText('Continue')).toBeTruthy();
  });
});
