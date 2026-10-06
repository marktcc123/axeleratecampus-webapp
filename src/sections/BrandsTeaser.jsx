import { Link } from 'react-router-dom';
import { Bubble } from 'axelerate-design-system';
import './sections.css';

export default function BrandsTeaser() {
  return (
    <Bubble tone="lavender" tail="bl" tilt={1} who="For brands">
      <span style={{ display: 'block', margin: '0 0 12px' }}>
        Hiring? Post a mission and reach verified students on their own campus — with a receipt for every result.
      </span>
      <Link to="/for-brands" className="ax-btn ax-btn--secondary ax-btn--sm">For brands »</Link>
    </Bubble>
  );
}
