// Schedule utility functions for calculating next opening time

export interface DailySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isOpen: boolean;
}

export interface ScheduleInfo {
  dailySchedule: DailySchedule[];
  timezone?: string;
}

/**
 * Calculate the next opening time for a restaurant/venue
 * @param schedules Array of schedule objects (venue and restaurant schedules)
 * @param timezone Timezone string (defaults to 'Asia/Dubai')
 * @returns Formatted string like "Today at 9:00 AM" or "Tomorrow at 10:00 AM"
 */
export const calculateNextOpenTime = (
  schedules: ScheduleInfo[],
  timezone: string = 'Asia/Dubai'
): string => {
  if (!schedules || schedules.length === 0) {
    return 'Schedule unavailable';
  }

  // Get current time in the specified timezone
  const now = new Date();
  const currentTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const currentDayOfWeek = currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Find the most restrictive schedule (if restaurant says closed at 10PM and venue says closed at 9PM, use 9PM)
  // For opening times, use the latest opening time (if restaurant opens at 9AM and venue opens at 10AM, use 10AM)
  
  // Combine all daily schedules and find the effective schedule for each day
  const effectiveSchedule: DailySchedule[] = [];
  
  for (let day = 0; day < 7; day++) {
    const daySchedules = schedules
      .map(s => s.dailySchedule.find(d => d.dayOfWeek === day))
      .filter(Boolean) as DailySchedule[];
    
    if (daySchedules.length === 0) {
      effectiveSchedule.push({
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '22:00',
        isOpen: false
      });
      continue;
    }

    // If any schedule says closed, the restaurant is closed
    const isOpen = daySchedules.every(schedule => schedule.isOpen);
    
    if (!isOpen) {
      effectiveSchedule.push({
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '22:00',
        isOpen: false
      });
      continue;
    }

    // Find the latest opening time (most restrictive)
    const latestOpenTime = daySchedules.reduce((latest, schedule) => {
      const scheduleMinutes = timeToMinutes(schedule.startTime);
      const latestMinutes = timeToMinutes(latest);
      return scheduleMinutes > latestMinutes ? schedule.startTime : latest;
    }, daySchedules[0].startTime);

    // Find the earliest closing time (most restrictive)
    const earliestCloseTime = daySchedules.reduce((earliest, schedule) => {
      const scheduleMinutes = timeToMinutes(schedule.endTime);
      const earliestMinutes = timeToMinutes(earliest);
      return scheduleMinutes < earliestMinutes ? schedule.endTime : earliest;
    }, daySchedules[0].endTime);

    effectiveSchedule.push({
      dayOfWeek: day,
      startTime: latestOpenTime,
      endTime: earliestCloseTime,
      isOpen: true
    });
  }

  // Check if restaurant opens later today
  const todaySchedule = effectiveSchedule.find(s => s.dayOfWeek === currentDayOfWeek);
  if (todaySchedule && todaySchedule.isOpen) {
    const openTimeInMinutes = timeToMinutes(todaySchedule.startTime);
    
    if (currentTimeInMinutes < openTimeInMinutes) {
      const formattedTime = formatTime(todaySchedule.startTime);
      return `Today at ${formattedTime}`;
    }
  }

  // Find the next open day
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDayOfWeek + i) % 7;
    const nextDaySchedule = effectiveSchedule.find(s => s.dayOfWeek === nextDay);
    
    if (nextDaySchedule && nextDaySchedule.isOpen) {
      const formattedTime = formatTime(nextDaySchedule.startTime);
      
      if (i === 1) {
        return `Tomorrow at ${formattedTime}`;
      } else {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${dayNames[nextDay]} at ${formattedTime}`;
      }
    }
  }

  return 'Schedule unavailable';
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format time string from 24-hour to 12-hour format
 */
function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}