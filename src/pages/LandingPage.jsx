import Hero from '../sections/Hero.jsx';
import Loop from '../sections/Loop.jsx';
import Missions from '../sections/Missions.jsx';
import Ladder from '../sections/Ladder.jsx';
import Shop from '../sections/Shop.jsx';
import BrandsTeaser from '../sections/BrandsTeaser.jsx';
import CtaBand from '../sections/CtaBand.jsx';

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Loop />
      <Missions />
      <Ladder />
      <section className="section" aria-label="Shop and brands">
        <div className="wrap aside-row">
          <Shop />
          <BrandsTeaser />
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
