import { createHash } from 'node:crypto';
import { fromBuffer } from 'yauzl';
import type { SupabaseClient } from '@supabase/supabase-js';
export const attachmentTypes: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export function attachmentName(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 150 ||
    /[\\/]/.test(value) || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    throw new Error('Invalid attachment filename.');
  const name = value.replace(/[^\w .()-]/g, '_');
  const extension = name.split('.').pop()?.toLowerCase() || '';
  if (!attachmentTypes[extension])
    throw new Error('Use PDF, TXT, CSV, PNG, JPEG, DOCX, XLSX, or PPTX.');
  return { name, extension, mime: attachmentTypes[extension] };
}
async function validateOffice(bytes: Buffer, extension: string) {
  const root = {
    docx: 'word/document.xml',
    xlsx: 'xl/workbook.xml',
    pptx: 'ppt/presentation.xml',
  }[extension];
  const contentType = {
    docx: 'wordprocessingml.document.main+xml',
    xlsx: 'spreadsheetml.sheet.main+xml',
    pptx: 'presentationml.presentation.main+xml',
  }[extension];
  await new Promise<void>((resolve, reject) =>
    fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('Invalid Office document.'));
      let count = 0,
        size = 0,
        hasRoot = false,
        validTypes = false;
      const fail = () => {
        zip.close();
        reject(new Error('Invalid or macro-enabled Office document.'));
      };
      zip.on('error', fail);
      zip.on('end', () => (hasRoot && validTypes ? resolve() : fail()));
      zip.on('entry', (entry) => {
        size += entry.uncompressedSize;
        if (
          ++count > 2000 ||
          size > 50 * 1024 * 1024 ||
          entry.generalPurposeBitFlag & 1 ||
          /(^\/|\.\.|vba|macros|activex|embeddings)/i.test(entry.fileName)
        )
          return fail();
        if (entry.fileName === root) hasRoot = true;
        if (entry.fileName !== '[Content_Types].xml') return zip.readEntry();
        if (entry.uncompressedSize > 100000) return fail();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail();
          const chunks: Buffer[] = [];
          let length = 0;
          stream.on('data', (chunk) => {
            length += chunk.length;
            if (length > 100000) {
              stream.destroy();
              fail();
            } else chunks.push(chunk);
          });
          stream.on('error', fail);
          stream.on('end', () => {
            const xml = Buffer.concat(chunks).toString('utf8');
            validTypes =
              !!contentType &&
              xml.includes(contentType) &&
              !/macroEnabled|vbaProject|activeX|<!DOCTYPE|<!ENTITY/i.test(xml);
            if (!validTypes) return fail();
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    }),
  );
}
export async function validateAttachment(
  bytes: Buffer,
  name: string,
  mime: string,
) {
  const info = attachmentName(name);
  if (info.mime !== mime || bytes.length < 1 || bytes.length > 5242880)
    throw new Error('Attachment type or size is invalid.');
  let valid = false;
  if (info.extension === 'pdf')
    valid = bytes.subarray(0, 5).toString() === '%PDF-';
  else if (info.extension === 'png')
    valid = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  else if (['jpg', 'jpeg'].includes(info.extension))
    valid = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  else if (['txt', 'csv'].includes(info.extension)) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      valid =
        ![...text].some(character => character.charCodeAt(0) < 32 && ![9,10,13].includes(character.charCodeAt(0))) &&
        !/^\s*(?:<!doctype|<html|<svg|<script)/i.test(text);
    } catch {
      valid = false;
    }
  } else {
    await validateOffice(bytes, info.extension);
    valid = true;
  }
  if (!valid) throw new Error('File contents do not match its type.');
  return createHash('sha256').update(bytes).digest('hex');
}
export async function loadAttachments(
  service: SupabaseClient,
  owner: string,
  ids: string[],
) {
  if (!Array.isArray(ids) || ids.length > 5 || new Set(ids).size !== ids.length)
    throw new Error('Choose at most 5 attachments.');
  if (!ids.length) return [];
  const { data, error } = await service
    .from('email_attachments')
    .select('*')
    .eq('owner_id', owner)
    .in('id', ids);
  if (
    error ||
    data?.length !== ids.length ||
    data.reduce((sum, file) => sum + file.size, 0) > 10485760
  )
    throw new Error('Attachments are unavailable or exceed 10 MiB.');
  const files = [];
  for (const file of data) {
    const { data: blob, error: downloadError } = await service.storage
      .from('email-attachments')
      .download(file.path);
    if (downloadError || !blob || blob.size !== file.size)
      throw new Error('Attachment upload is incomplete.');
    const content = Buffer.from(await blob.arrayBuffer());
    const hash = await validateAttachment(content, file.name, file.mime);
    if (file.sha256 && file.sha256 !== hash)
      throw new Error('Attachment changed. Upload a new file.');
    if (!file.sha256) {
      const { error: updateError } = await service
        .from('email_attachments')
        .update({ sha256: hash })
        .eq('id', file.id)
        .is('sha256', null);
      if (updateError) throw new Error('Could not validate attachment.');
    }
    files.push({ filename: file.name, contentType: file.mime, content });
  }
  return files;
}
