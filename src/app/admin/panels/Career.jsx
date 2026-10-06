import { useState } from 'react';
import { Button, Input } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { shortDate } from '../format.js';
import { claimNeedsCertificate } from '../../../lib/certificate-file.js';

// Certificate claims, then the two lists the reference keeps under them.
//
// The reference's bundle gives those lists' shape but not their subject, so
// they are implemented as roles and pathways. If they are something else, only
// the headings and the fixture keys change.
//
// A certificate claim keeps a PDF slot. Offline, choosing a file records the
// name only. Live, the file is stored on that claim and the row says so.
export default function Career() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [roleDraft, setRoleDraft] = useState({});

  const roleValue = (r) => (roleDraft[r.id] ?? r.name);

  return (
    <div>
      <section className="adm-grp">
        <h2 className="adm-grp__title">Certificate claims</h2>
        {store.careerClaims.map((c) => (
          <QueueRow
            key={c.id}
            title={c.full_name}
            meta={`Claimed ${shortDate(c.claimed_at)}`}
            status={c.status}
            open={open === c.id}
            onToggle={() => setOpen(open === c.id ? null : c.id)}
            actions={c.status === 'pending' ? (
              <>
                <Button onClick={() => store.approveClaim(c.id)}>Approve</Button>
                <Button variant="secondary" onClick={() => setRejecting(c.id)}>Reject</Button>
              </>
            ) : null}
          >
            {/* No Claimed fact: the row's own meta already carries the date. */}
            <RowFact label="For" value={c.reward_summary} />
            <RowFact label="Key" value={c.reward_key} />
            {claimNeedsCertificate(c.reward_key) && (
              <span className="adm-car__file">
                <label className="adm-car__file-label" htmlFor={`cert-${c.id}`}>Certificate</label>
                <input
                  id={`cert-${c.id}`}
                  className="adm-car__file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) store.setClaimCertificate(c.id, file);
                  }}
                />
                {c.certificate_name && (
                  <span className="adm-car__file-name">{c.certificate_name}</span>
                )}
                <span className="adm-car__file-note">
                  {c.certificate_stored
                    ? 'Saved on this claim.'
                    : (store.live
                      ? 'A PDF stays on this claim.'
                      : 'Filename only — this preview stores no file.')}
                </span>
              </span>
            )}
            {c.reject_reason && <RowFact label="Rejected for" value={c.reject_reason} />}
          </QueueRow>
        ))}
      </section>

      <section className="adm-grp">
        <h2 className="adm-grp__title">Roles</h2>
        <div className="adm-card adm-list">
        {store.careerRoles.map((r) => {
          const dirty = roleValue(r) !== r.name;
          return (
            <div className="adm-car__edit" key={r.id}>
              {/* aria-label, not the `label` prop: the field already shows the
                  role's name, so a visible label repeated it word for word and
                  three of them stacked into a wall. The name still has to reach
                  assistive tech, and has to be unique per field. */}
              <Input
                aria-label={`Role: ${r.name}`}
                value={roleValue(r)}
                onChange={(e) => setRoleDraft({ ...roleDraft, [r.id]: e.target.value })}
              />
              {/* Save appears only once something changed. Three resting
                  full-width primaries read as the point of the screen; the
                  claims above them are. */}
              {dirty && (
                <Button variant="secondary" onClick={() => store.saveRole(r.id, roleValue(r))}>
                  Save
                </Button>
              )}
            </div>
          );
        })}
        </div>
      </section>

      <section className="adm-grp">
        <h2 className="adm-grp__title">Pathways</h2>
        <div className="adm-card adm-list">
        {store.careerPathways.map((p) => (
          <div className="adm-car__path" key={p.id}>
            <p className="adm-row__title">{p.title}</p>
            <p className="adm-row__meta">{p.blurb}</p>
          </div>
        ))}
        </div>
      </section>

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject certificate claim"
        placeholder="e.g. The mission count does not match the tier"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectClaim(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
