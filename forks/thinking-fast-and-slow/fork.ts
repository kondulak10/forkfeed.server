import type { Fork } from '../../src/types.js';
import feed0 from './thinking-fast-and-slow-meet-your-two-minds.js';
import feed1 from './thinking-fast-and-slow-the-associative-machine.js';
import feed2 from './thinking-fast-and-slow-jumping-to-conclusions.js';
import feed3 from './thinking-fast-and-slow-the-numbers-game.js';
import feed4 from './thinking-fast-and-slow-stories-over-statistics.js';
import feed5 from './thinking-fast-and-slow-the-confidence-trap.js';
import feed6 from './thinking-fast-and-slow-the-logic-of-losses.js';
import feed7 from './thinking-fast-and-slow-decisions-and-frames.js';
import feed8 from './thinking-fast-and-slow-the-two-selves.js';
import feed9 from './thinking-fast-and-slow-quiz.js';

const fork: Fork = {
  meta: {
    "id": "thinking-fast-and-slow",
    "title": "Thinking, Fast and Slow",
    "description": "The Nobel Prize-winning psychologist reveals the two systems that drive how we think, choose, and live.\n\nAll rights belong to the author and publisher. This is a summary/review, buy the book below from the author.",
    "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/download11/fork_202603272118.jpeg",
    "actionLabel": "Buy the book",
    "actionUrl": "https://www.amazon.com/s?k=Thinking+Fast+and+Slow+Daniel+Kahneman"
  },
  feeds: [feed0, feed1, feed2, feed3, feed4, feed5, feed6, feed7, feed8, feed9],
};

export default fork;
