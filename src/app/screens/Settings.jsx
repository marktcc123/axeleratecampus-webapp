import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Dialog } from 'axelerate-design-system';
import SubScreen from '../parts/SubScreen.jsx';
import AdminGateDialog from '../admin/gate.jsx';
import AddressFields from '../parts/AddressFields.jsx';
import AvatarPicker from '../parts/AvatarPicker.jsx';
import { useProfile } from '../profile.jsx';
import { ADDRESS_FIELDS, useAddress } from '../address.jsx';
import hub from '../../data/hub.example.json';
import { isLiveBackend } from '../../lib/supabase.js';
import { saveAvatar } from '../../lib/avatar.js';
import { deleteAccount } from '../../lib/delete-account.js';
import './me-hub.css';
import './screens.css';

export default function Settings() {
  const { account, version } = hub.settings;
  // The same address checkout writes: typing it here means checkout does not
  // ask, and typing it at checkout means it is already here.
  const { address, saveAddress } = useAddress();
  // The photo is changed HERE and only here (owner, 2026-09-08) — Me shows it,
  // Settings edits it, like the rest of the profile.
  const { displayName, avatarUrl, setProfile, name, campus, email } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  // AdminShell redirects here with this flag when a /me/admin URL is opened
  // locked, so the dialog comes up instead of a bounce with no explanation.
  const [gate, setGate] = useState(Boolean(location.state?.adminGate));
  // Local only: there is no account to save to, the same footing the
  // notification toggles that used to sit here were on. Save moves the draft
  // into `saved` and nothing leaves the screen; `submitJoin()` in lib/join.js
  // stays the single seam for when Supabase arrives.
  const [draft, setDraft] = useState(address);
  const [addrError, setAddrError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => { setDraft(address); }, [address]);
  const dirty = ADDRESS_FIELDS.some((f) => (draft[f.key] ?? '') !== (address[f.key] ?? ''));
  const live = isLiveBackend();
  const rows = account.map((row) => {
    if (!live) return row;
    if (row.label === 'Name') return { ...row, value: name || row.value };
    if (row.label === 'School') return { ...row, value: campus || row.value };
    if (row.label === 'Email') return { ...row, value: email || row.value };
    return row;
  });

  // Settings re-renders on every keystroke now, so these cannot be inline: an
  // unstable onClose used to make Dialog's focus effect hand focus back to
  // whatever opened it on each render. Fixed upstream in DS ea6b1d0, but the
  // site pins a SHA and this costs one line.
  const closeGate = useCallback(() => setGate(false), []);
  const closeDelete = useCallback(() => {
    if (!deleteBusy) setDeleteOpen(false);
  }, [deleteBusy]);
  const confirmDelete = useCallback(async () => {
    setDeleteError('');
    if (!live) {
      setDeleteError('Nothing was deleted.');
      return;
    }
    setDeleteBusy(true);
    try {
      const result = await deleteAccount();
      if (!result?.ok) {
        setDeleteError(result?.error || 'The account was not deleted.');
        return;
      }
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err?.message || 'The account was not deleted.');
    } finally {
      setDeleteBusy(false);
    }
  }, [live, navigate]);
  const unlocked = useCallback(() => {
    setGate(false);
    navigate('/app/me/admin/analytics');
  }, [navigate]);

  return (
    <SubScreen title="Profile setting" compact>
      {/* The photo first and centred, under the title that names the page; no
          section label of its own any more (owner, 2026-09-09). */}
      <div className="set__photo">
        <AvatarPicker
          testId="settings-avatar"
          label="Change photo"
          badge
          name={displayName}
          src={avatarUrl}
          problem={photoError}
          hint={photoBusy ? 'Saving photo…' : ''}
          onPick={async (file) => {
            if (!live) {
              setProfile({ avatarFile: file });
              return;
            }
            setPhotoError('');
            setPhotoBusy(true);
            try {
              const result = await saveAvatar(file);
              if (!result?.ok || !result.url) {
                setPhotoError(result?.error || 'The photo was not saved.');
                return;
              }
              setProfile({ avatarUrl: result.url });
            } catch (err) {
              setPhotoError(err?.message || 'The photo was not saved.');
            } finally {
              setPhotoBusy(false);
            }
          }}
        />
      </div>
      <ul className="sub__list">
        {rows.map((a) => (
          <li key={a.label} className="sub__row set__row" data-testid="account-row">
            <div className="sub__row-mid"><p className="sub__row-title">{a.label}</p></div>
            <p className="set__value">{a.value}</p>
          </li>
        ))}
      </ul>

      <h2 className="sub__label">Shipping address</h2>
      {/* Where the shop's perks and the merch in Orders actually go, so it
          belongs on this screen rather than behind a checkout the app does not
          have. autoComplete tokens are the real ones: a browser or a phone
          keychain fills this in one tap, which is most of the value of asking. */}
      <div className="set__addr">
        <AddressFields
          value={draft}
          onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
          idPrefix="set"
        />
      </div>
      {/* Only once something changed, and secondary: a Save standing full-width
          and violet under an untouched form reads as the screen's main action,
          which it is not. The admin panels settled this the same way. */}
      {dirty && (
        <div className="set__addr-save">
          <Button
            variant="secondary"
            onClick={() => {
              setAddrError('');
              Promise.resolve(saveAddress(draft)).catch((err) => setAddrError(err.message || 'Could not save the address.'));
            }}
          >
            Save address
          </Button>
          {addrError ? <p role="alert">{addrError}</p> : null}
        </div>
      )}

      {/* Payouts left Settings on 2026-09-08: a payout method is only ever
          needed when cashing out, so it lives inside Wallet's Withdraw sheet,
          saved for next time — the same footing as the shipping address. */}

      {/* The one destructive thing on the screen, so the one coloured thing,
          and last — where nothing is reached by accident on the way past. */}
      <button type="button" className="set__delete" onClick={() => { setDeleteError(''); setDeleteOpen(true); }}>
        Delete account
      </button>

      {/* The console's way in. Deliberately quiet — it is the version line,
          it draws nothing on hover, and it is not announced as "Admin" alone:
          the accessible name carries the visible text FIRST so voice control
          can still say what it sees (WCAG 2.5.3), then what it does. */}
      <button
        type="button"
        className="set__version"
        aria-label={`${version} — admin account`}
        onClick={() => setGate(true)}
      >
        {version}
      </button>

      {/* The legal links, which came off Me on 2026-09-21 when it stopped at
          the wallet. Log out is not among them: it is the account drawer's last
          row, and two ways out on one screen is one too many. */}
      <nav className="scr__footer" aria-label="Legal">
        <Link to="/legal/terms">Terms</Link>
        {/* Payouts came off at the owner's request. /legal/payouts is still a
            route; the only other link to it is the dormant marketing footer. */}
        <Link to="/legal/privacy">Privacy</Link>
      </nav>

      <AdminGateDialog open={gate} onClose={closeGate} onUnlocked={unlocked} />
      <Dialog
        open={deleteOpen}
        onClose={closeDelete}
        title="Delete account"
        width={380}
        footer={(
          <>
            <Button variant="ghost" onClick={closeDelete} disabled={deleteBusy}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete account'}
            </Button>
          </>
        )}
      >
        <p>This removes your login. Your orders, cash, and missions go with it. It cannot be undone.</p>
        {deleteError ? <p role="alert">{deleteError}</p> : null}
      </Dialog>
    </SubScreen>
  );
}
