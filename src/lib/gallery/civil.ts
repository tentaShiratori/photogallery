export type CivilCapture = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

export class CaptureInstant {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;

  private constructor(year: number, month: number, day: number, hour: number, minute: number, second: number) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
  }

  static tryCreate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
  ): CaptureInstant | null {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      !Number.isInteger(second)
    ) {
      return null;
    }
    if (year < 1 || year > 9999) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;
    if (second < 0 || second > 60) return null;
    return new CaptureInstant(year, month, day, hour, minute, second);
  }

  toCivil(): CivilCapture {
    return {
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      second: this.second,
    };
  }
}

export function civilFromParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): CivilCapture | null {
  const instant = CaptureInstant.tryCreate(year, month, day, hour, minute, second);
  return instant ? instant.toCivil() : null;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  const days = [0, 31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month] ?? 0;
}
