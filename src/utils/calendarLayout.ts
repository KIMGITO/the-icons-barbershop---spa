import { StaffBooking } from '../types/staff';
import { parseTimeToMinutes } from './timeUtils';

export interface PositionedBooking {
  booking: StaffBooking;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
}

const START_MINUTES = 8 * 60; // 08:00 AM = 480
const END_MINUTES = 20 * 60;  // 20:00 (08:00 PM) = 1200
const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 720 mins

/**
 * Calculates top, height, leftPercent, and widthPercent for bookings in a single day/column,
 * laying overlapping bookings side-by-side cleanly.
 */
export function computePositionedBookings(
  bookings: StaffBooking[],
  rowHeight: number = 80 // pixels per 60 minutes
): PositionedBooking[] {
  if (!bookings || bookings.length === 0) return [];

  // Filter out cancelled or out-of-bounds bookings
  const valid = bookings.filter(b => b.status !== 'cancelled');

  // Convert to numeric intervals
  const items = valid.map(b => {
    const start = parseTimeToMinutes(b.timeSlot);
    const duration = b.durationMinutes || 60;
    const end = b.endTime ? parseTimeToMinutes(b.endTime) : (start + duration);
    return {
      booking: b,
      start,
      end,
      duration
    };
  });

  // Sort by start time, then duration descending
  items.sort((a, b) => a.start - b.start || b.duration - a.duration);

  // Group into overlapping clusters
  const clusters: typeof items[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.end;
    } else if (item.start < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedBooking[] = [];

  for (const cluster of clusters) {
    // Assign column indices to items within cluster
    const columns: number[][] = []; // columns[colIdx] = array of end times

    const assignments = cluster.map(item => {
      let assignedCol = -1;
      for (let c = 0; c < columns.length; c++) {
        const lastEndInCol = columns[c][columns[c].length - 1];
        if (item.start >= lastEndInCol) {
          assignedCol = c;
          columns[c].push(item.end);
          break;
        }
      }
      if (assignedCol === -1) {
        assignedCol = columns.length;
        columns.push([item.end]);
      }
      return { item, col: assignedCol };
    });

    const totalCols = Math.max(1, columns.length);

    for (const { item, col } of assignments) {
      // Calculate top and height relative to START_MINUTES
      const clampedStart = Math.max(START_MINUTES, item.start);
      const top = ((clampedStart - START_MINUTES) / 60) * rowHeight;
      const height = (item.duration / 60) * rowHeight;

      const widthPercent = 100 / totalCols;
      const leftPercent = col * widthPercent;

      result.push({
        booking: item.booking,
        top,
        height,
        leftPercent,
        widthPercent
      });
    }
  }

  return result;
}
