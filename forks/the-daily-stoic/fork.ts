import type { Fork } from '../../src/types.js';
import feed0 from './the-daily-stoic-the-stoic-path.js';
import feed1 from './the-daily-stoic-the-three-philosophers.js';
import feed2 from './the-daily-stoic-seeing-clearly.js';
import feed3 from './the-daily-stoic-mastering-your-emotions.js';
import feed4 from './the-daily-stoic-taking-right-action.js';
import feed5 from './the-daily-stoic-the-obstacle-is-the-way.js';
import feed6 from './the-daily-stoic-building-resilience.js';
import feed7 from './the-daily-stoic-amor-fati.js';
import feed8 from './the-daily-stoic-memento-mori.js';
import feed9 from './the-daily-stoic-quiz.js';

const fork: Fork = {
  meta: {
    "id": "the-daily-stoic",
    "title": "The Daily Stoic",
    "description": "366 daily meditations on Stoic wisdom for modern life, from three of history's greatest philosophers.\n\nAll rights belong to the author and publisher. This is a summary/review, buy the book below from the author.",
    "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/the-daily-stoic/fork_202603272114.jpeg",
    "actionLabel": "Buy the book",
    "actionUrl": "https://www.amazon.com/s?k=The+Daily+Stoic+Ryan+Holiday"
  },
  feeds: [feed0, feed1, feed2, feed3, feed4, feed5, feed6, feed7, feed8, feed9],
};

export default fork;
