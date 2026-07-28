import { triageBikes, type BikeUsage } from './useBikeTriage';
import { PredictionStatus } from '../graphql/generated';
import type { BikeFieldsFragment, ComponentPrediction } from '../graphql/generated';

const { Overdue, DueNow, DueSoon, AllGood } = PredictionStatus;

/**
 * These cover the rules that are easy to "fix" into being wrong: the
 * recency-then-usage order (an owner decision, not worst-first), the free-tier
 * path where `status` is nulled, and the three-way split that keeps an
 * untracked frameset out of the good-to-go bucket.
 */

function prediction(over: Partial<ComponentPrediction> = {}): ComponentPrediction {
  return {
    componentId: 'c1',
    componentType: 'FORK',
    status: AllGood,
    hoursRemaining: 20,
    hoursSinceService: 10,
    ridesSinceService: 4,
    serviceIntervalHours: 50,
    ...over,
  } as ComponentPrediction;
}

function bike(id: string, nickname: string, components: ComponentPrediction[]): BikeFieldsFragment {
  return {
    id,
    nickname,
    manufacturer: 'Santa Cruz',
    model: 'Hightower',
    components: [],
    predictions: { components },
  } as unknown as BikeFieldsFragment;
}

const usageOf = (entries: Record<string, BikeUsage>) => new Map(Object.entries(entries));

describe('triageBikes', () => {
  it('sorts by most recently ridden, not by severity', () => {
    const beater = bike('beater', 'Beater', [
      prediction({ componentId: 'a', status: Overdue, hoursSinceService: 200 }),
    ]);
    const daily = bike('daily', 'Daily', [
      prediction({ componentId: 'b', status: DueSoon, hoursSinceService: 40 }),
    ]);

    const { needsAttention } = triageBikes(
      [beater, daily],
      usageOf({
        beater: { lastRiddenAt: 1_000, usageSeconds: 3600 },
        daily: { lastRiddenAt: 9_000, usageSeconds: 3600 },
      }),
      true,
    );

    // The overdue beater is worse. The bike ridden yesterday still leads.
    expect(needsAttention.map((t) => t.bike.id)).toEqual(['daily', 'beater']);
  });

  it('breaks a recency tie with total usage', () => {
    const rare = bike('rare', 'Rare', [prediction({ status: DueNow })]);
    const ridden = bike('ridden', 'Ridden', [prediction({ status: DueNow })]);

    const { needsAttention } = triageBikes(
      [rare, ridden],
      usageOf({
        rare: { lastRiddenAt: 5_000, usageSeconds: 100 },
        ridden: { lastRiddenAt: 5_000, usageSeconds: 90_000 },
      }),
      true,
    );

    expect(needsAttention.map((t) => t.bike.id)).toEqual(['ridden', 'rare']);
  });

  it('sorts a bike with no rides in the window below every bike that has one', () => {
    const unridden = bike('unridden', 'Unridden', [prediction({ status: Overdue })]);
    const ridden = bike('ridden', 'Ridden', [prediction({ status: DueSoon })]);

    const { needsAttention } = triageBikes(
      [unridden, ridden],
      usageOf({ ridden: { lastRiddenAt: 10, usageSeconds: 60 } }),
      true,
    );

    expect(needsAttention.map((t) => t.bike.id)).toEqual(['ridden', 'unridden']);
  });

  it('orders components worst-first inside a bike', () => {
    const b = bike('b', 'B', [
      prediction({ componentId: 'soon', status: DueSoon }),
      prediction({ componentId: 'overdue', status: Overdue }),
      prediction({ componentId: 'now', status: DueNow }),
    ]);

    const { needsAttention } = triageBikes([b], usageOf({}), true);

    expect(needsAttention[0].components.map((c) => c.componentId)).toEqual([
      'overdue',
      'now',
      'soon',
    ]);
  });

  it('flags a past-interval component on the free tier, where status is null', () => {
    // This is the shape that produced a false "Ready to ride": every predictive
    // field nulled, only the raw counters left.
    const b = bike('b', 'B', [
      prediction({
        componentId: 'fork',
        status: null,
        hoursRemaining: null,
        hoursSinceService: 90,
        serviceIntervalHours: 50,
      }),
    ]);

    const { needsAttention, healthy } = triageBikes([b], usageOf({}), false);

    expect(healthy).toHaveLength(0);
    expect(needsAttention[0].components.map((c) => c.componentId)).toEqual(['fork']);
  });

  it('leaves a within-interval component alone on the free tier', () => {
    const b = bike('b', 'B', [
      prediction({
        status: null,
        hoursRemaining: null,
        hoursSinceService: 10,
        serviceIntervalHours: 50,
      }),
    ]);

    const { needsAttention, healthy } = triageBikes([b], usageOf({}), false);

    expect(needsAttention).toHaveLength(0);
    expect(healthy.map((x) => x.id)).toEqual(['b']);
  });

  it('treats a component with no interval as untriageable rather than overdue', () => {
    const b = bike('b', 'B', [
      prediction({
        status: null,
        hoursSinceService: 500,
        serviceIntervalHours: 0,
      }),
    ]);

    expect(triageBikes([b], usageOf({}), false).healthy.map((x) => x.id)).toEqual(['b']);
  });

  it('separates a bike with nothing tracked from the healthy ones', () => {
    const empty = bike('empty', 'Frameset', []);
    const good = bike('good', 'Good', [prediction({ status: AllGood })]);

    const { needsAttention, healthy, untracked } = triageBikes([empty, good], usageOf({}), true);

    expect(needsAttention).toHaveLength(0);
    expect(healthy.map((x) => x.id)).toEqual(['good']);
    expect(untracked.map((x) => x.id)).toEqual(['empty']);
  });

  it('returns a stable order for bikes with no ride history', () => {
    const zed = bike('z', 'Zed', [prediction({ status: Overdue })]);
    const ada = bike('a', 'Ada', [prediction({ status: Overdue })]);

    expect(triageBikes([zed, ada], usageOf({}), true).needsAttention.map((t) => t.bike.id)).toEqual(
      ['a', 'z'],
    );
  });
});
