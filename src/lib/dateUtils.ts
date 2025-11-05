/**
 * Formats event date or date range in Norwegian
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - Optional end date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatEventDateRange(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  
  // Single day event (no end date or same as start date)
  if (!endDate || endDate === startDate) {
    return start.toLocaleDateString('nb-NO', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }
  
  const end = new Date(endDate);
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  // Same month and year: "13-15. november 2025"
  if (startMonth === endMonth && startYear === endYear) {
    const monthName = start.toLocaleDateString('nb-NO', { month: 'long' });
    return `${startDay}-${endDay}. ${monthName} ${startYear}`;
  }
  
  // Different months, same year: "30. oktober - 2. november 2025"
  if (startYear === endYear) {
    const startMonthName = start.toLocaleDateString('nb-NO', { month: 'long' });
    const endMonthName = end.toLocaleDateString('nb-NO', { month: 'long' });
    return `${startDay}. ${startMonthName} - ${endDay}. ${endMonthName} ${startYear}`;
  }
  
  // Different years: "28. desember 2025 - 3. januar 2026"
  const startFormatted = start.toLocaleDateString('nb-NO', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const endFormatted = end.toLocaleDateString('nb-NO', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  return `${startFormatted} - ${endFormatted}`;
}
