import { LEGAL, sectionTitle } from './legal-content.js';
import NotFoundPage from './NotFoundPage.jsx';
import './pages.css';
import '../sections/sections.css';

export default function LegalPage({ kind, bare = false }) {
  const Root = bare ? 'div' : 'main';
  const doc = LEGAL[kind];
  if (!doc) {
    return <NotFoundPage bare={bare} />;
  }
  const published = doc.sections.some((section) => section.paragraphs?.length);
  return (
    <Root className="page">
      <div className="wrap legal">
        <p className="section__kicker">Legal</p>
        <h1 className="page__h1">{doc.title}</h1>
        {published ? (
          <>
            {doc.updated && <p className="legal__updated">Updated {doc.updated}</p>}
            {doc.lede && <p className="page__lede">{doc.lede}</p>}
          </>
        ) : (
          <p className="legal__draft">Draft — legal text to follow.</p>
        )}
        {doc.sections.map((section) => (
          <section key={sectionTitle(section)} className="legal__section">
            <h2 className="section__title legal__h2">{sectionTitle(section)}</h2>
            {section.paragraphs?.length
              ? section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              : <p>This section will be published before launch.</p>}
          </section>
        ))}
      </div>
    </Root>
  );
}
