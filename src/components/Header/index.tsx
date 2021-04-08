import React, { useContext, useMemo } from 'react';
import 'react-virtualized/styles.css';
import './stylesheet.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

import { getSemesterName } from '../../utils';
import { LARGE_MOBILE_BREAKPOINT, DESKTOP_BREAKPOINT } from '../../constants';
import { HeaderActionBar, Button, Select, Tab } from '..';
import { useScreenWidth } from '../../hooks';
import { ScheduleContext, TermsContext } from '../../contexts';

export type HeaderProps = {
  currentTab: number;
  onChangeTab: (newTab: number) => void;
  onToggleMenu: () => void;
  tabs: string[];
  captureRef: React.RefObject<HTMLElement>;
};

/**
 * Renders the top header component,
 * and includes controls for top-level tab-based navigation
 */
const Header = ({
  currentTab,
  onChangeTab,
  onToggleMenu,
  tabs,
  captureRef
}: HeaderProps) => {
  const [{ term, oscar, pinnedCrns }, { setTerm }] = useContext(
    ScheduleContext
  );
  const [terms] = useContext(TermsContext);

  const totalCredits = useMemo(() => {
    return pinnedCrns.reduce((credits, crn) => {
      return credits + oscar.findSection(crn).credits;
    }, 0);
  }, [pinnedCrns, oscar]);

  // Re-render when the page is re-sized to become mobile/desktop
  // (desktop is >= 1024 px wide)
  const mobile = !useScreenWidth(DESKTOP_BREAKPOINT);

  // Re-render when the page is re-sized to be small mobile vs. greater
  // (small mobile is < 600 px wide)
  const largeMobile = useScreenWidth(LARGE_MOBILE_BREAKPOINT);
  return (
    <div className="Header">
      {/* Menu button, only displayed on mobile */}
      {mobile && (
        <Button className="nav-menu-button" onClick={onToggleMenu}>
          <FontAwesomeIcon className="icon" fixedWidth icon={faBars} />
        </Button>
      )}

      {/* Left-aligned logo */}
      <Button className="logo">
        <span className="gt">GT </span>
        <span className="scheduler">Scheduler</span>
      </Button>

      {/* Term selector */}
      <Select
        onChange={setTerm}
        value={term}
        options={terms.map((currentTerm) => ({
          value: currentTerm,
          label: getSemesterName(currentTerm)
        }))}
        className="semester"
      />

      <span className="credits">{totalCredits} Credits</span>

      {/* Include middle-aligned tabs on desktop */}
      {!mobile && (
        <div className="tabs">
          {tabs.map((tabLabel, tabIdx) => (
            <Tab
              key={tabIdx}
              active={tabIdx === currentTab}
              onClick={() => onChangeTab(tabIdx)}
              label={tabLabel}
            />
          ))}
        </div>
      )}

      {/* Include action bar on large mobile and higher */}
      {largeMobile && <HeaderActionBar captureRef={captureRef} />}
    </div>
  );
};

export default Header;
