import { render } from '@testing-library/react';
import Avatar, { toneFor, initialOf } from '../../src/app/Avatar.jsx';

describe('Avatar', () => {
  test('without a photo it is an accent disc with the initial; the accent is stable per name', () => {
    const { container, rerender } = render(<Avatar name="Mark Tao" size={74} />);
    const el = container.firstChild;
    expect(el).toHaveTextContent('M');
    const tone = el.dataset.tone;
    expect(['coral', 'orange', 'pink', 'blush', 'lavender', 'yellow']).toContain(tone);
    rerender(<Avatar name="Mark Tao" size={36} />);
    expect(container.firstChild.dataset.tone).toBe(tone);           // same person, same colour
    expect(toneFor('mark tao')).toBe(toneFor('Mark Tao'));          // case and spacing do not change it
  });

  test('different names spread across the accents', () => {
    const names = ['Mark Tao', 'Priya N', 'Jordan Lee', 'Sam Okafor', 'Ava Chen', 'Leo Park', 'Mia Rossi', 'Noah Kim'];
    expect(new Set(names.map(toneFor)).size).toBeGreaterThan(2);
  });

  test('with a photo it is the photo, and no initial or tone', () => {
    const { container } = render(<Avatar name="Mark Tao" src="blob:x" size={74} />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:x');
    expect(container.firstChild).not.toHaveTextContent('M');
    expect(container.firstChild.dataset.tone).toBeUndefined();
  });

  test('with no name and no photo it is a plain disc', () => {
    const { container } = render(<Avatar size={36} />);
    expect(initialOf('')).toBe('');
    expect(container.firstChild).toHaveTextContent('');
  });

  test('the type rung follows the disc size, on the ladder the app allows', () => {
    const at = (size) => render(<Avatar name="A" size={size} />).container.firstChild.dataset.scale;
    expect([at(36), at(40), at(74)]).toEqual(['sm', 'md', 'lg']);
  });
});
