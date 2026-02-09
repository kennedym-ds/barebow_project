import { NavLink } from 'react-router-dom';
import './NavSidebar.css';

export default function NavSidebar() {
  return (
    <nav className="nav-sidebar">
      <div className="nav-header">
        <h2>BareTrack</h2>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/" end>
            🎯 Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/equipment">
            🏹 Equipment Profile
          </NavLink>
        </li>
        <li>
          <NavLink to="/analysis">
            📊 Analysis Lab
          </NavLink>
        </li>
        <li>
          <NavLink to="/session">
            📝 Session Logger
          </NavLink>
        </li>
        <li>
          <NavLink to="/history">
            📜 History
          </NavLink>
        </li>
        <li>
          <NavLink to="/crawls">
            📐 Crawl Manager
          </NavLink>
        </li>
        <li>
          <NavLink to="/analytics">
            📈 Analytics
          </NavLink>
        </li>
        <li>
          <NavLink to="/tuning">
            🔧 Tuning Wizard
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
