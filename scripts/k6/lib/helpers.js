import { sleep } from 'k6';

/**
 * Sleeps for a randomized duration between min and max seconds.
 * Mimics realistic human reading/typing pauses (think-time).
 */
export function sleepWithJitter(minSec = 0.5, maxSec = 2.0) {
  const duration = minSec + Math.random() * (maxSec - minSec);
  sleep(duration);
}

/**
 * Returns a random integer between min and max inclusive.
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array.
 */
export function randomChoice(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
