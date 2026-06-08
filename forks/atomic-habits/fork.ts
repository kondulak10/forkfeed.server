import type { Fork } from '../../src/types.js';
import feed0 from './atomic-habits-the-power-of-tiny-changes.js';
import feed1 from './atomic-habits-identity-based-habits.js';
import feed2 from './atomic-habits-make-it-obvious.js';
import feed3 from './atomic-habits-your-environment-is-everything.js';
import feed4 from './atomic-habits-make-it-attractive.js';
import feed5 from './atomic-habits-make-it-easy.js';
import feed6 from './atomic-habits-the-two-minute-rule.js';
import feed7 from './atomic-habits-make-it-satisfying.js';
import feed8 from './atomic-habits-mastery-and-beyond.js';
import feed9 from './atomic-habits-quiz.js';

const fork: Fork = {
  meta: {
    "id": "atomic-habits",
    "title": "Atomic Habits",
    "description": "How tiny changes create remarkable results, the proven system for building good habits and breaking bad ones.\n\nAll rights belong to the author and publisher. This is a summary/review, buy the book below from the author.",
    "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/atomic/fork_202603271213.jpeg",
    "actionLabel": "Buy the book",
    "actionUrl": "https://www.amazon.com/s?k=Atomic+Habits+James+Clear"
  },
  feeds: [feed0, feed1, feed2, feed3, feed4, feed5, feed6, feed7, feed8, feed9],
};

export default fork;
