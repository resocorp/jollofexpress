// Operating hours validation and time-based auto-close utilities
import { createServiceClient } from '@/lib/supabase/service';

// Restaurant timezone (Nigeria)
const RESTAURANT_TIMEZONE = 'Africa/Lagos';

// Day names matching database schema
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface DayHours {
  open: string;      // "09:00"
  close: string;     // "21:00"
  closed: boolean;
}

type OperatingHours = Record<DayOfWeek, DayHours>;

/**
 * Get operating hours from database
 */
async function getOperatingHours(): Promise<OperatingHours | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'operating_hours')
    .single();

  if (error || !data) {
    console.error('Error fetching operating hours:', error);
    return null;
  }

  return data.value as OperatingHours;
}

/**
 * Get current time in restaurant timezone
 */
function getNowInTimezone(): Date {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: RESTAURANT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  );
}

/**
 * Get current day of week as lowercase string
 */
function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = getNowInTimezone();
  return days[now.getDay()];
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current time in minutes since midnight (in restaurant timezone)
 */
function getCurrentTimeInMinutes(): number {
  const now = getNowInTimezone();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Format minutes to HH:MM AM/PM
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get today's operating hours
 */
export async function getTodayHours(): Promise<DayHours | null> {
  const hours = await getOperatingHours();
  if (!hours) return null;

  const today = getCurrentDay();
  return hours[today];
}

/**
 * Check if current time is within today's operating hours
 * Returns true if restaurant should be open based on time
 */
export async function isWithinOperatingHours(): Promise<boolean> {
  const todayHours = await getTodayHours();
  
  if (!todayHours) {
    // If no hours configured, default to closed
    console.warn('No operating hours configured, defaulting to closed');
    return false;
  }

  // If marked as closed for the day
  if (todayHours.closed) {
    return false;
  }

  const currentMinutes = getCurrentTimeInMinutes();
  const openMinutes = timeToMinutes(todayHours.open);
  const closeMinutes = timeToMinutes(todayHours.close);

  // Check if current time is between open and close
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Get time until next status change (open or close)
 * Returns null if no hours configured or closed all day
 */
export async function getTimeUntilStatusChange(): Promise<{
  action: 'open' | 'close';
  minutes: number;
  formattedTime: string;
} | null> {
  const todayHours = await getTodayHours();
  
  if (!todayHours || todayHours.closed) {
    return null;
  }

  const currentMinutes = getCurrentTimeInMinutes();
  const openMinutes = timeToMinutes(todayHours.open);
  const closeMinutes = timeToMinutes(todayHours.close);

  // Before opening time
  if (currentMinutes < openMinutes) {
    return {
      action: 'open',
      minutes: openMinutes - currentMinutes,
      formattedTime: formatTime(openMinutes),
    };
  }

  // Between open and close
  if (currentMinutes < closeMinutes) {
    return {
      action: 'close',
      minutes: closeMinutes - currentMinutes,
      formattedTime: formatTime(closeMinutes),
    };
  }

  // After closing time - already closed
  return null;
}

/**
 * Get formatted operating hours for display
 */
export async function getFormattedTodayHours(): Promise<string> {
  const todayHours = await getTodayHours();
  
  if (!todayHours) {
    return 'Hours not available';
  }

  if (todayHours.closed) {
    return 'Closed today';
  }

  const openTime = formatTime(timeToMinutes(todayHours.open));
  const closeTime = formatTime(timeToMinutes(todayHours.close));

  return `${openTime} - ${closeTime}`;
}

/**
 * Get all operating hours formatted for display
 */
export async function getAllFormattedHours(): Promise<Record<DayOfWeek, string>> {
  const hours = await getOperatingHours();
  
  if (!hours) {
    return {
      monday: 'Not available',
      tuesday: 'Not available',
      wednesday: 'Not available',
      thursday: 'Not available',
      friday: 'Not available',
      saturday: 'Not available',
      sunday: 'Not available',
    };
  }

  const formatted: Record<DayOfWeek, string> = {} as Record<DayOfWeek, string>;
  
  for (const [day, dayHours] of Object.entries(hours)) {
    if (dayHours.closed) {
      formatted[day as DayOfWeek] = 'Closed';
    } else {
      const openTime = formatTime(timeToMinutes(dayHours.open));
      const closeTime = formatTime(timeToMinutes(dayHours.close));
      formatted[day as DayOfWeek] = `${openTime} - ${closeTime}`;
    }
  }

  return formatted;
}

/**
 * Check if restaurant should be open right now
 * Considers operating hours (does NOT check is_open flag or capacity)
 */
export async function shouldBeOpenNow(): Promise<{
  shouldBeOpen: boolean;
  reason: string;
  todayHours?: DayHours;
}> {
  const todayHours = await getTodayHours();
  
  if (!todayHours) {
    return {
      shouldBeOpen: false,
      reason: 'Operating hours not configured',
    };
  }

  if (todayHours.closed) {
    return {
      shouldBeOpen: false,
      reason: `Closed on ${getCurrentDay()}s`,
      todayHours,
    };
  }

  const currentMinutes = getCurrentTimeInMinutes();
  const openMinutes = timeToMinutes(todayHours.open);
  const closeMinutes = timeToMinutes(todayHours.close);

  if (currentMinutes < openMinutes) {
    return {
      shouldBeOpen: false,
      reason: `Opens at ${formatTime(openMinutes)}`,
      todayHours,
    };
  }

  if (currentMinutes >= closeMinutes) {
    return {
      shouldBeOpen: false,
      reason: `Closed for the day (closes at ${formatTime(closeMinutes)})`,
      todayHours,
    };
  }

  return {
    shouldBeOpen: true,
    reason: 'Within operating hours',
    todayHours,
  };
}
