import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ScreenHeader, Toast } from 'axelerate-design-system';
import hub from '../../data/hub.example.json';
import { useAdminUnlock } from './gate.jsx';
import { AdminDataProvider, useAdmin } from './store.jsx';
import AdminTabs from './AdminTabs.jsx';
import './admin.css';

// Split out so it can call useAdmin(): the provider is mounted by AdminShell,
// and a component cannot consume a context it mounts itself.
function AdminShellInner() {
  const { counts, toast, dismissToast, operator } = useAdmin();
  const { pathname } = useLocation();
  const account = Object.fromEntries(hub.admin.account.map((a) => [a.label, a.value]));
  const who = operator?.name
    ? `${operator.campus || 'Campus'} · ${operator.name}`
    : `${account.Campus} · ${account['Admin email']}`;

  // The app has no global scroll reset — ScrollToHash exists but nothing routes
  // to it — so a tab switch would leave you wherever the last panel was
  // scrolled to, and unlocking from a scrolled profile lands you mid-page.
  // H5.dc.html calls window.scrollTo(0, 0) on every navigation; so does this.
  // Scoped to the console rather than fixed app-wide, which is the owner's call.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="adm">
      <ScreenHeader
        back={{ as: Link, to: '/app/me', label: 'Back to me' }}
        kicker="Me"
        title="Admin"
      />
      <p className="adm__who">
        {who}
      </p>
      <AdminTabs counts={counts} />
      <div className="adm__panel">
        <Outlet />
      </div>
      {toast && (
        <div className="adm__toast">
          <Toast
            tone="success"
            title={toast.title}
            description={toast.description}
            onDismiss={dismissToast}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminShell() {
  const { unlocked } = useAdminUnlock();

  // Locked, a URL bounces to the profile with a flag so Me opens the gate
  // dialog. Rendering the console behind a dialog would put real rows one
  // devtools node away from a reader who has not entered anything.
  if (!unlocked) {
    // Settings, not /app/me: the gate dialog moved to the version line at the
    // foot of Settings, and a redirect to a screen that no longer listens for
    // this flag is a bounce with no explanation.
    return <Navigate to="/app/me/profilesetting" replace state={{ adminGate: true }} />;
  }

  return (
    <AdminDataProvider>
      <AdminShellInner />
    </AdminDataProvider>
  );
}
