import { dashboardHeadline } from './dashboardHeadline';

/**
 * The all-clear is the assertion this screen is least allowed to get wrong, so
 * every path that could produce one is pinned here. The untracked cases are the
 * regression: gating on the attention count alone printed an all-clear over a
 * row that said nothing was tracked.
 */
describe('dashboardHeadline', () => {
  it('claims an all-clear only when nothing is flagged and nothing is unknown', () => {
    expect(
      dashboardHeadline({
        attentionCount: 0,
        healthyCount: 3,
        untrackedCount: 0,
        totalBikes: 3,
      }),
    ).toEqual({ text: 'All 3 bikes are good to go', tone: 'good' });
  });

  it('drops the plural machinery for a single bike', () => {
    expect(
      dashboardHeadline({
        attentionCount: 0,
        healthyCount: 1,
        untrackedCount: 0,
        totalBikes: 1,
      }),
    ).toEqual({ text: 'Good to go', tone: 'good' });
  });

  it('never says good to go when a bike has nothing tracked', () => {
    const headline = dashboardHeadline({
      attentionCount: 0,
      healthyCount: 2,
      untrackedCount: 1,
      totalBikes: 3,
    });

    expect(headline.tone).toBe('neutral');
    expect(headline.text).not.toMatch(/all 3/i);
    // Claims only the two it actually knows about.
    expect(headline.text).toBe('2 of your 3 bikes are good to go');
  });

  it('never says good to go for a lone bike with nothing tracked', () => {
    const headline = dashboardHeadline({
      attentionCount: 0,
      healthyCount: 0,
      untrackedCount: 1,
      totalBikes: 1,
    });

    expect(headline).toEqual({ text: 'Nothing tracked on this bike yet', tone: 'neutral' });
  });

  it('never says good to go when every bike is untracked', () => {
    const headline = dashboardHeadline({
      attentionCount: 0,
      healthyCount: 0,
      untrackedCount: 4,
      totalBikes: 4,
    });

    expect(headline).toEqual({ text: 'Nothing tracked on your bikes yet', tone: 'neutral' });
  });

  it('leads with the work when there is any', () => {
    expect(
      dashboardHeadline({
        attentionCount: 2,
        healthyCount: 1,
        untrackedCount: 1,
        totalBikes: 4,
      }),
    ).toEqual({ text: '2 of your 4 bikes need work', tone: 'neutral' });
  });

  it('names the problem rather than counting it for a single bike', () => {
    expect(
      dashboardHeadline({
        attentionCount: 1,
        healthyCount: 0,
        untrackedCount: 0,
        totalBikes: 1,
      }),
    ).toEqual({ text: 'Needs attention before you ride', tone: 'neutral' });
  });

  it('reserves the good tone for the all-clear alone', () => {
    const cases = [
      { attentionCount: 0, healthyCount: 2, untrackedCount: 1, totalBikes: 3 },
      { attentionCount: 0, healthyCount: 0, untrackedCount: 2, totalBikes: 2 },
      { attentionCount: 1, healthyCount: 2, untrackedCount: 0, totalBikes: 3 },
    ];

    for (const counts of cases) {
      expect(dashboardHeadline(counts).tone).toBe('neutral');
    }
  });
});
