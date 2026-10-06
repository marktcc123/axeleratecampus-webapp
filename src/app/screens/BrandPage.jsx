import { useLocation, useParams } from 'react-router-dom';
import ImageSlot from '../ImageSlot.jsx';
import { useContent } from '../content.jsx';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import DetailTopBar from '../parts/DetailTopBar.jsx';
import { cover } from '../parts/cover.js';
import { brandIndex, brandSite, what, BrandBody } from '../parts/Brands.jsx';
import '../parts/brands.css';
import './brand-page.css';

// A brand's own page, built like the mission page (owner, 2026-09-09): a
// full-bleed cover at the top — shorter than the mission's — with the brand's
// name and what it has on highlighter blocks over the photo, Back and Share
// fixed over it, and the missions and products on the white below. The cover
// is the brand's own art where a mission or product carries some; a labelled
// slot where none does.
export default function BrandPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { brands, missions, products } = useContent();
  const brand = brandIndex(brands, missions, products).find((b) => b.id === slug);
  if (!brand) return <NotFoundPage bare />;
  // The brand's own cover, set in the console. A brand onboarded without one
  // borrows the art of the first thing it has, which is what every brand page
  // did before the table existed.
  const art = brand.cover || brand.missions[0]?.cover || brand.products[0]?.covers?.[0];
  const site = brandSite(brand);
  return (
    <div className="scr bp">
      <div className="bp__cover">
        <ImageSlot label={brand.name} src={cover(art)} ratio="2 / 1" radius={0} />
        <div className="bp__lines">
          <p className="bp__caps"><span>{what(brand)}</span></p>
          <h1 className="bp__title"><span>{brand.name}</span></h1>
        </div>
      </div>
      <DetailTopBar backTo={location.state?.from ?? '/app/earn'} shareTitle={brand.name} />
      <div className="bp__body">
        {/* The brand's own words, from the console. A brand with none goes
            straight to its lists, as every brand did before. */}
        {brand.blurb && <p className="bp__blurb">{brand.blurb}</p>}
        {site && (
          <a className="bp__site" href={site} target="_blank" rel="noopener noreferrer">
            Brand site <span aria-hidden="true">&raquo;</span>
          </a>
        )}
        <BrandBody brand={brand} />
      </div>
    </div>
  );
}
