import { escapeEmailText, renderEmail } from './emailPolicy.js';

const supported = new Set(['firstname', 'lastname', 'fullname', 'email']);
export function emailVariables(subject: string, html: string) {
  const names = [...`${subject}\n${html}`.matchAll(/{{([^{}]*)}}/g)].map(match => match[1].trim().toLowerCase());
  for (const name of names) {
    if (!supported.has(name)) throw new Error(`Unknown email variable {{${name}}}. Use firstname, lastname, fullname, or email.`);
  }
  if (/{{|}}/.test(`${subject}\n${html}`.replace(/{{[^{}]*}}/g, '')))
    throw new Error('An email variable is incomplete. Use double braces, like {{firstname}}.');
  return names;
}
export function personVariables(person: { email: string; display_name?: string | null; first_name?: string | null; last_name?: string | null }) {
  const parts = (person.display_name || '').trim().split(/\s+/);
  const explicit = !!(person.first_name || person.last_name);
  return {
    firstname: (explicit ? person.first_name || '' : parts[0] || '').trim(),
    lastname: (explicit ? person.last_name || '' : parts.slice(1).join(' ')).trim(),
    fullname: (explicit ? [person.first_name, person.last_name].filter(Boolean).join(' ') : person.display_name || '').trim(),
    email: person.email.trim().toLowerCase(),
  };
}
export function personalizedEmail(subject: string, html: string, recipient: string, variables: Record<string, string> | null) {
  const names = emailVariables(subject, html);
  if (names.length && !variables)
    throw new Error(`Select a registered user or group to use variables. ${recipient} has no linked Olio account. Remove the variables to send externally.`);
  for (const name of names) {
    if (!variables?.[name]?.trim()) throw new Error(`{{${name}}} is missing for ${recipient}. Update their name or remove that variable.`);
  }
  const replace = (value: string, escape: boolean) => value.replace(/{{([^{}]*)}}/g, (_, name: string) => {
    const result = variables![name.trim().toLowerCase()];
    return escape ? escapeEmailText(result) : result;
  });
  return renderEmail(replace(subject, false), replace(html, true), recipient);
}
