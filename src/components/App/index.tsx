import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useContext
} from 'react';
import axios from 'axios';
import swal from '@sweetalert/with-react';
import * as Sentry from '@sentry/react';
import Cookies from 'js-cookie';
import { classes } from '../../utils';
import {
  Header,
  Scheduler,
  Map,
  NavDrawer,
  NavMenu,
  Attribution,
  Calendar,
  HeaderActionBar
} from '..';
import { Oscar } from '../../beans';
import { useCookie, useJsonCookie, useScreenWidth } from '../../hooks';
import {
  ScheduleContext,
  TermsContext,
  ThemeContext,
  ThemeContextValue,
  TermsContextValue,
  ScheduleContextValue
} from '../../contexts';
import { defaultTermData, Theme } from '../../types';
import { DESKTOP_BREAKPOINT, LARGE_MOBILE_BREAKPOINT } from '../../constants';

import 'react-virtualized/styles.css';
import './stylesheet.scss';

const NAV_TABS = ['Scheduler', 'Map'];

/**
 * Displays popup when first visiting the site
 */
const useWelcomeModal = () => {
  useEffect(() => {
    const cookieKey = 'visited-merge-notice';
    if (!Cookies.get(cookieKey)) {
      swal({
        button: 'Got It!',
        content: (
          <div>
            <img
              style={{ width: '175px' }}
              alt="GT Scheduler Logo"
              src="/mascot.png"
            />
            <h1>GT Scheduler</h1>
            <p>
              Hey there, yellow jackets!{' '}
              <a href="https://github.com/gt-scheduler">GT Scheduler</a> is a
              new collaboration between{' '}
              <a href="https://bitsofgood.org/">Bits of Good</a> and{' '}
              <a href="https://jasonpark.me/">Jason (Jinseo) Park</a> aimed at
              making class registration easier for everybody! Now, you can
              access course prerequisites, instructor GPAs, live seating
              information, and more all in one location.
            </p>
            <p>
              If you enjoy our work and are interested in contributing, feel
              free to{' '}
              <a href="https://github.com/gt-scheduler/website/pulls">
                open a pull request
              </a>{' '}
              with your improvements. Thank you and enjoy!
            </p>
          </div>
        )
      });

      Cookies.set(cookieKey, 'true', { expires: 365 });
    }
  }, []);
};

/**
 * Handles top-level navigation and app layout with header/content
 */
const AppContent = () => {
  const mobile = !useScreenWidth(DESKTOP_BREAKPOINT);
  const largeMobile = useScreenWidth(LARGE_MOBILE_BREAKPOINT);

  // Allow top-level tab-based navigation
  const [currentTabIndex, setTabIndex] = useState(0);

  // Handle the status of the drawer being open on mobile
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  useEffect(() => {
    // Close the drawer if switching to desktop
    if (isDrawerOpen && !mobile) {
      setIsDrawerOpen(false);
    }
  }, [isDrawerOpen, mobile]);

  // Create the ref to the DOM element containing the fake calendar
  const captureRef = useRef(null);

  return (
    <>
      {/* On mobile, show the nav drawer + overlay */}
      {mobile && (
        <NavDrawer open={isDrawerOpen} onClose={closeDrawer}>
          {/* On small mobile devices,
                  show the header action row */}
          {!largeMobile && (
            <HeaderActionBar
              captureRef={captureRef}
              style={{ minHeight: 64 }}
            />
          )}

          <NavMenu
            items={NAV_TABS}
            currentItem={currentTabIndex}
            onChangeItem={setTabIndex}
          />
        </NavDrawer>
      )}
      {/* The header controls top-level navigation
              and is always present */}
      <Header
        currentTab={currentTabIndex}
        onChangeTab={setTabIndex}
        onToggleMenu={openDrawer}
        tabs={NAV_TABS}
        captureRef={captureRef}
      />
      {currentTabIndex === 0 && <Scheduler />}
      {currentTabIndex === 1 && <Map />}

      {/* Fake calendar used to capture screenshots */}
      <div className="capture-container" ref={captureRef}>
        {/* TODO remove once Calendar gets typing */}
        {/*
          // @ts-ignore */}
        <Calendar className="fake-calendar" capture />
      </div>
    </>
  );
};

/**
 * Utility hook to bundle together behavior related to
 * fetching the scraped Oscar data and instantiating a bean
 */
const useOscar = (
  term: string
): [Oscar | null, (next: Oscar | null) => void] => {
  const [oscar, setOscar] = useState<Oscar | null>(null);

  // Fetch the current term's scraper information
  useEffect(() => {
    setOscar(null);
    if (term) {
      axios
        .get(`https://gt-scheduler.github.io/crawler/${term}.json`)
        .then((res) => {
          const newOscar = new Oscar(res.data);
          setOscar(newOscar);
        });
    }
  }, [term]);

  return [oscar, setOscar];
};

/**
 * Utility hook to bundle together behavior related to the current term
 */
const useCurrentTerm = (): {
  term: string;
  setTerm: (next: string) => void;
  oscar: Oscar | null;
} => {
  const [terms] = useContext(TermsContext);

  // Persist the current term as a cookie
  const [term, setTermRaw] = useCookie('term', terms[0]);

  // Load the current instance of Oscar
  const [oscar, setOscar] = useOscar(term);

  // Reset Oscar whenever the term is set,
  // but only when it actually changes.
  // This causes the screen to go blank while the scraped data is fetched.
  const currentTermValue = useRef(term);
  currentTermValue.current = term;
  const setTerm = useCallback(
    (nextTerm: string) => {
      if (nextTerm !== currentTermValue.current) {
        setTermRaw(nextTerm);
        setOscar(null);
      }
    },
    [setTermRaw, setOscar]
  );

  return { term, setTerm, oscar };
};

/**
 * ScheduleProvider handles all loading behavior for the scraped data
 * for the current term and its associated durable schedule data.
 *
 * Only renders its inner children if the current schedule has been loaded
 */
const ScheduleProvider = ({ children }: { children: React.ReactNode }) => {
  const { term, setTerm, oscar } = useCurrentTerm();

  // Persist the term data as a cookie
  const [termData, patchTermData] = useJsonCookie(term, defaultTermData);

  // Only consider courses and CRNs that exist
  // (fixes issues where a CRN/course is removed from Oscar
  // after a schedule was made with them)
  const filteredTermData = useMemo(() => {
    const courseFilter = (courseId: string) =>
      oscar != null && oscar.findCourse(courseId) != null;
    const crnFilter = (crn: string) =>
      oscar != null && oscar.findSection(crn) != null;

    const desiredCourses = termData.desiredCourses.filter(courseFilter);
    const pinnedCrns = termData.pinnedCrns.filter(crnFilter);
    const excludedCrns = termData.excludedCrns.filter(crnFilter);

    return { ...termData, desiredCourses, pinnedCrns, excludedCrns };
  }, [oscar, termData]);

  // Memoize the context value so that its reference is stable
  const scheduleContextValue = useMemo<ScheduleContextValue>(
    () => [
      { term, oscar: oscar as Oscar, ...filteredTermData },
      { setTerm, patchTermData }
    ],
    [term, oscar, filteredTermData, setTerm, patchTermData]
  );

  // If the scraped JSON hasn't been loaded
  // or if the term hasn't been initialized,
  // then don't render the children
  if (!oscar || term == null) {
    return null;
  }

  return (
    <ScheduleContext.Provider value={scheduleContextValue}>
      {children}
    </ScheduleContext.Provider>
  );
};

/**
 * TermsProvider manages loading the list of terms
 * from the GitHub API.
 *
 * If it has not loaded the terms, it will not render any of its children.
 * Once the terms have been loaded, they will be available in the context.
 */
const TermsProvider = ({ children }: { children: React.ReactNode }) => {
  const [terms, setTerms] = useState<string[] | null>(null);
  useEffect(() => {
    // Fetch all terms via the GitHub API
    axios
      .get(
        'https://api.github.com/repos/gt-scheduler/crawler/contents?ref=gh-pages'
      )
      .then((res) => {
        const newTerms = (res.data as { name: string }[])
          .map((content) => content.name)
          .filter((name: string) => /\d{6}\.json/.test(name))
          .map((name: string) => name.replace(/\.json$/, ''))
          .sort()
          .reverse();
        setTerms(newTerms);
      });
  }, [setTerms]);

  // Invariant: if the terms value is actually null,
  // we do not use this context value
  const termsContextValue = useMemo<TermsContextValue>(
    () => [terms as string[], setTerms],
    [terms, setTerms]
  );

  if (terms == null) {
    return null;
  }

  return (
    <TermsContext.Provider value={termsContextValue}>
      {children}
    </TermsContext.Provider>
  );
};

/**
 * App renders the app using the sequence of:
 *  - TermsProvider
 *  - ScheduleProvider
 *  - AppContent
 * to handle the loading cascade.
 * The above components (except for AppContent)
 * will not render their children unless they have finished loading
 * and placed the loaded values in context,
 * so the app will appear blank as the data loads.
 *
 * App also bootstraps any static cookie-based features
 * such as the theme or welcome modal.
 */
const App = () => {
  // The theme value is a static cookie, so it can be loaded here
  const [theme, setTheme] = useCookie('theme', 'dark');
  const themeContextValue = useMemo<ThemeContextValue>(
    () => [theme as Theme, setTheme],
    [theme, setTheme]
  );

  useWelcomeModal();

  const mobile = !useScreenWidth(DESKTOP_BREAKPOINT);
  const className = classes('App', mobile && 'mobile', theme);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div className={classes('App', className)}>
        <Sentry.ErrorBoundary fallback="An error has occurred">
          <TermsProvider>
            <ScheduleProvider>
              <AppContent />
            </ScheduleProvider>
          </TermsProvider>
        </Sentry.ErrorBoundary>
        <Attribution />
      </div>
    </ThemeContext.Provider>
  );
};

export default App;
