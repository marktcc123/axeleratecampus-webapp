import { readInboxIds, writeInboxIds } from '../../src/lib/inbox.js';

test('read marks stay with the login that saved them', () => {
  writeInboxIds('student-a', ['order-1', 'gig-2']);
  expect([...readInboxIds('student-a')].sort()).toEqual(['gig-2', 'order-1']);
  expect(readInboxIds('student-b').size).toBe(0);
  writeInboxIds('student-a', ['order-1']);
  expect([...readInboxIds('student-a')]).toEqual(['order-1']);
});

test('a broken stored list reads as nothing read', () => {
  window.localStorage.setItem('ax-inbox-read:student-c', '{');
  expect(readInboxIds('student-c').size).toBe(0);
  expect(readInboxIds('').size).toBe(0);
});
