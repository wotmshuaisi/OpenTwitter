// Input sanitization middleware
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/&/g, '&amp;') // Escape ampersands
    .replace(/"/g, '&quot;') // Escape quotes
    .replace(/'/g, '&#x27;'); // Escape single quotes
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized;
};

// Sanitize post body
function sanitizePostBody(body) {
  if (!body) return '';
  
  let sanitized = body
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  return sanitized;
}

// Sanitize username
function sanitizeUsername(username) {
  if (!username) return '';
  
  return username
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '') // Only allow alphanumeric and safe chars
    .trim();
}

// Sanitize display name
function sanitizeDisplayName(displayName) {
  if (!displayName) return '';
  
  return displayName
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Sanitize URL
function sanitizeUrl(url) {
  if (!url) return '';
  
  return url
    .trim()
    .replace(/^https?:\/\//, '') // Remove protocol for display
    .replace(/<[^>]*>/g, ''); // Remove HTML tags
}

// Sanitize bio
function sanitizeBio(bio) {
  if (!bio) return '';
  
  let sanitized = bio
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitized.substring(0, 160); // Max bio length
}

module.exports = {
  sanitizeInput,
  sanitizePostBody,
  sanitizeUsername,
  sanitizeDisplayName,
  sanitizeUrl,
  sanitizeBio
};
