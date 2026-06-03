const assert = require('assert');
const { matchLabels, matchPriority } = require('../index.js');

describe('matchLabels', function() {
  it('matches bug and documentation', function() {
    const text = 'This bug breaks the docs and causes a crash';
    const labels = matchLabels(text, {
      bug: { keywords: ['bug','crash'] },
      documentation: { keywords: ['docs','documentation'] }
    });
    assert(labels.includes('bug'));
    assert(labels.includes('documentation'));
  });
});

describe('matchPriority', function() {
  it('returns P0 for critical text', function() {
    const text = 'production down: urgent issue';
    const priority = matchPriority(text, { P0: { keywords: ['production down','urgent'] } });
    assert.strictEqual(priority, 'P0');
  });
});
