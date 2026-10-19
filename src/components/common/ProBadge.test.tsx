import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { colors } from '../../constants/theme';
import { ProBadge } from './ProBadge';

/**
 * `render` is async in @testing-library/react-native v14; queries come from
 * the global `screen`.
 */
describe('ProBadge', () => {
  it('says Pro by default', async () => {
    await render(<ProBadge />);
    expect(screen.getByText('Pro')).toBeTruthy();
    expect(screen.getByLabelText('Pro member')).toBeTruthy();
  });

  it('gives Founding Riders their own title', async () => {
    await render(<ProBadge isFoundingRider />);
    expect(screen.getByText('Founding Rider')).toBeTruthy();
    expect(screen.queryByText('Pro')).toBeNull();
  });

  it('wears the earned-status amber, not the sage gating chip', async () => {
    await render(<ProBadge />);
    const style = StyleSheet.flatten(screen.getByText('Pro').props.style);
    expect(style.color).toBe(colors.earned);
    expect(style.backgroundColor).toBe(colors.earnedBg);
  });
});
