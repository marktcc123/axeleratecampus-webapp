import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import seedData from '../../data/admin.example.json';
import { isLiveBackend } from '../../lib/supabase.js';
import { adminAct, loadAdminQueue } from '../../lib/admin-api.js';
import { saveCertificate } from '../../lib/certificate.js';

// The console's data layer.
//
// Offline (tests, a build without the live flag) this is the fixture, and a
// reload restores it. With the live flag, the queues are replaced by the
// local console server, which reads Supabase with the service role. The
// browser never sees that key.
const AdminContext = createContext(null);

const PENDING_UGC = new Set(['pending', 'submitted']);

const QUEUE_KEYS = [
  'orders', 'ugc_submissions', 'reviews', 'gig_applications', 'event_applications',
  'w9_submissions', 'withdrawals', 'campuses', 'career_claims', 'daily_totals',
  'career_roles', 'career_pathways',
];

function blankQueue(seed) {
  const data = structuredClone(seed);
  for (const key of QUEUE_KEYS) data[key] = [];
  data.stats = { total_users: 0, verified_users: 0, active_today: 0 };
  data.operator = null;
  return data;
}

export function AdminDataProvider({ children, seed = seedData }) {
  const liveBackend = isLiveBackend();
  const [data, setData] = useState(() => (liveBackend ? blankQueue(seed) : structuredClone(seed)));
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!liveBackend) return undefined;
    let alive = true;
    loadAdminQueue().then((snap) => {
      if (!alive) return;
      if (!snap?.ok || !snap.queue) {
        setToast({ title: 'Console not loaded', description: snap?.error || 'Could not read the backend.' });
        return;
      }
      setData((current) => ({ ...current, ...snap.queue, operator: snap.operator || null }));
      setLive(true);
    });
    return () => { alive = false; };
  }, [liveBackend]);

  const say = useCallback((title, description) => setToast({ title, description }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // One helper behind every mutation: replace the matching row in one
  // collection, leaving the rest of the fixture untouched.
  const patch = useCallback((key, id, fields) => {
    setData((d) => ({
      ...d,
      [key]: d[key].map((row) => (row.id === id ? { ...row, ...fields } : row)),
    }));
  }, []);

  // Live decisions hit the server first. A failure leaves the row as it was.
  const commit = useCallback(async (key, id, fields, action, extra) => {
    if (!live) {
      patch(key, id, fields);
      return true;
    }
    const result = await adminAct(action, { id, ...extra });
    if (!result?.ok) {
      say('Not saved', result?.error || 'The server did not take that.');
      return false;
    }
    patch(key, id, fields);
    return true;
  }, [live, patch, say]);

  const hold = useCallback((title, description) => {
    if (!live) return false;
    say(title, description);
    return true;
  }, [live, say]);

  const value = useMemo(() => {
    const orders = data.orders;
    const ugcSubmissions = data.ugc_submissions;
    const reviews = data.reviews;
    const gigApplications = data.gig_applications;
    const eventApplications = data.event_applications;
    const w9Submissions = data.w9_submissions;
    const withdrawals = data.withdrawals;
    const careerClaims = data.career_claims;

    return {
      orders,
      ugcSubmissions,
      reviews,
      gigApplications,
      eventApplications,
      w9Submissions,
      withdrawals,
      campuses: data.campuses,
      careerClaims,
      live,
      careerRoles: data.career_roles,
      careerPathways: data.career_pathways,
      dailyTotals: data.daily_totals,
      stats: data.stats,
      operator: data.operator || null,

      counts: {
        tasks: orders.filter((o) => o.needs).length,
        ugc: ugcSubmissions.filter((s) => PENDING_UGC.has(s.status)).length,
        reviews: reviews.filter((r) => r.status === 'pending').length,
        gigs: gigApplications.filter((g) => g.status === 'pending').length,
        events: eventApplications.filter((e) => e.status === 'pending').length,
        withdrawals:
          withdrawals.filter((w) => w.status === 'pending').length +
          w9Submissions.filter((w) => !w.verified).length,
        career: careerClaims.filter((c) => c.status === 'pending').length,
      },

      toast,
      dismissToast,

      // Orders (owner, 2026-09-23: the console is for shipping and deciding).
      // A decision ends in its own status — an approved cancellation used to
      // be marked "delivered" — and a refusal carries the reason the student
      // is told, like every other refusal here. Marking shipped stores the
      // carrier and number, which is what the student's receipt shows.
      approveReturn: (id) => {
        if (hold('Not refunded', 'Returns still settle on the old order flow. This row stays as it is.')) return;
        patch('orders', id, { needs: null, status: 'returned' });
        say('Return approved', 'Cash and credits go back to the student.');
      },
      declineReturn: (id, reason) => {
        if (hold('Not saved', 'Returns still settle on the old order flow.')) return;
        patch('orders', id, { needs: null, decline_reason: reason });
        say('Return declined', 'The reason goes to the student.');
      },
      approveCancellation: (id) => {
        if (hold('Not refunded', 'Cancellations still settle on the old order flow. This row stays as it is.')) return;
        patch('orders', id, { needs: null, status: 'cancelled' });
        say('Cancellation approved', 'The order is cancelled and refunded.');
      },
      declineCancellation: (id, reason) => {
        if (hold('Not saved', 'Cancellations still settle on the old order flow.')) return;
        patch('orders', id, { needs: null, decline_reason: reason });
        say('Cancellation declined', 'The reason goes to the student; the order goes ahead.');
      },
      markShipped: (id, { carrier, number }) => {
        commit('orders', id, { needs: null, status: 'shipped', tracking: { carrier, number } }, 'markShipped', { carrier, number })
          .then((ok) => { if (ok) say('Marked shipped', `${carrier} ${number} goes to the student.`); });
      },

      approveUgc: (id) => {
        commit('ugc_submissions', id, { status: 'approved' }, 'approveUgc')
          .then((ok) => { if (ok) say('UGC approved', live ? 'Marked approved.' : 'Reward released to the creator.'); });
      },
      rejectUgc: (id, reason) => {
        commit('ugc_submissions', id, { status: 'rejected', reject_reason: reason }, 'rejectUgc', { reason })
          .then((ok) => { if (ok) say('UGC rejected', 'The reason goes to the creator.'); });
      },

      approveReview: (id) => {
        if (hold('Already published', 'Reviews on the product page do not have a separate approval step.')) return;
        patch('reviews', id, { status: 'approved' });
        say('Review approved', 'It shows on the product page.');
      },
      rejectReview: (id, reason) => {
        if (hold('Not saved', 'Reviews on the product page do not have a separate rejection step.')) return;
        patch('reviews', id, { status: 'rejected', reject_reason: reason });
        say('Review rejected', 'It will not show on the product page.');
      },

      approveGig: (id) => {
        commit('gig_applications', id, { status: 'approved' }, 'approveGig')
          .then((ok) => { if (ok) say('Applicant approved', 'They are on the crew list.'); });
      },
      rejectGig: (id, reason) => {
        commit('gig_applications', id, { status: 'rejected', reject_reason: reason }, 'rejectGig', { reason })
          .then((ok) => { if (ok) say('Applicant rejected', 'The reason goes to the applicant.'); });
      },
      completeGig: (id) => {
        commit('gig_applications', id, { status: 'complete' }, 'completeGig')
          .then((ok) => { if (ok) say('Gig complete', live ? 'Marked complete.' : 'Payout queued.'); });
      },

      approveEventApp: (id) => {
        commit('event_applications', id, { status: 'approved' }, 'approveEvent')
          .then((ok) => { if (ok) say('Applicant approved', 'They are on the door list.'); });
      },
      declineEventApp: (id, reason) => {
        commit('event_applications', id, { status: 'declined', reject_reason: reason }, 'declineEvent', { reason })
          .then((ok) => { if (ok) say('Applicant declined', 'The seat goes back to the pool; the reason goes to them.'); });
      },

      verifyW9: (id) => {
        commit('w9_submissions', id, { verified: true }, 'verifyW9')
          .then((ok) => { if (ok) say('W-9 verified', 'Payouts can be released for this student.'); });
      },
      completePayout: (id) => {
        if (hold('Not sent', 'Withdrawals are listed from the account. Releasing cash stays off this console.')) return;
        patch('withdrawals', id, { status: 'completed' });
        say('Payout completed', 'Marked as sent.');
      },
      rejectPayout: (id, reason) => {
        if (hold('Not saved', 'Withdrawals are listed from the account. Releasing cash stays off this console.')) return;
        patch('withdrawals', id, { status: 'rejected', reject_reason: reason });
        say('Payout rejected', 'The reason goes to the student.');
      },

      addCampus: (fields) => {
        if (hold('Not saved', 'Schools here are counted from student profiles.')) return;
        setData((d) => ({
          ...d,
          campuses: [
            ...d.campuses,
            { id: `cmp${d.campuses.length + 1}`, logo_url: '', student_count: 0, ...fields },
          ],
        }));
        say('School added', `${fields.name} is on the list.`);
      },
      updateCampus: (id, fields) => {
        if (hold('Not saved', 'Schools here are counted from student profiles.')) return;
        patch('campuses', id, fields);
        say('School saved', '');
      },
      removeCampus: (id) => {
        if (hold('Not saved', 'Schools here are counted from student profiles.')) return;
        setData((d) => ({ ...d, campuses: d.campuses.filter((c) => c.id !== id) }));
        say('School removed', '');
      },

      approveClaim: (id) => {
        if (hold('Not issued', 'Certificate claims are listed here. Issuing one stays on the old career flow.')) return;
        patch('career_claims', id, { status: 'approved' });
        say('Claim approved', 'The certificate goes out.');
      },
      rejectClaim: (id, reason) => {
        if (hold('Not saved', 'Certificate claims are listed here. Issuing one stays on the old career flow.')) return;
        patch('career_claims', id, { status: 'rejected', reject_reason: reason });
        say('Claim rejected', 'They can submit again.');
      },
      setClaimCertificate: (id, file) => {
        const name = file?.name || '';
        if (!live) {
          patch('career_claims', id, { certificate_name: name });
          return Promise.resolve(true);
        }
        return saveCertificate(id, file).then((result) => {
          if (!result?.ok) {
            say('Not saved', result?.error || 'The certificate was not saved.');
            return false;
          }
          patch('career_claims', id, { certificate_name: result.name || name, certificate_stored: true });
          say('Certificate saved', 'The file is on this claim.');
          return true;
        });
      },

      saveRole: (id, name) => {
        patch('career_roles', id, { name, updated_at: '2026-08-31' });
        say('Role saved', '');
      },
      savePathway: (id, fields) => {
        patch('career_pathways', id, fields);
        say('Pathway saved', '');
      },

      // The console's toast, for a panel that writes the shared catalogue
      // (content.jsx) rather than this store: Cashback edits products.
      notify: say,
    };
  }, [data, toast, live, patch, say, dismissToast, commit, hold]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminDataProvider');
  return ctx;
}
