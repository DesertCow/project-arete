// Turns an axios failure into one user-facing sentence. Every catch block in
// the app routes through here so wording and tone stay consistent.
export function readApiError(err, fallback = 'Something went wrong. Please try again.') {
  // No response at all: the request never reached the server.
  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }
    return 'Could not connect to server. Check your connection.';
  }

  const { status, data } = err.response;
  const apiError = data?.error;

  // Prefer field-level validation detail — "Invalid request body" alone is useless.
  const details = apiError?.details;
  if (details && typeof details === 'object') {
    const field = Object.keys(details)[0];
    const message = details[field]?.[0];
    if (message) return `${field}: ${message}`;
  }

  if (apiError?.message) return apiError.message;

  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'We could not find what you were looking for.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong. Please try again.';

  return fallback;
}
