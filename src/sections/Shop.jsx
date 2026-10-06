import { StickyNote } from 'axelerate-design-system';
import './sections.css';

export default function Shop() {
  return (
    <StickyNote tint="yellow" tilt={-1.5} tape label="The shop" heading="Spend it where you earned it">
      <p style={{ margin: '0 0 8px' }}>
        Partner brands at student prices, with cashback credit — always shown as what it buys:{' '}
        <b>2,400 credit · $24 in shop</b>.
      </p>
      <p style={{ margin: 0 }}>One gate: verification. Nothing is held behind a level at checkout.</p>
    </StickyNote>
  );
}
