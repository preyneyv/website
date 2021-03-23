import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import swal from '@sweetalert/with-react';
import * as Sentry from '@sentry/react';
import Cookies from 'js-cookie';
import { classes } from '../../utils';
import { Header, Scheduler, Map, NavDrawer, NavMenu, Attribution } from '..';
import Feedback from '../Feedback';
import { Oscar } from '../../beans';
import { useCookie, useJsonCookie, useMobile } from '../../hooks';
import {
  ScheduleContext,
  TermsContext,
  ThemeContext,
  VersionsContext
} from '../../contexts';
import { defaultScheduleData } from '../../types';

import 'react-virtualized/styles.css';
import './stylesheet.scss';

const NAV_TABS = ['Scheduler', 'Map'];

const App = () => {
  const [terms, setTerms] = useState([]);
  const [oscar, setOscar] = useState(null);

  // Persist the theme, term, versions, and some schedule data as cookies
  const [theme, setTheme] = useCookie('theme', 'dark');
  const [term, setTerm] = useCookie('term');
  const [versionLists, patchVersionsData] = useJsonCookie('versions');
  const [versionName, setVersionName] = useCookie('version');
  const [scheduleData, patchScheduleData] = useJsonCookie(
    term ? term.concat(versionName) : ''.concat(versionName),
    defaultScheduleData
  );

  // Only consider courses and CRNs that exist
  // (fixes issues where a CRN/course is removed from Oscar
  // after a schedule was made with them)
  const filteredScheduleData = useMemo(() => {
    const courseFilter = (courseId) =>
      oscar != null && oscar.findCourse(courseId) != null;
    const crnFilter = (crn) => oscar != null && oscar.findSection(crn) != null;

    const desiredCourses = scheduleData.desiredCourses.filter(courseFilter);
    const pinnedCrns = scheduleData.pinnedCrns.filter(crnFilter);
    const excludedCrns = scheduleData.excludedCrns.filter(crnFilter);

    return { ...scheduleData, desiredCourses, pinnedCrns, excludedCrns };
  }, [oscar, scheduleData]);

  // Memoize context values so that their references are stable
  const themeContextValue = useMemo(() => [theme, setTheme], [theme, setTheme]);
  const termsContextValue = useMemo(() => [terms, setTerms], [terms, setTerms]);
  const scheduleContextValue = useMemo(
    () => [
      { term, versionName, oscar, ...filteredScheduleData },
      { setTerm, setVersionName, setOscar, patchScheduleData }
    ],
    [
      term,
      versionName,
      oscar,
      filteredScheduleData,
      setTerm,
      setVersionName,
      setOscar,
      patchScheduleData
    ]
  );
  const versionsContextValue = useMemo(
    () => [{ ...versionLists }, { patchVersionsData }],
    [versionLists, patchVersionsData]
  );

  // display popup when first visiting the site
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

      Cookies.set(cookieKey, true, { expires: 365 });
    }
  }, []);

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

  // Fetch all terms via the GitHub API
  useEffect(() => {
    axios
      .get(
        'https://api.github.com/repos/gt-scheduler/crawler/contents?ref=gh-pages'
      )
      .then((res) => {
        const newTerms = res.data
          .map((content) => content.name)
          .filter((name) => /\d{6}\.json/.test(name))
          .map((name) => name.replace(/\.json$/, ''))
          .sort()
          .reverse();
        setTerms(newTerms);
      });
  }, [setTerms]);

  // Set the term to be the first one if it is unset
  // (once the terms load)
  useEffect(() => {
    const t = Cookies.get('term');
    if (!term && (!t || t === 'undefined')) {
      const [recentTerm] = terms;
      setTerm(recentTerm);
    } else if (t && t !== 'undefined') {
      setTerm(t);
    }
  }, [terms, term, setTerm]);

  // Initialize the versionName to Primary
  useEffect(() => {
    const v = Cookies.get('version');
    if (!versionName) {
      setVersionName(v || 'Primary');
    }
  }, [versionName, setVersionName]);

  // Initialize the version lists for each term
  useEffect(() => {
    const vs = Cookies.get('versions');
    if (!vs || vs === '{}') {
      patchVersionsData(
        terms.reduce((ac, cur) => ({ ...ac, [cur]: ['Primary', 'New'] }), {})
      );
    }
  }, [patchVersionsData, terms]);

  // Re-render when the page is re-sized to become mobile/desktop
  // (desktop is >= 1024 px wide)
  const mobile = useMobile();
  const className = classes('App', mobile && 'mobile', theme);

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

  // If the scraped JSON hasn't been loaded,
  // then show an empty div as a loading intermediate
  if (!oscar) {
    return <div className={className} />;
  }

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <VersionsContext.Provider value={versionsContextValue}>
        <TermsContext.Provider value={termsContextValue}>
          <ScheduleContext.Provider value={scheduleContextValue}>
            <div className={classes('App', className)}>
              <Sentry.ErrorBoundary fallback="An error has occurred">
                {/* On mobile, show the nav drawer + overlay */}
                {mobile && (
                  <NavDrawer open={isDrawerOpen} onClose={closeDrawer}>
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
                />
                {currentTabIndex === 0 && <Scheduler />}
                {currentTabIndex === 1 && <Map />}
                <Feedback />
              </Sentry.ErrorBoundary>
              <Attribution />
            </div>
          </ScheduleContext.Provider>
        </TermsContext.Provider>
      </VersionsContext.Provider>
    </ThemeContext.Provider>
  );
};

export default App;
