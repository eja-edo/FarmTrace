/**
 * Throttle utility for rate-limiting realtime events
 * Prevents excessive emits by enforcing minimum time intervals
 */

const throttleMap = new Map();

/**
 * Throttle a function call by key
 * @param {string} key - Unique identifier for throttling (e.g., "deviceId:eventType")
 * @param {number} intervalMs - Minimum milliseconds between calls
 * @param {Function} fn - Function to throttle
 * @returns {boolean} - True if executed, false if throttled
 */
export function throttle(key, intervalMs, fn) {
    const now = Date.now();
    const lastExec = throttleMap.get(key);

    if (!lastExec || now - lastExec >= intervalMs) {
        throttleMap.set(key, now);
        fn();
        return true;
    }

    return false;
}

/**
 * Clear throttle state for a key
 * @param {string} key
 */
export function clearThrottle(key) {
    throttleMap.delete(key);
}

/**
 * Clear all throttle state
 */
export function clearAllThrottles() {
    throttleMap.clear();
}

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, timestamp] of throttleMap.entries()) {
        if (now - timestamp > maxAge) {
            throttleMap.delete(key);
        }
    }
}, 5 * 60 * 1000);
