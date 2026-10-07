import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassDashPage } from './ClassDashPage';

const state = vi.hoisted(() => ({ saveMeeting: vi.fn(), saveSettings: vi.fn(), settings: { dorm_name: 'Home', dorm_lat: 39, dorm_lng: -86 } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ session: { access_token: 'test' } }) }));
vi.mock('../hooks/useDashboardConfiguration', () => ({ useDashboardConfiguration: () => ({ installPlugin: vi.fn() }) }));
vi.mock('../hooks/useClassDash', () => ({ useClassDash: () => ({
  installed: true, loading: false, syncing: false, error: null,
  settings: state.settings,
  meetings: [{ id: 'class-1', code: 'INFO-I101', title: 'Informatics', section: 'Lecture', days: [1, 3], start_time: '09:00:00', end_time: '10:15:00', location_name: 'Luddy Hall', location_lat: 39.17, location_lng: -86.52, term_start: null, term_end: null }],
  saveMeeting: state.saveMeeting, saveSettings: state.saveSettings, deleteMeeting: vi.fn(),
}) }));
vi.mock('../components/ClassDashWidget', () => ({ ClassDashWidget: () => <div>Next class countdown</div> }));
vi.mock('../components/MapLocationPicker', () => ({ MapLocationPicker: ({ onChange }: { onChange: (point: { lat: number; lng: number }) => void }) => <button type="button" onClick={() => onChange({ lat: 39.17, lng: -86.52 })}>Place test pin</button> }));

beforeEach(() => {
  state.saveMeeting.mockResolvedValue(true);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe('ClassDash workspace', () => {
  it('filters the week without deleting classes from the schedule', async () => {
    const user = userEvent.setup();
    render(<ClassDashPage />);
    await user.click(screen.getByRole('button', { name: 'Tue 0' }));
    expect(screen.queryByRole('button', { name: 'Edit INFO-I101' })).not.toBeInTheDocument();
    expect(screen.getByText('No classes on this day. Enjoy the breathing room.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'All classes' }));
    expect(screen.getByRole('button', { name: 'Edit INFO-I101' })).toBeVisible();
  });

  it('opens a focused editor and saves an existing class without changing its identity', async () => {
    const user = userEvent.setup();
    render(<ClassDashPage />);
    await user.click(screen.getByRole('button', { name: 'Edit INFO-I101' }));
    expect(screen.queryByRole('button', { name: 'Delete INFO-I101' })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Course name'));
    await user.type(screen.getByLabelText('Course name'), 'Updated course');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(state.saveMeeting).toHaveBeenCalledWith(expect.objectContaining({ id: 'class-1', title: 'Updated course', start_time: '09:00', location_lat: 39.17 }));
    expect(screen.getByRole('button', { name: 'Edit INFO-I101' })).toBeVisible();
  });

  it('keeps import results and marks only successfully saved drafts', async () => {
    const user = userEvent.setup();
    const { container } = render(<ClassDashPage />);
    await user.click(screen.getByRole('button', { name: 'Import schedule' }));
    const file = new File(['calendar'], 'schedule.ics', { type: 'text/calendar' });
    Object.defineProperty(file, 'text', { value: async () => 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:MATH-M211\nDTSTART:20261005T110000\nDTEND:20261005T120000\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE\nLOCATION:Swain Hall\nEND:VEVENT\nEND:VCALENDAR' });
    await user.upload(container.querySelector('input[type=file]') as HTMLInputElement, file);
    await user.click(screen.getByRole('button', { name: 'Import calendar' }));
    await user.click(await screen.findByRole('button', { name: 'Review class' }));
    await user.click(screen.getByRole('button', { name: 'Luddy Hall' }));
    state.saveMeeting.mockResolvedValueOnce(false);
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }));
    expect(screen.getByLabelText('Course code')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }));
    expect(await screen.findByRole('button', { name: 'Saved to schedule' })).toBeDisabled();
    expect(screen.getByText('1 of 1 classes saved · 0 to review')).toBeVisible();
    expect(state.saveMeeting).toHaveBeenLastCalledWith(expect.objectContaining({ location_name: 'Luddy Hall', location_lat: 39.17 }));
  });

  it('validates the schedule before saving', async () => {
    const user = userEvent.setup();
    render(<ClassDashPage />);
    await user.click(screen.getByRole('button', { name: 'Edit INFO-I101' }));
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '08:00' } });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('status')).toHaveTextContent('The class end time must be after its start time.');
    expect(state.saveMeeting).not.toHaveBeenCalled();
  });
});
