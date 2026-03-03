/**
 * Check if an error indicates an unauthorized/unauthenticated state.
 * This includes expired tokens, invalid tokens, or missing authentication.
 */
export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unauthorized') ||
      message.includes('not authenticated') ||
      message.includes('unauthenticated') ||
      message.includes('401')
    );
  }
  return false;
}
