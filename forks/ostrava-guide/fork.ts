import type { Fork } from '../../src/types.js';
import feed0 from './ostrava-guide-industrial-heritage.js';
import feed1 from './ostrava-guide-food-drink.js';
import feed2 from './ostrava-guide-nightlife-festivals.js';
import feed3 from './ostrava-guide-nature-outdoors.js';
import feed4 from './ostrava-guide-culture-arts.js';
import feed5 from './ostrava-guide-practical-tips.js';
import feed6 from './ostrava-guide-quiz.js';

const fork: Fork = {
  meta: {
    "id": "ostrava-guide",
    "title": "Ostrava",
    "description": "The complete guide to Czech Republic's steel city turned cultural powerhouse. Industrial heritage, Silesian cuisine, world-class festivals, and mountain trails just 40 minutes away.",
    "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Ostrava-mainsquare.jpg"
  },
  feeds: [feed0, feed1, feed2, feed3, feed4, feed5, feed6],
};

export default fork;
