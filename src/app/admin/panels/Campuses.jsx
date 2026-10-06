import { useCallback, useState } from 'react';
import { Button, Dialog, Input } from 'axelerate-design-system';
import { useAdmin } from '../store.jsx';

// The school list. Colour is decoration here — the name is what tells two
// schools apart — so the swatch is aria-hidden and never the only signal.
const BLANK = { name: '', primary_color: '#6E2BEE', logo_url: '' };

export default function Campuses() {
  const store = useAdmin();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(BLANK);

  // useCallback is load-bearing, not tidiness. Dialog's focus effect lists
  // onClose in its deps and its cleanup calls returnTo.focus(); the draft state
  // lives in this component, so an inline arrow made a new onClose on every
  // keystroke, re-ran that effect, and its cleanup pulled focus back to the
  // "Add school" button. Only the first character ever reached the field.
  const close = useCallback(() => { setAdding(false); setDraft(BLANK); }, []);
  const create = () => {
    if (!draft.name.trim()) return;
    store.addCampus({ ...draft, name: draft.name.trim() });
    close();
  };

  return (
    <div>
      <div className="adm-cmp__top">
        <Button onClick={() => setAdding(true)}>Add school</Button>
      </div>

      {/* One card with hairline rows, not four identical floating cards: this is
          a flat list, and a card per item is the lazy answer to a list. Rows
          that OPEN (the queues) stay separate cards, because there each card is
          an object you act on. */}
      <div className="adm-card adm-list">
        {store.campuses.map((c) => (
          <div className="adm-cmp__row" key={c.id} data-testid="campus-row">
            <span className="adm-cmp__dot" aria-hidden="true" style={{ background: c.primary_color }} />
            <div className="adm-row__mid">
              <span className="adm-row__title">{c.name}</span>
              <span className="adm-row__meta">{c.student_count} students</span>
            </div>
            {/* A local button, not Button variant="ghost": ghost paints violet,
                and four violet Removes made the destructive action the loudest
                thing on the screen. Violet is for primary actions. */}
            <button type="button" className="adm-quiet" onClick={() => store.removeCampus(c.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <Dialog
        open={adding}
        onClose={close}
        title="Add school"
        width={400}
        footer={(
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button disabled={!draft.name.trim()} onClick={create}>Create</Button>
          </>
        )}
      >
        {/* No `hint` on any field — DS issue #2 renders it inside the <label>
            and it becomes part of the field's accessible name. */}
        <div className="adm-cmp__form">
          <Input
            label="Name"
            value={draft.name}
            placeholder="e.g. University of Virginia"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            label="Primary colour"
            value={draft.primary_color}
            onChange={(e) => setDraft({ ...draft, primary_color: e.target.value })}
          />
          <Input
            label="Logo URL"
            value={draft.logo_url}
            onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
          />
        </div>
      </Dialog>
    </div>
  );
}
