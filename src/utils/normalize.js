/**
 * Normalizes numeric strings in an object to numbers
 * Recursively processes nested objects and arrays
 */
export function normalizeNumericStrings(value) {
    if (typeof value === 'string') {
        // Try to convert to number if it's a valid numeric string
        const num = Number(value);
        return !isNaN(num) ? num : value;
    }

    if (Array.isArray(value)) {
        return value.map(item => normalizeNumericStrings(item));
    }

    if (value && typeof value === 'object') {
        const normalized = {};
        for (const [key, val] of Object.entries(value)) {
            normalized[key] = normalizeNumericStrings(val);
        }
        return normalized;
    }

    return value;
}

/**
 * Filters out fields that aren't in the allowed schema
 * Useful for cleaning payloads before validation
 */
export function filterPayload(payload, allowedFields) {
    const filtered = {};
    for (const field of allowedFields) {
        if (payload[field] !== undefined) {
            filtered[field] = payload[field];
        }
    }
    return filtered;
}
