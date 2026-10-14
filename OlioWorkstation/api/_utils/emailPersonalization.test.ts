// @vitest-environment node
import { expect, it } from 'vitest';
import { personalizedEmail, personVariables } from './emailPersonalization';

it('personalizes the subject, body and automatic sign-off independently for each recipient', () => {
  for (const first of ['Avery', 'Blair']) {
    const email = `${first.toLowerCase()}@example.com`;
    const mail = personalizedEmail('Hello {{firstname}}', '<p>Dear {{fullname}}, your address is {{email}}.</p>', email,
      personVariables({ email, first_name: first, last_name: 'Stone' }));
    expect(mail.subject).toBe(`Hello ${first}`);
    expect(mail.text).toContain(`Dear ${first} Stone`);
    expect(mail.html).toContain(`This message was sent to ${email} by Olio.`);
    expect(mail.html).toContain('background:#0b1020');
    expect(mail.html.match(/Replies to this email are not monitored/g)).toHaveLength(1);
    expect(mail.html).not.toContain('{{');
  }
});
it('supports legacy display names and escapes recipient content without interpreting it as markup', () => {
  const variables = personVariables({ email: 'a@example.com', display_name: 'Avery van Stone' });
  expect(variables).toMatchObject({ firstname: 'Avery', lastname: 'van Stone', fullname: 'Avery van Stone' });
  const mail = personalizedEmail('Hello', '<p>{{firstname}}</p>', 'a@example.com', { firstname: '<img src=x onerror=alert(1)>' });
  expect(mail.html).not.toContain('<img');
  expect(mail.html).toContain('&lt;img');
});
it('rejects unresolvable or unknown variables but permits ordinary external mail', () => {
  expect(() => personalizedEmail('Hello {{firstname}}', '<p>Hello</p>', 'external@example.com', null)).toThrow('registered user or group');
  expect(() => personalizedEmail('Hello', '<p>{{lastname}}</p>', 'a@example.com', { lastname: '' })).toThrow('missing');
  expect(() => personalizedEmail('Hello', '<p>{{password}}</p>', 'a@example.com', {})).toThrow('Unknown');
  expect(() => personalizedEmail('Hello', '<p>{{firstname}</p>', 'a@example.com', {})).toThrow('incomplete');
  expect(personalizedEmail('Hello', '<p>An external message</p>', 'external@example.com', null).text).toContain('An external message');
});
