export const HOUSES = ['Гриффиндор', 'Слизерин', 'Хаффлпафф', 'Рейвенкло'];

export const HOUSE_META = {
  Гриффиндор: {
    id: 'gryffindor',
    // Colour of the light behind the flask and the hairline on its card.
    tint: '#b3262f',
    color: '#740001',
    accent: '#D3A625',
    secondary: '#AE0001',
    emoji: '🦁',
    flask: {
      sand: { light: '#FF7A66', core: '#F01E36', deep: '#7A0014' },
    },
  },
  Слизерин: {
    id: 'slytherin',
    // Colour of the light behind the flask and the hairline on its card.
    tint: '#1f8f5f',
    color: '#1A472A',
    accent: '#C0C0C0',
    secondary: '#2A623D',
    emoji: '🐍',
    flask: {
      sand: { light: '#37FF95', core: '#00A344', deep: '#012C16' },
    },
  },
  Хаффлпафф: {
    id: 'hufflepuff',
    // Colour of the light behind the flask and the hairline on its card.
    tint: '#d6a11e',
    // Deep honey instead of flat lemon: the same depth as the other three cards.
    color: '#5E430A',
    accent: '#FFD45C',
    secondary: '#9C7316',
    emoji: '🦡',
    flask: {
      sand: { light: '#FFF48A', core: '#FFCB1F', deep: '#B86E00' },
    },
  },
  Рейвенкло: {
    id: 'ravenclaw',
    // Colour of the light behind the flask and the hairline on its card.
    tint: '#3466d6',
    color: '#0E1A40',
    accent: '#D9A75E',
    secondary: '#222F5B',
    emoji: '🦅',
    flask: {
      sand: { light: '#5AB4FF', core: '#1668F0', deep: '#062A8C' },
      // This bottle's glass is about half opaque over the cavity and washed the
      // sand out to pale grey-blue; a second sand layer shows through it.
      coat: 0.55,
    },
  },
};

export const USER_KEY = 'hogwarts_user_key';
export const USER_FIO = 'hogwarts_user_fio';

/** Sand and the score counter move together over this time, easing out. */
export const FILL_DURATION_MS = 900;

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}
