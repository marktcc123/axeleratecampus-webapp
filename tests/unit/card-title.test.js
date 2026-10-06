// The card's title without the brand that the card now names on its own line
// (owner, 2026-09-22). The fixture writes "Solra — unboxing reel on your feed"
// and every other screen keeps that; only the two board cards shorten it, and
// only when the lead really is the brand.
import { cardTitle } from '../../src/app/parts/title.js';

test('drops a lead that is the brand, and capitalises what is left', () => {
  expect(cardTitle({ title: 'Solra — unboxing reel on your feed', brand: 'Solra' }))
    .toBe('Unboxing reel on your feed');
});

test('a lead that is the first word of the brand counts as the brand', () => {
  expect(cardTitle({ title: 'August — run the tea tasting table', brand: 'August Uncommon Tea' }))
    .toBe('Run the tea tasting table');
});

test('a lead that is only part of a word is not the brand', () => {
  expect(cardTitle({ title: 'Sol — something', brand: 'Solra' })).toBe('Sol — something');
});

test('leaves a title alone when the lead is not its brand, or there is no dash', () => {
  expect(cardTitle({ title: 'Dermabell salon ambassador', brand: 'Axelerate Beauty' }))
    .toBe('Dermabell salon ambassador');
  expect(cardTitle({ title: 'Loop — host a dorm demo night', brand: 'Vera' }))
    .toBe('Loop — host a dorm demo night');
});

test('never returns an empty title, and copes with no brand at all', () => {
  expect(cardTitle({ title: 'Solra — ', brand: 'Solra' })).toBe('Solra — ');
  expect(cardTitle({ title: 'Solra — unboxing reel' })).toBe('Solra — unboxing reel');
  expect(cardTitle({})).toBe('');
});
