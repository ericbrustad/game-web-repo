export function safeErrorMessage(err, fallback = 'Unknown error') {
  try {
    if (err == null) return fallback;
    if (typeof err === 'string') return err || fallback;
    if (typeof err.message === 'string' && err.message) return err.message;
    if (typeof err.toString === 'function') {
      const s = String(err.toString());
      if (s && s !== '[object Object]') return s;
    }
    try {
      return JSON.stringify(err);
    } catch (jsonError) {
      return fallback;
    }
  } catch (internalError) {
    return fallback;
  }
}

export function normalizeError(err, fallback = 'Unknown error') {
  const message = safeErrorMessage(err, fallback);
  const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : undefined;
  const stack = typeof err === 'object' && err && 'stack' in err ? String(err.stack) : undefined;
  return {
    message,
    code,
    stack,
    cause: err,
    raw: err,
  };
}

export function supabaseClientFactoryError(cause, context = {}) {
  const { message, code, stack } = normalizeError(cause, 'Supabase client init failed');
  const error = new Error(message);
  error.name = 'SupabaseClientFactoryError';
  if (code) error.code = code;
  if (stack) error.stack = stack;
  error.context = context;
  try {
    error.cause = cause;
  } catch (assignError) {
    // ignore if cause is non-writable
  }
  return error;
}
