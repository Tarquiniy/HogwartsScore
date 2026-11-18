export const HOUSES = ['Гриффиндор', 'Слизерин', 'Хаффлпафф', 'Рейвенкло'];

export const HOUSE_META = {
  Гриффиндор: {
    id: 'gryffindor',
    color: '#740001',
    accent: '#D3A625',
    emoji: '🦁',
  },
  Слизерин: {
    id: 'slytherin',
    color: '#1A472A',
    accent: '#AAAAAA',
    emoji: '🐍',
  },
  Хаффлпафф: {
    id: 'hufflepuff',
    color: '#FFDB00',
    accent: '#372E29',
    emoji: '🦡',
  },
  Рейвенкло: {
    id: 'ravenclaw',
    color: '#0E1A40',
    accent: '#946B2D',
    emoji: '🦅',
  },
};

export const HOUSE_DATIVE = {
  Гриффиндор: 'Гриффиндору',
  Слизерин: 'Слизерину',
  Хаффлпафф: 'Хаффлпаффу',
  Рейвенкло: 'Рейвенкло',
};

export const HOUSE_GENITIVE = {
  Гриффиндор: 'Гриффиндора',
  Слизерин: 'Слизерина',
  Хаффлпафф: 'Хаффлпаффа',
  Рейвенкло: 'Рейвенкло',
};

export const ADMIN_KEY = 'Король Чертей';
export const ADDITIONAL_ADMIN = { userKey: 'admin', fio: 'admin' };

export function isAdminUser(userKey, fio) {
  return userKey === ADMIN_KEY ||
    (userKey === ADDITIONAL_ADMIN.userKey && fio === ADDITIONAL_ADMIN.fio);
}
