import {Button, Card } from 'axelerate-design-system';
import SubScreen from '../parts/SubScreen.jsx';
import hub from '../../data/hub.example.json';

export default function CoCreations() {
  return (
    <SubScreen
      band="lavender"
      title="Co-creations"
      note="make it with them"
      lede="Brands hand members the pen. Pitch in, get paid, get credited."
    >
      <p className="cc__soon" role="status">Stay tuned. These are examples.</p>
      <div className="cc__list">
        {hub.cocreations.map((c) => (
          <Card key={c.title} variant="sheet" padding="md" data-testid="cocreation">
            <h2 className="sub__row-title">{c.title}</h2>
            <p className="sub__row-meta">{c.meta}</p>
            <Button variant="primary" size="md" className="cc__cta" disabled>{c.cta}</Button>
          </Card>
        ))}
      </div>

      <div className="cc__pitch">
      </div>
    </SubScreen>
  );
}
