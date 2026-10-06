import { Link } from 'react-router-dom';
import './pages.css';

// `bare` renders a <div> instead of <main> for callers that already sit
// inside another <main> landmark (AppShell's app__col) — a page can only
// have one <main> without creating two landmarks for the same content.
export default function NotFoundPage({ bare = false }) {
  const Wrapper = bare ? 'div' : 'main';
  return (
    <Wrapper className="page"><div className="wrap">
      <h1 className="page__h1">That page isn't here.</h1>
      <p className="page__lede">Try the start, or the missions board when it opens.</p>
      <Link to="/" className="ax-btn ax-btn--primary ax-btn--md">Back to the start</Link>
    </div></Wrapper>
  );
}
