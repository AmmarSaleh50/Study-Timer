import React, { useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MdHome, MdListAlt, MdTimer, MdChat, MdPerson } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import '../App.css';

const navItems = [
  { path: '/home', label: 'navbar.home', icon: MdHome },
  { path: '/routines', label: 'navbar.routines', icon: MdListAlt },
  { path: '/timer', label: 'navbar.timer', icon: MdTimer },
  { path: '/routine-chat', label: 'navbar.chat', icon: MdChat },
  { path: '/profile', label: 'navbar.account', icon: MdPerson }
];

export default function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const indicatorRef = useRef(null);
  const navRef = useRef(null);
  const { t } = useTranslation();

  // Find the active index
  const activeIdx = navItems.findIndex(item => location.pathname.startsWith(item.path));

  useLayoutEffect(() => {
    if (!navRef.current || !indicatorRef.current || activeIdx === -1) return;
    const navBtns = navRef.current.querySelectorAll('.bottom-nav-item');
    if (navBtns.length === 0) return;
    const activeBtn = navBtns[activeIdx];
    if (!activeBtn) return;
    const { offsetLeft, offsetWidth } = activeBtn;
    indicatorRef.current.style.transform = `translateX(${offsetLeft}px)`;
    indicatorRef.current.style.width = `${offsetWidth}px`;
  }, [activeIdx, location.pathname]);

  return (
    <nav className="bottom-nav-bar" ref={navRef}>
      <div ref={indicatorRef} className="bottom-nav-indicator" />
      {navItems.map((item, idx) => {
        const isActive = idx === activeIdx;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={t(item.label)}
          >
            <span className="nav-icon">
              <Icon size={26} color={isActive ? '#8f8fdd' : '#aaa'} />
            </span>
            <span className="nav-label">{t(item.label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
