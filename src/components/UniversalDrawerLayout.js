import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import '../App.css';

const UniversalDrawerLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
  const drawerVariants = {
    hidden: { x: '-100%' },
    visible: { x: 0, transition: { type: 'tween', duration: 0.15 } },
    exit: { x: '-100%', transition: { type: 'tween', duration: 0.1 } },
  };

  return (
    <div
      className="universal-drawer-layout"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      <div className="dashboard-header" style={{ position: 'relative', width: '100%' }}>
        <div className="drawer-toggle-wrapper">
          {!drawerOpen && (
            <button onClick={() => setDrawerOpen(true)} className="drawer-open-btn button-pop button-ripple">
              <div className="drawer-slashes">
                <div className="drawer-slash" />
                <div className="drawer-slash" />
                <div className="drawer-slash" />
              </div>
            </button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {drawerOpen && (
          <>
            <motion.div
              key="drawer-overlay"
              className="drawer-overlay"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayVariants}
              style={{ position: 'fixed', top: 0, left: 0, zIndex: 2000, width: '100vw', height: '100vh', pointerEvents: 'auto' }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="drawer"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={drawerVariants}
              style={{ position: 'fixed', top: 0, left: 0, zIndex: 2100 }}
            >
              <div className="drawer-header-row" style={{ justifyContent: 'center' }}>
                <span className="drawer-title" style={{ width: '100%', textAlign: 'center', display: 'block' }}>Menu</span>
                <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)}>&times;</button>
              </div>
              <div className="drawer-actions" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
                <button
                  onClick={() => { navigate('/routines'); setDrawerOpen(false); }}
                  style={{
                    background: location.pathname === '/routines' ? '#fff' : '#47449c',
                    color: location.pathname === '/routines' ? '#47449c' : '#fff',
                    border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginBottom: 10
                  }}
                  className="button-pop button-ripple"
                >
                  Routines
                </button>
                <button
                  onClick={() => { navigate('/timer'); setDrawerOpen(false); }}
                  style={{
                    background: location.pathname === '/timer' ? '#fff' : '#47449c',
                    color: location.pathname === '/timer' ? '#47449c' : '#fff',
                    border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer'
                  }}
                  className="button-pop button-ripple"
                >
                  Study Timer
                </button>
                <button
                  onClick={() => { localStorage.clear(); navigate('/login'); }}
                  style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 24 }}
                  className="button-pop button-ripple"
                >
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
};

export default UniversalDrawerLayout;
