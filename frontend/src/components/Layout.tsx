import { Outlet } from 'react-router-dom';
import NavSidebar from './NavSidebar';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <NavSidebar />
      <main className="main-content" role="main">
        <Outlet />
      </main>
    </div>
  );
}
