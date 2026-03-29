// Counting Sheep - data pool for infinite sleep-aid generator
// 1 normal sheep image + 45 rare sheep across 3 rarity tiers

// Forkers: replace this domain with your CDN domain (see DEPLOY.md)
const CDN = 'https://d5rfy0lpah1cz.cloudfront.net/content/counting-sheep';

export const NORMAL_SHEEP_IMAGE = `${CDN}/1.png`;
export const BACKGROUND_IMAGE = `${CDN}/bg.jpg`;

export interface RareSheep {
  imageSrc: string;
  title: string;
}

// Uncommon (~9.2%, 1 in ~11 cards) - 21 sheep
export const UNCOMMON_SHEEP: RareSheep[] = [
  { imageSrc: `${CDN}/Cute_sheep_staring.png`, title: 'Still not sleeping?' },
  { imageSrc: `${CDN}/Fluffy_sheep_yawning.png`, title: 'Even I am getting tired' },
  { imageSrc: `${CDN}/Tiny_sheep_jumping.png`, title: 'You almost missed me' },
  { imageSrc: `${CDN}/Fluffy_sheep_on.png`, title: 'I will make it... eventually' },
  { imageSrc: `${CDN}/Fluffy_sheep_jumping_2.png`, title: 'Brought this for you' },
  { imageSrc: `${CDN}/Fluffy_sheep_sleeping.png`, title: 'Zzzzzzz...' },
  { imageSrc: `${CDN}/Baby_lamb_attempting.png`, title: 'My first jump!' },
  { imageSrc: `${CDN}/Elderly_sheep_jumping.png`, title: 'Been jumping fences since before you were born' },
  { imageSrc: `${CDN}/Dizzy_sheep_spinning.png`, title: 'Which way is the fence?' },
  { imageSrc: `${CDN}/Black_sheep_jumping.png`, title: 'Every flock has one' },
  { imageSrc: `${CDN}/Wolf_in_sheep.png`, title: 'Definitely a sheep, keep swiping' },
  { imageSrc: `${CDN}/Two_sheep_stacked.png`, title: 'We count as two, right?' },
  { imageSrc: `${CDN}/Fluffy_sheep_holding.png`, title: 'Human #1... Human #1... Human #1...' },
  { imageSrc: `${CDN}/Fluffy_sheep_jumping_4.png`, title: 'We get sleepy too' },
  { imageSrc: `${CDN}/Fluffy_sheep_sprinting.png`, title: 'Gotta go fast' },
  { imageSrc: `${CDN}/Fluffy_sheep_tumbling.png`, title: 'Pretend you didn\'t see that' },
  { imageSrc: `${CDN}/Fluffy_sheep_in.png`, title: 'You never saw me' },
  { imageSrc: `${CDN}/Fluffy_sheep_pirate.png`, title: 'Arrr, sleep ye scurvy human' },
  { imageSrc: `${CDN}/Fluffy_sheep_wearing.png`, title: 'One does not simply jump' },
  { imageSrc: `${CDN}/Mechanical_robot_sheep.png`, title: 'BLEEP BLOOP. INITIATING JUMP PROTOCOL' },
  { imageSrc: `${CDN}/Clown_sheep_jumping.png`, title: 'Honk if you are still awake' },
];

// Rare (~1.4%, 1 in ~71 cards) - 18 sheep
export const RARE_SHEEP: RareSheep[] = [
  { imageSrc: `${CDN}/Golden_sheep_jumping.png`, title: 'You found the golden sheep!' },
  { imageSrc: `${CDN}/Ghost_sheep_floating.png`, title: 'Boo... now close your eyes' },
  { imageSrc: `${CDN}/Rainbow_sheep_jumping.png`, title: 'Taste the rainbow, count the sheep' },
  { imageSrc: `${CDN}/Muscular_sheep_jumping.png`, title: 'Do you even count, bro?' },
  { imageSrc: `${CDN}/Fluffy_sheep_with.png`, title: 'If no one is awake to see me jump, do I still count?' },
  { imageSrc: `${CDN}/Sheep_floating_with.png`, title: 'I might never come back down' },
  { imageSrc: `${CDN}/Origami_sheep_mid-jump.png`, title: 'Carefully folded for your dreams' },
  { imageSrc: `${CDN}/Fire_sheep_jumping.png`, title: 'Too hot to sleep? Same.' },
  { imageSrc: `${CDN}/Ice_sheep_mid-jump.png`, title: 'Chill out. Literally.' },
  { imageSrc: `${CDN}/Sheep_dissolving_into.png`, title: 'I am literally a cloud' },
  { imageSrc: `${CDN}/Sheep_astronaut_floating.png`, title: 'One small step for sheep' },
  { imageSrc: `${CDN}/Sheep_DJ_playing.png`, title: 'Dropping the sleepiest beats' },
  { imageSrc: `${CDN}/Human_jumping_with.png`, title: 'Plot twist' },
  { imageSrc: `${CDN}/Sheep_wearing_pharaoh.png`, title: 'Sheep counted since 3000 BC' },
  { imageSrc: `${CDN}/Fluffy_sheep_wizard.png`, title: 'Sleepius maximus!' },
  { imageSrc: `${CDN}/Superhero_sheep_flying.png`, title: 'Up, up, and away to bed' },
  { imageSrc: `${CDN}/Sheep_in_scuba.png`, title: 'Wrong habitat' },
  { imageSrc: `${CDN}/Sheep_dressed_as.png`, title: 'This is my final encore. Go to sleep.' },
];

// Legendary (~0.1%, 1 in 1000 cards) - 6 sheep
export const LEGENDARY_SHEEP: RareSheep[] = [
  { imageSrc: `${CDN}/Diamond_sheep_jumping.png`, title: 'Rarer than diamonds. Now sleep.' },
  { imageSrc: `${CDN}/Gigantic_fluffy_sheep.png`, title: 'I AM the fence' },
  { imageSrc: `${CDN}/Sheep_dodging_bullets.png`, title: 'There is no fence' },
  { imageSrc: `${CDN}/Pixel_art_sheep.png`, title: '8-bit dreams' },
  { imageSrc: `${CDN}/Cosmic_sheep_floating.png`, title: 'I contain the universe' },
  { imageSrc: `${CDN}/Cute_sheep_with.png`, title: 'You did it. Now sleep.' },
];
