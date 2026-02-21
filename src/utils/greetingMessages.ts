/**
 * Get time-of-day greeting based on current hour
 */
export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening';
  } else {
    return 'Good evening';
  }
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Format distance in miles
 */
export function formatDistance(miles: number): string {
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

/**
 * Format elevation in feet
 */
export function formatElevation(feet: number): string {
  return `${Math.round(feet).toLocaleString()} ft`;
}

/**
 * Format date for ride display
 */
export function formatRideDate(dateString: string | Date): string {
  // Handle both Date objects and ISO strings
  const date = dateString instanceof Date ? dateString : new Date(dateString);

  // Check for invalid date
  if (isNaN(date.getTime())) {
    // Try parsing as a timestamp number if string
    if (typeof dateString === 'string') {
      const timestamp = parseInt(dateString, 10);
      if (!isNaN(timestamp)) {
        return formatRideDate(new Date(timestamp));
      }
    }
    return 'Unknown date';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DEFAULT_MESSAGES = [
  'Ready for your next ride?',
  'Your bikes are waiting!',
  'Time to hit the trails?',
  'Keep the rubber side down!',
  'Adventure awaits!',
];

/**
 * Get a random motivational message
 */
export function getRandomDefaultMessage(): string {
  const index = Math.floor(Math.random() * DEFAULT_MESSAGES.length);
  return DEFAULT_MESSAGES[index];
}

/**
 * Get contextual insight based on bike health
 */
export function getBikeHealthInsight(
  dueNowCount: number,
  dueSoonCount: number
): { message: string; emoji: string } | null {
  if (dueNowCount > 0) {
    return {
      message: `${dueNowCount} component${dueNowCount > 1 ? 's' : ''} need${dueNowCount === 1 ? 's' : ''} service now`,
      emoji: '🔧',
    };
  }
  if (dueSoonCount > 0) {
    return {
      message: `${dueSoonCount} component${dueSoonCount > 1 ? 's' : ''} due for service soon`,
      emoji: '👀',
    };
  }
  return null;
}
