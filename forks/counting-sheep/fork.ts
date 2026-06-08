import type { Fork } from '../../src/types.js';
import sheepFeed from './counting-sheep-feed.dynamic.js';

const fork: Fork = {
  meta: {
    id: 'counting-sheep',
    title: 'Counting Sheep',
    description: 'A calm, peaceful scroll to replace your doom scrolling at bedtime. Just sheep, one after another. Keep scrolling and you might find a special one.',
    imageSrc: 'https://d5rfy0lpah1cz.cloudfront.net/content/counting-sheep/fork.jpg',
  },
  feeds: [sheepFeed],
};

export default fork;
