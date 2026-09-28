import { Fragment } from "react";
import { safeBannerUrl } from "../lib/banner";

/** Render only inline links; all other content remains escaped plain text. */
export function BannerMessage({ text }: { text: string }) {
  const parts = [];
  const pattern = /\[([^\]\n]+)\]\(([^\s)]+)\)/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    parts.push(<Fragment key={`text-${index}`}>{text.slice(offset, index)}</Fragment>);
    const href = safeBannerUrl(match[2]);
    parts.push(href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-amber-200/60 underline-offset-4 hover:text-white">{match[1]}</a> : <Fragment key={index}>{match[0]}</Fragment>);
    offset = index + match[0].length;
  }
  parts.push(<Fragment key="tail">{text.slice(offset)}</Fragment>);
  return <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{parts}</span>;
}
