import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

configure({
  getElementError(message) {
    return new Error(message || 'Element lookup failed.');
  },
});

afterEach(() => cleanup());
