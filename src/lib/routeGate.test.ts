import { resolveGateRedirect, type GateInput } from './routeGate';

function gate(overrides: Partial<GateInput> = {}) {
  return resolveGateRedirect({
    segments: [],
    isAuthenticated: true,
    hasAcceptedCurrentTerms: true,
    onboardingCompleted: true,
    recorderLive: false,
    ...overrides,
  });
}

describe('resolveGateRedirect', () => {
  describe('provider OAuth callback mid-onboarding', () => {
    // Regression: an Android rider connecting Garmin from the onboarding
    // Connect step was sent back to the age screen 15ms after the deep link
    // landed, because the onboarding gate fired on the callback route before
    // the callback screen could route them back to Connect.
    it.each(['garmin', 'strava', 'whoop', 'suunto'])(
      'leaves /oauth/%s alone while onboarding is incomplete',
      (provider) => {
        expect(
          gate({ segments: ['oauth', provider], onboardingCompleted: false })
        ).toBeNull();
      }
    );

    it('leaves the callback alone even before terms are accepted', () => {
      expect(
        gate({
          segments: ['oauth', 'garmin'],
          hasAcceptedCurrentTerms: false,
          onboardingCompleted: false,
        })
      ).toBeNull();
    });

    it('leaves the callback alone for a fully onboarded rider', () => {
      expect(gate({ segments: ['oauth', 'strava'] })).toBeNull();
    });

    it('still sends a signed-out rider on the callback route to login', () => {
      expect(gate({ segments: ['oauth', 'garmin'], isAuthenticated: false })).toBe(
        '/(auth)/login'
      );
    });
  });

  describe('auth gate', () => {
    it('sends a signed-out rider to login from anywhere outside the auth group', () => {
      expect(gate({ segments: ['(tabs)'], isAuthenticated: false })).toBe('/(auth)/login');
      expect(gate({ segments: [], isAuthenticated: false })).toBe('/(auth)/login');
    });

    it('leaves a signed-out rider on the auth screens', () => {
      expect(gate({ segments: ['(auth)', 'login'], isAuthenticated: false })).toBeNull();
    });

    it('does not interrupt a live recording for a signed-out rider', () => {
      expect(
        gate({ segments: ['ride', 'record'], isAuthenticated: false, recorderLive: true })
      ).toBeNull();
      expect(
        gate({ segments: ['ride', 'save-recording'], isAuthenticated: false, recorderLive: true })
      ).toBeNull();
      expect(gate({ segments: ['ride', 'record'], isAuthenticated: false })).toBe(
        '/(auth)/login'
      );
    });
  });

  describe('signed-in rider on the auth group', () => {
    it('is moved on to the screen their flags call for', () => {
      expect(gate({ segments: ['(auth)', 'login'], hasAcceptedCurrentTerms: false })).toBe(
        '/(onboarding)/terms'
      );
      expect(gate({ segments: ['(auth)', 'login'], onboardingCompleted: false })).toBe(
        '/(onboarding)/age'
      );
      expect(gate({ segments: ['(auth)', 'login'] })).toBe('/(tabs)');
    });

    it('may stay on the reset-password and verify-email link screens', () => {
      expect(gate({ segments: ['(auth)', 'reset-password'] })).toBeNull();
      expect(gate({ segments: ['(auth)', 'verify-email'] })).toBeNull();
    });
  });

  describe('terms gate', () => {
    it('sends a rider without current terms to the terms screen', () => {
      expect(gate({ segments: ['(tabs)'], hasAcceptedCurrentTerms: false })).toBe(
        '/(onboarding)/terms'
      );
      expect(gate({ segments: ['(onboarding)', 'age'], hasAcceptedCurrentTerms: false })).toBe(
        '/(onboarding)/terms'
      );
    });

    it('leaves them on the terms screen', () => {
      expect(gate({ segments: ['(onboarding)', 'terms'], hasAcceptedCurrentTerms: false })).toBeNull();
    });
  });

  describe('onboarding gate', () => {
    it('sends a rider with onboarding incomplete into onboarding', () => {
      expect(gate({ segments: ['(tabs)'], onboardingCompleted: false })).toBe('/(onboarding)/age');
      expect(gate({ segments: [], onboardingCompleted: false })).toBe('/(onboarding)/age');
    });

    it('lets them move between onboarding steps, but not back to terms', () => {
      for (const step of ['age', 'bike', 'connect', 'notifications']) {
        expect(gate({ segments: ['(onboarding)', step], onboardingCompleted: false })).toBeNull();
      }
      expect(gate({ segments: ['(onboarding)', 'terms'], onboardingCompleted: false })).toBe(
        '/(onboarding)/age'
      );
    });
  });

  describe('fully onboarded rider', () => {
    it('is sent to tabs from the landing route and from onboarding', () => {
      expect(gate({ segments: [] })).toBe('/(tabs)');
      expect(gate({ segments: ['(onboarding)', 'connect'] })).toBe('/(tabs)');
    });

    it('is left alone elsewhere', () => {
      expect(gate({ segments: ['(tabs)', 'settings'] })).toBeNull();
      expect(gate({ segments: ['bike', 'abc'] })).toBeNull();
      expect(gate({ segments: ['ride', 'record'] })).toBeNull();
    });
  });
});
