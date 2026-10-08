import { fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AnimatedBackground } from './AnimatedBackground';

afterEach(() => vi.unstubAllGlobals());

it('renders a still preview without scheduling frames and redraws on resize', () => {
  const draw = vi.fn();
  const gradient = { addColorStop: vi.fn() };
  const context = new Proxy({
    clearRect: draw,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => {}) });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 320, height: 180 } as DOMRect);
  const frame = vi.fn(() => 1);
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', frame);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  const { rerender, unmount } = render(<AnimatedBackground fixed={false} animate={false} />);
  expect(draw).toHaveBeenCalled();
  expect(frame).not.toHaveBeenCalled();
  const previousDraws = draw.mock.calls.length;
  fireEvent(window, new Event('resize'));
  expect(draw.mock.calls.length).toBeGreaterThan(previousDraws);
  expect(frame).not.toHaveBeenCalled();
  rerender(<AnimatedBackground fixed={false} />);
  expect(frame).toHaveBeenCalledTimes(1);
  unmount();
  expect(cancel).toHaveBeenCalledWith(1);
});
