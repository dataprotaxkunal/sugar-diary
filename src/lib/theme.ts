import { useColorScheme } from 'react-native';

const light = {
  bg: '#F2F5F4',
  card: '#FFFFFF',
  cardAlt: '#E8EFEC',
  text: '#0E2A24',
  sub: '#5C716B',
  faint: '#93A39E',
  line: '#DFE7E4',
  primary: '#0F7A63',
  primaryDark: '#0A5C4A',
  primarySoft: '#DBF0EA',
  onPrimary: '#FFFFFF',
  good: '#18874A',
  goodSoft: '#DDF3E5',
  warn: '#C26A0A',
  warnSoft: '#FCEBD5',
  bad: '#C62D37',
  badSoft: '#FADDE0',
  med: '#5B5BD6',
  medSoft: '#E6E6FB',
  ex: '#E2741B',
  exSoft: '#FDEBDC',
  band: 'rgba(24,135,74,0.10)',
  heroFrom: '#0F7A63',
  heroTo: '#16A085',
  shadow: '#0E2A24',
};

const dark: typeof light = {
  bg: '#0B1513',
  card: '#13211E',
  cardAlt: '#1A2C28',
  text: '#E6F0ED',
  sub: '#9AB0AA',
  faint: '#6A7F79',
  line: '#22362F',
  primary: '#3CC3A0',
  primaryDark: '#2BA586',
  primarySoft: '#173B32',
  onPrimary: '#05221B',
  good: '#55D184',
  goodSoft: '#16321F',
  warn: '#F3A64B',
  warnSoft: '#3A2911',
  bad: '#F2777E',
  badSoft: '#3C1719',
  med: '#9D9DF5',
  medSoft: '#25254A',
  ex: '#F5A25E',
  exSoft: '#3A2614',
  band: 'rgba(85,209,132,0.12)',
  heroFrom: '#0D5E4D',
  heroTo: '#11826A',
  shadow: '#000000',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark() {
  return useColorScheme() === 'dark';
}

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
