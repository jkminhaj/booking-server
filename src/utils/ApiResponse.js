/**
 * Standard success envelope used by every endpoint: { success: true, data }.
 * Errors are handled separately by ApiError + the central error middleware,
 * which produce { success: false, error: { code, message } }.
 */
export function sendSuccess(res, data, statusCode = 200, meta = undefined) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}
