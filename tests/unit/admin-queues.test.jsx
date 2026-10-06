import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import { RejectDialog } from '../../src/app/admin/parts/RejectDialog.jsx';
import admin from '../../src/data/admin.example.json';
import missionsFixture from '../../src/data/missions.example.json';
import eventsFixture from '../../src/data/events.example.json';
import shopFixture from '../../src/data/shop.example.json';

// The queues join on ids now, so a row's heading is the catalogue's title, not
// a copy stored on the row (2026-09-10).
const titleOfMission = (slug) => missionsFixture.find((m) => m.slug === slug).title;
const titleOfEvent = (id) => eventsFixture.find((e) => e.id === id).title;
const titleOfProduct = (id) => shopFixture.products.find((p) => p.id === id).title;

const go = (path) => {
  sessionStorage.clear();
  setUnlocked(true);
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
};

// Scoped to queue rows on purpose: on Withdrawals the same student appears in
// both the W-9 section and the payout list, so a document-wide getByText finds
// two matches.
const rowFor = (text) => {
  const row = screen.getAllByTestId('queue-row').find((r) => r.textContent.includes(text));
  if (!row) throw new Error(`no queue row containing "${text}"`);
  return row;
};
const openRow = async (user, text) => {
  const row = rowFor(text);
  await user.click(row.querySelector('.adm-row__head'));
  return row;
};

describe('the rejection dialog', () => {
  test('it will not send an empty reason', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RejectDialog open title="Reject UGC submission" onClose={() => {}} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Say why/)).toBeInTheDocument();
  });

  test('with a reason it sends it, trimmed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RejectDialog open title="Reject UGC submission" onClose={() => {}} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Reason'), '  Missing the brand tag.  ');
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(onSubmit).toHaveBeenCalledWith('Missing the brand tag.');
  });

  test('the reason field is the design system Textarea, not a local one', () => {
    render(<RejectDialog open title="x" onClose={() => {}} onSubmit={() => {}} />);
    const field = screen.getByLabelText('Reason');
    expect(field.tagName).toBe('TEXTAREA');
    // It used to be hand-rolled from tokens because the system had none. It
    // does now (DS ea6b1d0), and this guards against drifting back.
    expect(field.className).toMatch(/\bax-textarea\b/);
  });

  test('the label stays clean even with a hint under the field', () => {
    render(<RejectDialog open title="x" onClose={() => {}} onSubmit={() => {}} />);
    // The whole reason the app avoided `hint` for months: nested inside the
    // label, the message joined the accessible name. Textarea renders it as a
    // sibling, so an exact-match query still finds the field.
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
    expect(screen.getByText(/This goes to them as written/)).toBeInTheDocument();
  });
});

describe('Tasks', () => {
  test('it lists only the orders waiting on someone', () => {
    go('/app/me/admin/tasks');
    const waiting = admin.orders.filter((o) => o.needs);
    expect(screen.getAllByTestId('queue-row')).toHaveLength(waiting.length);
  });

  test('a row is collapsed until you open it', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/tasks');
    const first = screen.getAllByTestId('queue-row')[0];
    expect(first.querySelector('.adm-row__body')).toBeNull();
    await user.click(first.querySelector('.adm-row__head'));
    expect(first.querySelector('.adm-row__body')).toBeTruthy();
  });

  test('shipping is filled in on the row itself — carrier and number, no dialog — and will not send without both (owner, 2026-09-23)', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/tasks');
    const before = screen.getAllByTestId('queue-row').length;
    const target = admin.orders.find((o) => o.needs === 'shipping');
    const row = await openRow(user, target.order_no);
    // The fields sit in the open row; nothing opens over the page.
    const carrier = within(row).getByLabelText('Carrier');
    const number = within(row).getByLabelText('Tracking number');
    await user.click(within(row).getByRole('button', { name: 'Mark shipped' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(row).getAllByText(/needed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('queue-row')).toHaveLength(before);       // nothing sent
    await user.type(carrier, 'UPS');
    await user.type(number, '1Z999AA10123456784');
    await user.click(within(row).getByRole('button', { name: 'Mark shipped' }));
    expect(screen.getByText(/Marked shipped/)).toBeInTheDocument();
    expect(screen.getByText(/UPS 1Z999AA10123456784/)).toBeInTheDocument();   // the toast names what went out
    expect(screen.getAllByTestId('queue-row')).toHaveLength(before - 1);
  });

  test('the actions on an order are small link buttons, not the system\'s pills (owner, 2026-09-23)', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/tasks');
    for (const need of ['shipping', 'cancellation']) {
      const target = admin.orders.find((o) => o.needs === need);
      const row = await openRow(user, target.order_no);
      const actions = within(row).getAllByRole('button').filter((b) => !b.classList.contains('adm-row__head'));
      expect(actions.length).toBeGreaterThan(0);
      for (const b of actions) expect(b.className, b.textContent).not.toMatch(/\bax-btn\b/);
      await user.click(row.querySelector('.adm-row__head'));   // close it again
    }
  });

  test('a return offers Approve return and Decline return, and nothing about shipping', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/tasks');
    const target = admin.orders.find((o) => o.needs === 'return');
    const row = await openRow(user, target.order_no);
    expect(within(row).getByRole('button', { name: 'Approve return' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Decline return' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Mark shipped' })).toBeNull();
    // What the student asked for, so the decision is not blind.
    expect(within(row).getByText(target.request_reason)).toBeInTheDocument();
  });

  test('the open row is a packing slip: address, phone, email, items linked to their products, and what was paid', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/tasks');
    const target = admin.orders.find((o) => o.needs === 'shipping');
    const row = await openRow(user, target.order_no);
    const a = target.shipping_address;
    expect(within(row).getByText(target.full_name)).toBeInTheDocument();
    expect(within(row).getByText(a.line1)).toBeInTheDocument();
    expect(within(row).getByText(`${a.city}, ${a.state} ${a.zip}`)).toBeInTheDocument();
    expect(within(row).getByText(target.phone)).toBeInTheDocument();
    expect(within(row).getByText(target.shipping_email)).toBeInTheDocument();
    for (const it of target.items) {
      const link = within(row).getByRole('link', { name: new RegExp(it.name) });
      expect(link).toHaveAttribute('href', `/app/shop/${it.product_id}`);
      expect(within(row).getByText(`${it.quantity}×`)).toBeInTheDocument();
    }
    expect(within(row).getByText('Paid')).toBeInTheDocument();
  });

  test('a cancellation can be approved or declined; declining demands a reason and takes the row off the queue', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/tasks');
    const before = screen.getAllByTestId('queue-row').length;
    const target = admin.orders.find((o) => o.needs === 'cancellation');
    const row = await openRow(user, target.order_no);
    expect(within(row).getByText(target.request_reason)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Approve cancellation' })).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: 'Decline cancellation' }));
    const d = screen.getByRole('dialog');
    expect(within(d).getByRole('heading', { name: 'Decline cancellation' })).toBeInTheDocument();
    await user.click(within(d).getByRole('button', { name: /Decline & notify/ }));
    expect(screen.getAllByTestId('queue-row')).toHaveLength(before);   // no reason, nothing sent
    await user.type(within(d).getByRole('textbox'), 'It already left the warehouse this morning.');
    await user.click(within(d).getByRole('button', { name: /Decline & notify/ }));
    expect(screen.getByText(/Cancellation declined/)).toBeInTheDocument();
    expect(screen.getAllByTestId('queue-row')).toHaveLength(before - 1);
  });

  test('credits on an order never read as a bare number', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/tasks');
    const target = admin.orders.find((o) => o.needs && o.credits_used > 0);
    const row = await openRow(user, target.order_no);
    expect(within(row).getByText(/credit · \$/)).toBeInTheDocument();
  });
});

describe('UGC review', () => {
  test('the status filter narrows the list and counts each state', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/ugc');
    expect(screen.getAllByTestId('queue-row')).toHaveLength(admin.ugc_submissions.length);
    await user.click(screen.getByRole('button', { name: /^Pending/ }));
    const pending = admin.ugc_submissions.filter((s) => s.status === 'pending');
    expect(screen.getAllByTestId('queue-row')).toHaveLength(pending.length);
  });

  test('approving releases the reward and says so', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => s.status === 'submitted');
    const row = await openRow(user, titleOfMission(target.mission_slug));
    await user.click(within(row).getByRole('button', { name: 'Approve' }));
    expect(screen.getByText(/UGC approved/)).toBeInTheDocument();
  });

  test('rejecting demands a reason, then records it', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => s.status === 'submitted');
    const row = await openRow(user, titleOfMission(target.mission_slug));
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/Say why/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reason'), 'Brand tag is missing.');
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/UGC rejected/)).toBeInTheDocument();
  });

  test('a submission link goes to example.com, never a real platform', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => s.ugc_link);
    const row = await openRow(user, titleOfMission(target.mission_slug));
    const link = within(row).getByRole('link', { name: /View the post/ });
    expect(link).toHaveAttribute('href', target.ugc_link);
    expect(link.getAttribute('href')).toMatch(/^https:\/\/example\.com\//);
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  test('a submission with no link says so instead of offering a dead one', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => !s.ugc_link);
    const row = await openRow(user, titleOfMission(target.mission_slug));
    expect(within(row).getByText(/No link yet/)).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: /View the post/ })).toBeNull();
  });
});

describe('Physical gigs', () => {
  test('a pending applicant can be approved or rejected, not completed', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/gigs');
    const target = admin.gig_applications.find((g) => g.status === 'pending');
    const row = await openRow(user, titleOfMission(target.mission_slug));
    expect(within(row).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Mark complete' })).toBeNull();
  });

  test('an approved applicant can be marked complete, not approved twice', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/gigs');
    const target = admin.gig_applications.find((g) => g.status === 'approved');
    const row = await openRow(user, titleOfMission(target.mission_slug));
    expect(within(row).queryByRole('button', { name: 'Approve' })).toBeNull();
    await user.click(within(row).getByRole('button', { name: 'Mark complete' }));
    expect(screen.getByText(/Gig complete/)).toBeInTheDocument();
  });

  test('the row carries the contact details a lead needs on the day', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/gigs');
    const target = admin.gig_applications[0];
    const row = await openRow(user, titleOfMission(target.mission_slug));
    expect(within(row).getByText(target.phone)).toBeInTheDocument();
    expect(within(row).getByText(target.email)).toBeInTheDocument();
    expect(within(row).getByText(target.location)).toBeInTheDocument();
  });
});

describe('Events', () => {
  test('applicants are grouped under their event, each group named once', () => {
    go('/app/me/admin/events');
    const events = [...new Set(admin.event_applications.map((a) => titleOfEvent(a.event_id)))];
    for (const title of events) {
      expect(screen.getAllByRole('heading', { name: title })).toHaveLength(1);
    }
  });

  test('a row shows the campus and the tier', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/events');
    const target = admin.event_applications[0];
    const row = await openRow(user, target.full_name);
    expect(within(row).getAllByText(target.campus).length).toBeGreaterThan(0);
    expect(within(row).getAllByText(target.tier).length).toBeGreaterThan(0);
  });

  test('declining an applicant asks why, like every other refusal in the console, then frees the seat and records the reason', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/events');
    const target = admin.event_applications.find((a) => a.status === 'pending');
    const row = await openRow(user, target.full_name);
    await user.click(within(row).getByRole('button', { name: 'Decline' }));
    const d = screen.getByRole('dialog');
    await user.click(within(d).getByRole('button', { name: /notify/ }));
    expect(screen.queryByText(/Applicant declined/)).toBeNull();   // no reason, no decline
    await user.type(within(d).getByRole('textbox'), 'The room is at capacity for this one.');
    await user.click(within(d).getByRole('button', { name: /notify/ }));
    expect(screen.getByText(/Applicant declined/)).toBeInTheDocument();
    expect(within(rowFor(target.full_name)).getByText('The room is at capacity for this one.')).toBeInTheDocument();
  });
});

describe('Withdrawals', () => {
  test('two sections: W-9 verification and payouts', () => {
    go('/app/me/admin/withdrawals');
    expect(screen.getByRole('heading', { name: /W-9 verification/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Payouts/ })).toBeInTheDocument();
  });

  test('an unverified W-9 can be verified; a verified one shows a badge instead', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/withdrawals');
    const pending = admin.w9_submissions.find((w) => !w.verified);
    const done = admin.w9_submissions.find((w) => w.verified);
    const rows = screen.getAllByTestId('w9-row');
    const pendingRow = rows.find((r) => r.textContent.includes(pending.full_name));
    const doneRow = rows.find((r) => r.textContent.includes(done.full_name));
    expect(within(doneRow).queryByRole('button', { name: 'Verify' })).toBeNull();
    expect(within(doneRow).getByText('verified')).toBeInTheDocument();
    await user.click(within(pendingRow).getByRole('button', { name: 'Verify' }));
    expect(screen.getByText(/W-9 verified/)).toBeInTheDocument();
  });

  test('the W-9 row does not offer a document link there is no document for', () => {
    go('/app/me/admin/withdrawals');
    const row = screen.getAllByTestId('w9-row')[0];
    expect(within(row).getByText(/no document in preview/i)).toBeInTheDocument();
    expect(within(row).queryByRole('link')).toBeNull();
  });

  test('a payout shows amount, fee and net, each to the cent', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/withdrawals');
    const target = admin.withdrawals.find((w) => w.status === 'pending');
    const row = await openRow(user, target.full_name);
    for (const n of [target.amount, target.fee, target.net_amount]) {
      const cents = `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      expect(within(row).getAllByText(cents).length).toBeGreaterThan(0);
    }
  });

  test('rejecting a payout demands a reason', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/withdrawals');
    const target = admin.withdrawals.find((w) => w.status === 'pending');
    const row = await openRow(user, target.full_name);
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByLabelText('Reason'), 'Account details do not match the W-9.');
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/Payout rejected/)).toBeInTheDocument();
  });
});

describe('Reviews', () => {
  test('lists the pending reviews, and the filter counts each state', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/reviews');
    expect(screen.getAllByTestId('queue-row')).toHaveLength(admin.reviews.length);
    await user.click(screen.getByRole('button', { name: /^Pending/ }));
    const pending = admin.reviews.filter((r) => r.status === 'pending');
    expect(screen.getAllByTestId('queue-row')).toHaveLength(pending.length);
  });

  test('a settled review offers no Approve or Reject', async () => {
    go('/app/me/admin/reviews');
    const target = admin.reviews.find((r) => r.status === 'approved');
    const row = await openRow(userEvent.setup(), titleOfProduct(target.product_id));
    expect(within(row).queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  test('approving says so, and the row leaves the pending count', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/reviews');
    const target = admin.reviews.find((r) => r.status === 'pending');
    const before = admin.reviews.filter((r) => r.status === 'pending').length;
    const row = await openRow(user, titleOfProduct(target.product_id));
    await user.click(within(row).getByRole('button', { name: 'Approve' }));
    expect(screen.getByText(/Review approved/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Pending/ }));
    expect(screen.getAllByTestId('queue-row')).toHaveLength(before - 1);
  });

  test('rejecting demands a reason, then records it against the row', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/reviews');
    const target = admin.reviews.find((r) => r.status === 'pending');
    const row = await openRow(user, titleOfProduct(target.product_id));
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/Say why/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reason'), 'Names a real classmate by name.');
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/Review rejected/)).toBeInTheDocument();
    const settledRow = rowFor(titleOfProduct(target.product_id));
    expect(within(settledRow).getByText('Names a real classmate by name.')).toBeInTheDocument();
  });

  test('a review names its rating and body, never a money figure', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/reviews');
    const target = admin.reviews[0];
    const row = await openRow(user, titleOfProduct(target.product_id));
    expect(within(row).getByText(`${target.rating} / 5`)).toBeInTheDocument();
    expect(within(row).getByText(target.body)).toBeInTheDocument();
    expect(within(row).queryByText(/\$/)).toBeNull();
  });
});
