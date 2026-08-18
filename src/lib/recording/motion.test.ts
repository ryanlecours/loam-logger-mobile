import {
  AUTO_PAUSE_SPEED_MPS,
  AUTO_RESUME_SPEED_MPS,
  MOTION_MIN_SPAN_S,
  MOTION_WINDOW_S,
  MotionWindow,
  nextMotionState,
} from './motion';

/** Metres of latitude, as a coordinate offset. 1 degree is ~111,320 m. */
const north = (meters: number) => meters / 111320;

const BASE = { latitude: 47.6062, longitude: -122.3321 };

describe('MotionWindow', () => {
  it('has no opinion until the window has enough span', () => {
    const window = new MotionWindow();
    window.push({ t: 0, ...BASE });
    expect(window.speedMps()).toBeNull();
    window.push({ t: MOTION_MIN_SPAN_S - 1, ...BASE });
    expect(window.speedMps()).toBeNull();
  });

  it('reports the ground speed of a rider covering distance', () => {
    const window = new MotionWindow();
    for (let t = 0; t <= 10; t++) {
      window.push({ t, latitude: BASE.latitude + north(4 * t), longitude: BASE.longitude });
    }
    expect(window.speedMps()).toBeGreaterThan(3.9);
    expect(window.speedMps()).toBeLessThan(4.1);
  });

  // The reason this measures net displacement rather than summed path length:
  // summed jitter is precisely the quantity that never cancels, so a standing
  // rider would show a steady walking pace and auto-pause would never fire.
  it('reads a standing rider as stopped despite constant GPS jitter', () => {
    const window = new MotionWindow();
    for (let t = 0; t <= 12; t++) {
      window.push({
        t,
        latitude: BASE.latitude + north(t % 2 === 0 ? 3 : -3),
        longitude: BASE.longitude,
      });
    }
    expect(window.speedMps()).toBeLessThan(AUTO_PAUSE_SPEED_MPS);
  });

  it('drops samples that fall out of the trailing window', () => {
    const window = new MotionWindow();
    // A long, fast run, then a stop. Once the moving samples age out, the
    // verdict has to be about the stop and not about the run.
    for (let t = 0; t <= 30; t++) {
      window.push({ t, latitude: BASE.latitude + north(5 * t), longitude: BASE.longitude });
    }
    const parked = BASE.latitude + north(5 * 30);
    for (let t = 31; t <= 31 + MOTION_WINDOW_S; t++) {
      window.push({ t, latitude: parked, longitude: BASE.longitude });
    }
    expect(window.speedMps()).toBeLessThan(AUTO_PAUSE_SPEED_MPS);
  });

  it('forgets everything on reset', () => {
    const window = new MotionWindow();
    for (let t = 0; t <= 10; t++) {
      window.push({ t, latitude: BASE.latitude + north(4 * t), longitude: BASE.longitude });
    }
    window.reset();
    expect(window.speedMps()).toBeNull();
  });
});

describe('nextMotionState', () => {
  it('keeps the current state when the window has no opinion', () => {
    expect(nextMotionState(true, null)).toBe(true);
    expect(nextMotionState(false, null)).toBe(false);
  });

  it('stops a moving rider below the pause threshold', () => {
    expect(nextMotionState(true, AUTO_PAUSE_SPEED_MPS - 0.01)).toBe(false);
    expect(nextMotionState(true, AUTO_PAUSE_SPEED_MPS)).toBe(true);
  });

  it('restarts a stopped rider above the resume threshold', () => {
    expect(nextMotionState(false, AUTO_RESUME_SPEED_MPS + 0.01)).toBe(true);
    expect(nextMotionState(false, AUTO_RESUME_SPEED_MPS)).toBe(false);
  });

  // The gap between the two thresholds is what stops the state flapping every
  // few seconds for a rider trackstanding or ratcheting up a technical climb.
  it('holds either state in the band between the thresholds', () => {
    const between = (AUTO_PAUSE_SPEED_MPS + AUTO_RESUME_SPEED_MPS) / 2;
    expect(nextMotionState(true, between)).toBe(true);
    expect(nextMotionState(false, between)).toBe(false);
  });
});
