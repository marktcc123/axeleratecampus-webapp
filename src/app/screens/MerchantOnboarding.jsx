import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubScreen from '../parts/SubScreen.jsx';
import { useDemand } from '../demand.jsx';
import { useSession } from '../session.jsx';
import { ROLES } from '../../lib/marketplace.js';
import './demand.css';

// Business onboarding, in five steps.
//
// The account comes first and the organization second, because one person may
// later hold several brands and because the consumer account model must not be
// bent to fit a company. Nothing published here reaches a consumer until the
// business is verified — a brand can build its profile and load a catalogue
// while it waits, which keeps the queue from being a dead stop.

const STEPS = ['Account', 'Organization', 'Contact', 'Brand', 'Verification'];

const CATEGORIES = ['Beauty / Personal Care', 'Footwear', 'Apparel', 'Food & Drink', 'Home', 'Electronics'];

export default function MerchantOnboarding() {
  const nav = useNavigate();
  const { createOrganization } = useDemand();
  const { signedIn, signUp, addRole, user } = useSession();

  const [step, setStep] = useState(signedIn ? 2 : 1);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    // A business address is preferred because verification is faster against a
    // domain, but a free address is not refused — plenty of real small brands
    // have no corporate mail.
    workEmail: '',
    name: '',
    legalName: '',
    country: '',
    website: '',
    categories: [],
    contactName: '',
    contactRole: '',
    about: '',
  });

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(null); };
  const toggleCategory = (c) => setForm((f) => ({
    ...f,
    categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
  }));

  const advance = () => {
    if (step === 1) {
      if (!form.firstName.trim()) { setError('Tell us who we’re talking to.'); return; }
      if (!/.+@.+\..+/.test(form.workEmail.trim())) { setError('Enter a valid business email.'); return; }
      signUp({ firstName: form.firstName.trim(), email: form.workEmail.trim(), provider: 'email' });
    }
    if (step === 2) {
      if (!form.name.trim()) { setError('Your brand needs a name.'); return; }
      if (!form.country.trim()) { setError('Where is the business registered?'); return; }
    }
    if (step === 3 && !form.contactName.trim()) { setError('Who should we contact about verification?'); return; }
    if (step === 4 && form.categories.length === 0) { setError('Pick at least one category so we can match you to demand.'); return; }

    if (step === 4) {
      const org = createOrganization(form);
      addRole(ROLES.merchant, org.id);
      setStep(5);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <SubScreen
      title="Register your business"
      kicker="For brands"
      back={{ to: '/brands', label: 'For brands' }}
    >
      <div className="mc" data-testid="merchant-onboarding">
        <ol className="mo__steps" aria-label="Onboarding progress">
          {STEPS.map((label, i) => (
            <li key={label} className="mo__step" data-on={i + 1 <= step ? '' : undefined}>{label}</li>
          ))}
        </ol>

        {step === 1 && (
          <>
            <h2 className="mc__h">Create a business account</h2>
            <p className="mc__p">A business email speeds verification up. A personal one still works.</p>
            <label className="mc__field"><span>Your name</span><input value={form.firstName} onChange={set('firstName')} autoComplete="name" /></label>
            <label className="mc__field"><span>Business email</span><input type="email" value={form.workEmail} onChange={set('workEmail')} autoComplete="email" data-testid="merchant-email" /></label>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mc__h">Your organization</h2>
            <label className="mc__field"><span>Brand name</span><input value={form.name} onChange={set('name')} data-testid="merchant-brand" /></label>
            <label className="mc__field"><span>Registered legal name</span><input value={form.legalName} onChange={set('legalName')} placeholder="Same as brand name if identical" /></label>
            <label className="mc__field"><span>Country of registration</span><input value={form.country} onChange={set('country')} /></label>
            <label className="mc__field"><span>Website</span><input value={form.website} onChange={set('website')} placeholder="https://" /></label>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="mc__h">Business contact</h2>
            <p className="mc__p">One person we can reach about verification and offer reviews.</p>
            <label className="mc__field"><span>Contact name</span><input value={form.contactName} onChange={set('contactName')} /></label>
            <label className="mc__field"><span>Role</span><input value={form.contactRole} onChange={set('contactRole')} placeholder="Founder, Partnerships, Ecommerce…" /></label>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="mc__h">What do you sell?</h2>
            <p className="mc__p">We only show you demand in the categories you pick.</p>
            <div className="dn__chips">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className="dn__chip" aria-pressed={form.categories.includes(c)} onClick={() => toggleCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
            <label className="mc__field"><span>About the brand</span><textarea rows={4} value={form.about} onChange={set('about')} /></label>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="mc__h">Verification in progress</h2>
            <p className="mc__p">
              We check that the business is who it says it is before anything you publish
              reaches a consumer. That is an identity check — it is not a product
              endorsement, and we never present it as one.
            </p>
            <p className="mc__p">
              In the meantime you can finish your profile and load your catalogue. Offer
              submission unlocks the moment verification completes.
            </p>
            <button type="button" className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full" onClick={() => nav('/merchant')}>
              Go to your dashboard
            </button>
          </>
        )}

        {error && <p className="mc__err" role="alert" data-testid="merchant-error">{error}</p>}

        {step < 5 && (
          <button type="button" className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full" onClick={advance} data-testid="merchant-next">
            {step === 4 ? 'Submit for verification' : 'Continue'}
          </button>
        )}
      </div>
    </SubScreen>
  );
}
