import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import './NavSidebar.css';

const themeIcons: Record<string, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
};

const themeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

interface NavItem {
  to: string;
  icon: string;
  label: string;
  tooltip: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', icon: '🎯', label: 'Home', tooltip: 'Dashboard with session stats and quick links', end: true },
  { to: '/equipment', icon: '🏹', label: 'Equipment Profile', tooltip: 'Manage bow, arrow, and tab setups' },
  { to: '/analysis', icon: '📊', label: 'Analysis Lab', tooltip: 'Virtual Coach, score prediction, and arrow performance' },
  { to: '/session', icon: '📝', label: 'Session Logger', tooltip: 'Record a shooting session end-by-end on the target face' },
  { to: '/history', icon: '📜', label: 'History', tooltip: 'Browse past sessions, scorecards, and heatmaps' },
  { to: '/crawls', icon: '📐', label: 'Crawl Manager', tooltip: 'String-walking crawl mark calculator and regression' },
  { to: '/analytics', icon: '📈', label: 'Analytics', tooltip: 'Trends, precision metrics, bias analysis, and comparisons' },
  { to: '/tuning', icon: '🔧', label: 'Tuning Wizard', tooltip: 'Step-by-step bow tuning guide with recommendations' },
];

export default function NavSidebar() {
  const [open, setOpen] = useState(false);
  const { theme, cycle } = useTheme();

  return (
    <>
      <button
        className="nav-hamburger"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
      >
        <span className={`hamburger-icon ${open ? 'open' : ''}`} />
      </button>

      {open && <div className="nav-overlay" onClick={() => setOpen(false)} />}

      <nav className={`nav-sidebar ${open ? 'nav-open' : ''}`} aria-label="Main navigation">
        <div className="nav-header">
          <h2>BareTrack</h2>
        </div>
        <ul className="nav-links">
          {navItems.map(item => (
            <li key={item.to} className="nav-item-wrapper">
              <NavLink to={item.to} end={item.end} onClick={() => setOpen(false)}>
                {item.icon} {item.label}
              </NavLink>
              <span className="nav-tooltip" role="tooltip">{item.tooltip}</span>
            </li>
          ))}
          <li className="nav-divider" />
          <li className="nav-item-wrapper">
            <NavLink to="/help" onClick={() => setOpen(false)}>
              ❓ Help &amp; Guide
            </NavLink>
            <span className="nav-tooltip" role="tooltip">Application guide, key concepts, and contact info</span>
          </li>
        </ul>

        <div className="nav-footer">
          <button className="theme-toggle" onClick={cycle} aria-label={`Theme: ${themeLabels[theme]}. Click to change.`}>
            <span className="theme-icon">{themeIcons[theme]}</span>
            <span className="theme-label">{themeLabels[theme]}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
