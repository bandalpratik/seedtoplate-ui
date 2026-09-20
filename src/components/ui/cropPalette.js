/**
 * Crops rarely ship with photography on day one, so each batch gets a generated
 * organic gradient keyed to the produce.
 */
const PALETTES = {
  onion: {
    base: 'linear-gradient(150deg, #7B2D4E 0%, #A83E5C 38%, #D98A5C 100%)',
    glow: 'radial-gradient(60% 60% at 25% 20%, rgba(255,214,186,0.55) 0%, rgba(255,214,186,0) 70%)',
    ink: '#3A1224',
  },
  wheat: {
    base: 'linear-gradient(150deg, #B4802C 0%, #DDA94A 42%, #F1D79B 100%)',
    glow: 'radial-gradient(60% 60% at 70% 15%, rgba(255,246,219,0.7) 0%, rgba(255,246,219,0) 70%)',
    ink: '#4A3208',
  },
  turmeric: {
    base: 'linear-gradient(150deg, #B4531A 0%, #E0821F 45%, #F5BC5C 100%)',
    glow: 'radial-gradient(55% 55% at 30% 18%, rgba(255,232,190,0.6) 0%, rgba(255,232,190,0) 70%)',
    ink: '#4A2206',
  },
  rice: {
    base: 'linear-gradient(150deg, #6E7A5A 0%, #A3AE86 45%, #E4E3CE 100%)',
    glow: 'radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
    ink: '#2E3423',
  },
  default: {
    base: 'linear-gradient(150deg, #1F4022 0%, #3A703D 45%, #8FBD84 100%)',
    glow: 'radial-gradient(60% 60% at 30% 18%, rgba(226,245,214,0.55) 0%, rgba(226,245,214,0) 70%)',
    ink: '#0E1B10',
  },
};

export function paletteFor(cropName = '') {
  return PALETTES[cropName.toLowerCase()] ?? PALETTES.default;
}
