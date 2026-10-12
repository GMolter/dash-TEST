import { adminFetch } from './api';
export const emailApi = (action: string, input: Record<string, unknown> = {}) =>
  adminFetch(`/api/email?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
