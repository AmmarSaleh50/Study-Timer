import React from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="home-main-bg fade-slide-in">
      <div className="home-container card-animate">
        <h1 className="home-title heading-animate">Welcome!</h1>
        <p className="home-subtitle heading-animate">What would you like to do?</p>
        <div className="home-buttons">
          <button className="home-btn routines-btn button-pop button-ripple" onClick={() => navigate('/routines')}>Routines</button>
          <button className="home-btn study-btn button-pop button-ripple" onClick={() => navigate('/timer')}>Study Timer</button>
        </div>
      </div>
    </div>
  );
}
