// The client module constructs a PostHog instance at import time; this file
// only covers the pure helpers, so the SDK is stubbed out.
jest.mock('posthog-react-native', () => ({ __esModule: true, default: jest.fn() }));

import { posthogAutocapture, screenNameFromSegments } from './posthog';
import { clientHeaderValue } from './clientHeader';

describe('screenNameFromSegments', () => {
  it('keeps route patterns so ids never become separate screens', () => {
    expect(screenNameFromSegments(['bike', '[id]'])).toBe('/bike/[id]');
  });

  it('drops route groups', () => {
    expect(screenNameFromSegments(['(tabs)', 'gear'])).toBe('/gear');
    expect(screenNameFromSegments(['(onboarding)', 'terms'])).toBe('/terms');
  });

  it('names the root and the tabs index as /', () => {
    expect(screenNameFromSegments([])).toBe('/');
    expect(screenNameFromSegments(['(tabs)'])).toBe('/');
  });
});

describe('posthogAutocapture', () => {
  it('never captures element text or styles from touches', () => {
    expect(posthogAutocapture.propsToCapture).not.toContain('children');
    expect(posthogAutocapture.propsToCapture).not.toContain('style');
  });
});

describe('clientHeaderValue', () => {
  it('sends the OS and marketing version on native platforms', () => {
    expect(clientHeaderValue('ios', '1.4.0')).toBe('ios/1.4.0');
    expect(clientHeaderValue('android', '1.4.0')).toBe('android/1.4.0');
  });

  it('sends the OS alone when the version is missing or not x.y.z', () => {
    expect(clientHeaderValue('ios', null)).toBe('ios');
    expect(clientHeaderValue('ios', '1.4')).toBe('ios');
  });

  it('sends nothing on web, which the API identifies by its cookie', () => {
    expect(clientHeaderValue('web', '1.4.0')).toBeNull();
  });
});
