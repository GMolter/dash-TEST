import { beforeEach, expect, it, vi } from 'vitest';
import { MAX_PLAN_BYTES, readPlanFile, savePlanFile, downloadPlanFile } from './featurePlanFiles';

const db = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: db.from } }));
beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db); db.update.mockReturnValue(db); db.eq.mockReturnValue(db); db.select.mockReturnValue(db);
  db.single.mockResolvedValue({ data: { id: 'idea-1' }, error: null });
});
function file(name: string, text: string) {
  const bytes = new TextEncoder().encode(text);
  return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer } as File;
}
it('accepts markdown and text without interpreting markup or changing content', async () => {
  const text = '# Plan\r\n<script>example</script>\r\n☕';
  expect(await readPlanFile(file('plan.MD', text))).toEqual({ name: 'plan.MD', content: text });
  expect(await readPlanFile(file('plan.txt', ''))).toEqual({ name: 'plan.txt', content: '' });
});
it('rejects unsupported extensions, oversized files, binary data and invalid UTF-8', async () => {
  await expect(readPlanFile(file('plan.html', 'hello'))).rejects.toThrow('.md or .txt');
  await expect(readPlanFile(file('../plan.md', 'hello'))).rejects.toThrow('.md or .txt');
  await expect(readPlanFile(file('plan.txt', 'a'.repeat(MAX_PLAN_BYTES + 1)))).rejects.toThrow('256 KB');
  await expect(readPlanFile(file('plan.md', 'binary\0data'))).rejects.toThrow('binary');
  await expect(readPlanFile({ name: 'plan.txt', size: 1, arrayBuffer: async () => new Uint8Array([255]).buffer } as File)).rejects.toThrow('UTF-8');
  expect(db.update).not.toHaveBeenCalled();
});
it('updates only attachment fields on the selected idea and clears both fields on removal', async () => {
  await savePlanFile('idea-1', { name: 'plan.md', content: '# Plan' });
  expect(db.update).toHaveBeenCalledWith({ plan_name: 'plan.md', plan_content: '# Plan' });
  expect(db.eq).toHaveBeenCalledWith('id', 'idea-1');
  await savePlanFile('idea-1', null);
  expect(db.update).toHaveBeenLastCalledWith({ plan_name: null, plan_content: null });
});
it('reports denied writes and missing downloads', async () => {
  db.single.mockResolvedValueOnce({ error: { message: 'Permission denied' } });
  await expect(savePlanFile('idea-1', null)).rejects.toThrow('Permission denied');
  db.single.mockResolvedValueOnce({ data: { plan_name: null, plan_content: null }, error: null });
  await expect(downloadPlanFile('idea-1')).rejects.toThrow('removed');
});
it('downloads the stored content as a text attachment and releases the temporary URL', async () => {
  vi.useFakeTimers();
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:plan');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('plan.md');
    expect(this.getAttribute('href')).toBe('blob:plan');
  });
  try {
    db.single.mockResolvedValue({ data: { plan_name: 'plan.md', plan_content: '# Plan' }, error: null });
    await downloadPlanFile('idea-1');
    expect(db.eq).toHaveBeenCalledWith('id', 'idea-1');
    expect(createObjectURL.mock.calls[0][0]).toMatchObject({ type: 'text/plain;charset=utf-8', size: 6 });
    expect(click).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:plan');
  } finally { click.mockRestore(); vi.unstubAllGlobals(); vi.useRealTimers(); }
});
