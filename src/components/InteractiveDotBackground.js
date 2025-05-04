import React, { useRef, useEffect } from 'react';

const DOT_SIZE = 2;
const DOT_SPACING = 30;
const DOT_HOVER_RADIUS = 40;

function getCSSVar(name) {
  return (
    getComputedStyle(document.body).getPropertyValue(name).trim() ||
    getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  );
}

const InteractiveDotBackground = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const mouse = useRef({ x: -1000, y: -1000 });

  // Draw the grid
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Always get the latest theme colors
    const bgColor = getCSSVar('--primary-bg');
    const dotColor = getCSSVar('--dot-bg') ;
    const hoverColor = getCSSVar('--accent-color') ;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    for (let y = DOT_SPACING / 2; y < height; y += DOT_SPACING) {
      for (let x = DOT_SPACING / 2; x < width; x += DOT_SPACING) {
        const dist = Math.hypot(mouse.current.x - x, mouse.current.y - y);
        ctx.beginPath();
        ctx.arc(x, y, DOT_SIZE, 0, 2 * Math.PI);
        ctx.fillStyle = dist < DOT_HOVER_RADIUS ? hoverColor : dotColor;
        ctx.fill();
      }
    }
  };

  // Animation loop
  const animate = () => {
    draw();
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.current.x = -1000;
      mouse.current.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', draw);

    // MutationObserver to watch for theme changes
    const observer = new MutationObserver(() => {
      draw();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', draw);
      observer.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
};

export default InteractiveDotBackground; 