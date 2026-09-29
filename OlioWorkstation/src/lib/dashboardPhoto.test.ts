import { expect, it } from 'vitest';
import { photoCrop } from './dashboardPhoto';

it('crops a portrait source to a centered landscape without stretching', () => {
  const crop = photoCrop(1000, 2000, 2, 1, 50, 50);
  expect(crop).toEqual({ x: 0, y: 750, width: 1000, height: 500 });
});
it('zooms and reaches each edge without moving beyond the source image', () => {
  expect(photoCrop(2400, 1600, 2, 2, 0, 0)).toEqual({ x: 0, y: 0, width: 1200, height: 600 });
  expect(photoCrop(2400, 1600, 2, 2, 100, 100)).toEqual({ x: 1200, y: 1000, width: 1200, height: 600 });
});
