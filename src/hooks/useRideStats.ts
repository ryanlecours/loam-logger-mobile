import { useMemo } from 'react';
import { useRidesPageQuery } from '../graphql/generated';
import { useBikesWithPredictions } from './useBikesWithPredictions';

export type TimeframeOption = '7d' | '30d' | '90d' | 'YTD';

export interface PersonalRecord {
  type: 'longest_ride' | 'most_elevation' | 'longest_duration';
  value: number;
  date: string;
  rideId: string;
}

export interface LocationBreakdown {
  name: string;
  rideCount: number;
  totalHours: number;
  percentage: number;
}

export interface BikeTimeData {
  name: string;
  hours: number;
  percentage: number;
}

export interface RideStats {
  // Primary metrics
  totalRides: number;
  totalDistance: number; // miles
  totalElevation: number; // feet
  totalHours: number;

  // Averages
  avgDistancePerRide: number;
  avgElevationPerRide: number;
  avgDurationMinutes: number;

  // Trends
  weekOverWeekDistance: number | null;
  weekOverWeekRides: number | null;
  currentStreak: number;
  longestStreak: number;
  personalRecords: PersonalRecord[];

  // Heart Rate
  averageHr: number | null;
  maxHr: number | null;
  ridesWithHr: number;

  // Locations
  topLocations: LocationBreakdown[];

  // Bike usage
  bikeTime: BikeTimeData[];
}

const DAYS_MS = 24 * 60 * 60 * 1000;

function getStartDateForTimeframe(timeframe: TimeframeOption): Date {
  const now = new Date();

  switch (timeframe) {
    case '7d':
      return new Date(now.getTime() - 7 * DAYS_MS);
    case '30d':
      return new Date(now.getTime() - 30 * DAYS_MS);
    case '90d':
      return new Date(now.getTime() - 90 * DAYS_MS);
    case 'YTD':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getTime() - 30 * DAYS_MS);
  }
}

function parseStartTime(value: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num)) return num < 1e12 ? num * 1000 : num;
    return null;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeStreaks(
  rides: { startTime: string }[]
): { currentStreak: number; longestStreak: number } {
  if (rides.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const rideDates = new Set(
    rides
      .map((r) => parseStartTime(r.startTime))
      .filter((t): t is number => t !== null)
      .map((t) => new Date(t).toDateString())
  );

  if (rideDates.size === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - DAYS_MS).toDateString();

  const sortedDates = Array.from(rideDates).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  let longestStreak = 1;
  let currentRunStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]).getTime();
    const currDate = new Date(sortedDates[i]).getTime();
    const diffDays = (prevDate - currDate) / DAYS_MS;

    if (Math.abs(diffDays - 1) < 0.1) {
      currentRunStreak++;
      longestStreak = Math.max(longestStreak, currentRunStreak);
    } else {
      currentRunStreak = 1;
    }
  }

  const hasRecentRide = rideDates.has(today) || rideDates.has(yesterday);
  let currentStreak = 0;

  if (hasRecentRide) {
    currentStreak = 1;
    const startDate = rideDates.has(today) ? today : yesterday;
    let checkDate = new Date(startDate);

    while (true) {
      checkDate = new Date(checkDate.getTime() - DAYS_MS);
      if (rideDates.has(checkDate.toDateString())) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

type RideData = {
  id: string;
  startTime: string;
  durationSeconds: number;
  distanceMiles: number;
  elevationGainFeet: number;
  averageHr?: number | null;
  bikeId?: string | null;
  location?: string | null;
};

export function useRideStats(timeframe: TimeframeOption = '30d') {
  const { data, loading, refetch } = useRidesPageQuery({
    variables: { take: 500 },
    fetchPolicy: 'cache-and-network',
  });

  const { bikes } = useBikesWithPredictions();

  // Build bike name map
  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    bikes.forEach((bike) => {
      const name = bike.nickname || `${bike.manufacturer} ${bike.model}`;
      map.set(bike.id, name);
    });
    return map;
  }, [bikes]);

  const stats = useMemo<RideStats>(() => {
    const emptyStats: RideStats = {
      totalRides: 0,
      totalDistance: 0,
      totalElevation: 0,
      totalHours: 0,
      avgDistancePerRide: 0,
      avgElevationPerRide: 0,
      avgDurationMinutes: 0,
      weekOverWeekDistance: null,
      weekOverWeekRides: null,
      currentStreak: 0,
      longestStreak: 0,
      personalRecords: [],
      averageHr: null,
      maxHr: null,
      ridesWithHr: 0,
      topLocations: [],
      bikeTime: [],
    };

    if (!data?.rides) return emptyStats;

    const allRides = data.rides as RideData[];
    const startDate = getStartDateForTimeframe(timeframe);
    const startTs = startDate.getTime();

    // Filter rides by timeframe
    const filteredRides = allRides.filter((ride) => {
      const ts = parseStartTime(ride.startTime);
      return ts !== null && ts >= startTs;
    });

    const totalRides = filteredRides.length;
    if (totalRides === 0) return emptyStats;

    // Primary metrics
    let totalDistance = 0;
    let totalElevation = 0;
    let totalSeconds = 0;
    const bikeHours = new Map<string, number>();
    const locationMap = new Map<string, { count: number; hours: number }>();

    // Heart rate tracking
    const hrValues: number[] = [];

    // Personal records tracking
    let longestDistanceRide: RideData | null = null;
    let mostElevationRide: RideData | null = null;
    let longestDurationRide: RideData | null = null;

    for (const ride of filteredRides) {
      const distance = Math.max(ride.distanceMiles ?? 0, 0);
      const elevation = Math.max(ride.elevationGainFeet ?? 0, 0);
      const seconds = Math.max(ride.durationSeconds ?? 0, 0);
      const hours = seconds / 3600;

      totalDistance += distance;
      totalElevation += elevation;
      totalSeconds += seconds;

      // Bike time
      const bikeLabel = ride.bikeId ? bikeNameMap.get(ride.bikeId) || 'Unknown' : 'Unassigned';
      bikeHours.set(bikeLabel, (bikeHours.get(bikeLabel) ?? 0) + hours);

      // Location tracking
      if (ride.location?.trim()) {
        const loc = ride.location.trim();
        const existing = locationMap.get(loc) || { count: 0, hours: 0 };
        locationMap.set(loc, { count: existing.count + 1, hours: existing.hours + hours });
      }

      // Heart rate
      if (ride.averageHr && ride.averageHr > 0) {
        hrValues.push(ride.averageHr);
      }

      // Personal records
      if (!longestDistanceRide || distance > longestDistanceRide.distanceMiles) {
        longestDistanceRide = ride;
      }
      if (!mostElevationRide || elevation > mostElevationRide.elevationGainFeet) {
        mostElevationRide = ride;
      }
      if (!longestDurationRide || seconds > longestDurationRide.durationSeconds) {
        longestDurationRide = ride;
      }
    }

    const totalHours = totalSeconds / 3600;

    // Week over week trends (use all rides, not filtered)
    const now = Date.now();
    const oneWeekAgo = now - 7 * DAYS_MS;
    const twoWeeksAgo = now - 14 * DAYS_MS;

    const thisWeekRides = allRides.filter((r) => {
      const ts = parseStartTime(r.startTime);
      return ts !== null && ts >= oneWeekAgo;
    });

    const lastWeekRides = allRides.filter((r) => {
      const ts = parseStartTime(r.startTime);
      return ts !== null && ts >= twoWeeksAgo && ts < oneWeekAgo;
    });

    const thisWeekDistance = thisWeekRides.reduce((sum, r) => sum + (r.distanceMiles ?? 0), 0);
    const lastWeekDistance = lastWeekRides.reduce((sum, r) => sum + (r.distanceMiles ?? 0), 0);

    const weekOverWeekDistance =
      lastWeekDistance > 0
        ? Math.round(((thisWeekDistance - lastWeekDistance) / lastWeekDistance) * 100)
        : null;

    const weekOverWeekRides =
      lastWeekRides.length > 0
        ? Math.round(((thisWeekRides.length - lastWeekRides.length) / lastWeekRides.length) * 100)
        : null;

    // Streaks
    const { currentStreak, longestStreak } = computeStreaks(allRides);

    // Personal records
    const personalRecords: PersonalRecord[] = [];
    if (longestDistanceRide && longestDistanceRide.distanceMiles > 0) {
      personalRecords.push({
        type: 'longest_ride',
        value: longestDistanceRide.distanceMiles,
        date: longestDistanceRide.startTime,
        rideId: longestDistanceRide.id,
      });
    }
    if (mostElevationRide && mostElevationRide.elevationGainFeet > 0) {
      personalRecords.push({
        type: 'most_elevation',
        value: mostElevationRide.elevationGainFeet,
        date: mostElevationRide.startTime,
        rideId: mostElevationRide.id,
      });
    }
    if (longestDurationRide && longestDurationRide.durationSeconds > 0) {
      personalRecords.push({
        type: 'longest_duration',
        value: longestDurationRide.durationSeconds,
        date: longestDurationRide.startTime,
        rideId: longestDurationRide.id,
      });
    }

    // Heart rate stats
    const averageHr = hrValues.length > 0
      ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
      : null;
    const maxHr = hrValues.length > 0 ? Math.max(...hrValues) : null;

    // Location breakdown
    const topLocations: LocationBreakdown[] = Array.from(locationMap.entries())
      .map(([name, data]) => ({
        name,
        rideCount: data.count,
        totalHours: Number(data.hours.toFixed(1)),
        percentage: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5);

    // Bike time breakdown
    const bikeTime: BikeTimeData[] = Array.from(bikeHours.entries())
      .map(([name, hours]) => ({
        name,
        hours: Number(hours.toFixed(1)),
        percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      }))
      .sort((a, b) => b.hours - a.hours);

    return {
      totalRides,
      totalDistance: Number(totalDistance.toFixed(1)),
      totalElevation: Math.round(totalElevation),
      totalHours: Number(totalHours.toFixed(1)),
      avgDistancePerRide: Number((totalDistance / totalRides).toFixed(1)),
      avgElevationPerRide: Math.round(totalElevation / totalRides),
      avgDurationMinutes: Math.round(totalSeconds / 60 / totalRides),
      weekOverWeekDistance,
      weekOverWeekRides,
      currentStreak,
      longestStreak,
      personalRecords,
      averageHr,
      maxHr,
      ridesWithHr: hrValues.length,
      topLocations,
      bikeTime,
    };
  }, [data?.rides, timeframe, bikeNameMap]);

  return {
    stats,
    loading,
    refetch,
  };
}
