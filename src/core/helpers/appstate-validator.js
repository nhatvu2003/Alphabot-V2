/**
 * AppState Validator - Enhanced Security & Validation
 * @author Alphabot Team  
 * @version 2.0.0
 */

/**
 * Validate Facebook AppState structure
 * @param {Array|Object} appstate - AppState data to validate
 * @returns {Object} Validation result
 */
export function validateAppState(appstate) {
  const result = {
    valid: false,
    userID: null,
    errors: [],
    cookieCount: 0
  };

  // Check if appstate exists
  if (!appstate) {
    result.errors.push('AppState is null or undefined');
    return result;
  }

  // Parse if string
  let parsedAppState;
  try {
    parsedAppState = typeof appstate === 'string' ? JSON.parse(appstate) : appstate;
  } catch (error) {
    result.errors.push(`Invalid JSON format: ${error.message}`);
    return result;
  }

  // Check if array
  if (!Array.isArray(parsedAppState)) {
    result.errors.push('AppState must be an array of cookies');
    return result;
  }

  // Check minimum cookie count
  if (parsedAppState.length < 10) {
    result.errors.push('AppState appears incomplete (too few cookies)');
    return result;
  }

  // Validate cookie structure
  const requiredCookies = ['c_user', 'xs', 'datr', 'sb'];
  const foundCookies = new Set();

  for (const cookie of parsedAppState) {
    // Validate cookie structure
    if (!cookie.key || !cookie.value) {
      result.errors.push('Invalid cookie structure (missing key/value)');
      continue;
    }

    foundCookies.add(cookie.key);

    // Extract user ID
    if (cookie.key === 'c_user') {
      result.userID = cookie.value;
    }
  }

  // Check for required cookies
  for (const required of requiredCookies) {
    if (!foundCookies.has(required)) {
      result.errors.push(`Missing required cookie: ${required}`);
    }
  }

  result.cookieCount = parsedAppState.length;
  result.valid = result.errors.length === 0 && result.userID;

  return result;
}

/**
 * Sanitize AppState for logging (remove sensitive data)
 * @param {Array} appstate - AppState array
 * @returns {Object} Sanitized info for logging
 */
export function sanitizeForLogging(appstate) {
  if (!Array.isArray(appstate)) return { error: 'Invalid appstate format' };

  const userCookie = appstate.find(c => c.key === 'c_user');
  const sessionCookie = appstate.find(c => c.key === 'xs');

  return {
    userID: userCookie?.value || 'Unknown',
    sessionExists: !!sessionCookie,
    cookieCount: appstate.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if AppState is expired or invalid
 * @param {Array} appstate - AppState array  
 * @returns {boolean} True if appears expired
 */
export function isExpired(appstate) {
  // Basic heuristics for expired sessions
  const sessionCookie = appstate.find(c => c.key === 'xs');
  if (!sessionCookie) return true;

  // Check for common expired session indicators
  const expiredPatterns = ['0%', 'expired', 'invalid'];
  return expiredPatterns.some(pattern => 
    sessionCookie.value.toLowerCase().includes(pattern)
  );
}