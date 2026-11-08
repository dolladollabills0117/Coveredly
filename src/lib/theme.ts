// Coveredly brand: warm peach + bright orange + black, from getcoveredly.com and the Tally quiz styling.
export const colors = {
  peach: '#F7E3D0', // brand background
  peachDeep: '#F1D3B6',
  cream: '#FFF8F1', // card surface
  white: '#FFFFFF',
  orange: '#FF7A00', // brand accent
  orangeSoft: '#FFE6CF',
  ink: '#141414', // text (brand black, softened a touch for screens)
  inkSoft: '#5B5148',
  line: '#EAD4BF',
  green: '#1F9D63',
  greenSoft: '#DDF3E8',
  red: '#D64545',
  redSoft: '#FBE3E3',
};

export const fonts = {
  // Fraunces: a modern serif that keeps the site's classic serif feel, but sharper.
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  // Inter: clean modern sans (also what your Tally quizzes use).
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const space = (n: number) => n * 4;
export const shadow = {
  shadowColor: '#7A4A1E',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
