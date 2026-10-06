import { clusterDemand, parseBudget, scoreCluster, tokens } from '../../src/lib/demand.js';
import seed from '../../src/data/demand.example.json';

describe('demand clustering', () => {
  const sunscreen = seed.clusters.find((c) => c.id === 'korean-sunscreen-25');

  test('the demo sunscreen sentence matches the seeded block', () => {
    const hit = clusterDemand('A Korean sunscreen under $25, lightweight, no white cast, good for dry skin.');
    expect(hit.cluster.id).toBe('korean-sunscreen-25');
    expect(hit.score).toBeGreaterThanOrEqual(3);
  });

  test('a moisturizer sentence does not steal the sunscreen block', () => {
    const hit = clusterDemand('non sticky Korean moisturizer under $30');
    expect(hit.cluster.id).toBe('barrier-moisturizer-30');
  });

  test('unrelated text does not invent a market', () => {
    expect(clusterDemand('hello there')).toBeNull();
  });

  test('budget parsing and tokenising stay boring on purpose', () => {
    expect(parseBudget('under $25 please')).toBe(25);
    expect(tokens('A Korean sunscreen under $25')).toEqual(expect.arrayContaining(['korean', 'sunscreen', '25']));
    expect(scoreCluster(sunscreen, 'korean sunscreen', 25)).toBeGreaterThan(0);
  });
});
