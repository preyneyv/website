import React from 'react';
import { Theme, defaultTermData, TermData } from './types';
import Oscar from './beans/Oscar';

type Setter<T> = (next: T) => void;

export type ThemeContextValue = [theme: Theme, setTheme: Setter<Theme>];
/**
 * The theme context contains the current value of the app theme (dark or light)
 */
export const ThemeContext = React.createContext<ThemeContextValue>([
  'light',
  () => {}
]);

export type TermsContextValue = [
  allTerms: string[],
  setAllTerms: Setter<string[]>
];
/**
 * The terms context contains a list of all valid terms
 */
export const TermsContext = React.createContext<TermsContextValue>([
  [],
  () => {}
]);

export type ScheduleContextData = {
  term: string;
  oscar: Oscar;
} & TermData;
export type ScheduleContextSetters = {
  setTerm: Setter<string>;
  patchTermData: Setter<Partial<TermData>>;
};
export type ScheduleContextValue = [
  ScheduleContextData,
  ScheduleContextSetters
];
/**
 * The schedule context contains all of the current schedule data
 * for the current's user's schedule given the current term.
 */
export const ScheduleContext = React.createContext<ScheduleContextValue>([
  {
    term: '',
    oscar: (null as unknown) as Oscar,
    ...defaultTermData
  },
  {
    setTerm: () => {},
    patchTermData: () => {}
  }
]);

export type OverlayCrnsContextValue = [string[], Setter<string[]>];
/**
 * The overlay CRNs context stores a list of CRNs that are to be shown
 * as the overlay/transparent state on the calendar.
 */
export const OverlayCrnsContext = React.createContext<OverlayCrnsContextValue>([
  [],
  () => {}
]);
