import { BannerMessage } from './BannerMessage';

export function AlertBanner({ title, message, color }: { title?: string; message: string; color?: string }) {
  const background = color && /^#[0-9a-f]{6}$/i.test(color) ? color : '#fbbf24';
  const rgb = [1, 3, 5].map(offset => parseInt(background.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return <div className="rounded-2xl px-5 py-4 text-left shadow-lg [&_a]:text-inherit [&_a]:decoration-current [&_a:hover]:text-inherit" style={{ backgroundColor: background, color: luminance > 0.179 ? '#000000' : '#ffffff' }}>
    {title?.trim() && <p className="mb-1 break-words text-sm font-semibold">{title}</p>}
    <div className="break-words text-sm leading-relaxed"><BannerMessage text={message} /></div>
  </div>;
}
