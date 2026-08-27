import { isFirstRun, showStatsBlock } from './dashboardFirstRun';

const READY = {
  predictionsReady: true,
  recentRideCount: 0,
  recentRidesLoading: false,
  recentRidesFailed: false,
  pendingRideCount: 0,
};

describe('isFirstRun', () => {
  it('is true for an account with gear and nothing ridden', () => {
    expect(isFirstRun(READY)).toBe(true);
  });

  it('is false once any ride exists', () => {
    expect(isFirstRun({ ...READY, recentRideCount: 1 })).toBe(false);
  });

  // The rider logged these at the trailhead; they just have not uploaded.
  // Telling them to go get started would be wrong.
  it('counts rides queued offline as ridden', () => {
    expect(isFirstRun({ ...READY, pendingRideCount: 2 })).toBe(false);
  });

  // An empty array mid-fetch is not evidence of an empty account.
  it('waits for the read rather than claiming an empty account', () => {
    expect(isFirstRun({ ...READY, recentRidesLoading: true })).toBe(false);
    expect(isFirstRun({ ...READY, recentRidesFailed: true })).toBe(false);
    expect(isFirstRun({ ...READY, predictionsReady: false })).toBe(false);
  });
});

describe('showStatsBlock', () => {
  const BASE = { statsLoading: false, statsFailed: false, totalRides: 0 };

  // The tabs used to render over the card's deliberate null, leaving a rider
  // who had never ridden tapping four filters over empty space.
  it('hides the control when the block below it would be empty', () => {
    expect(showStatsBlock(BASE)).toBe(false);
  });

  it('shows once there are rides in the window', () => {
    expect(showStatsBlock({ ...BASE, totalRides: 1 })).toBe(true);
  });

  // The card draws a skeleton and an error state in these two, so the tabs
  // belong on screen with them.
  it('shows while loading and after a failure', () => {
    expect(showStatsBlock({ ...BASE, statsLoading: true })).toBe(true);
    expect(showStatsBlock({ ...BASE, statsFailed: true })).toBe(true);
  });
});
