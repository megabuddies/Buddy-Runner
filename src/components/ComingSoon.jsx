import React, { useEffect, useRef, useState } from 'react';

const frames = [
  '/images/buddy_run1.png',
  '/images/buddy_run2.png'
];

const ComingSoon = () => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const imageElements = frames.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    intervalRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % imageElements.length);
    }, 120);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="soon-container">
      <div className="soon-card">
        <h1 className="title">BUDDY RUNNER</h1>
        <p className="soon-subtitle">Coming soon</p>
        <p className="soon-desc">
          Buddy Runner is an on-chain arcade runner where every jump, score, and power-up
          lives on-chain. Seamless embedded wallets, instant plays, and provable high scores.
          Built for speed-first chains and crafted for mobile.
        </p>

        <div className="bunny-preview" aria-label="Buddy running preview">
          <img
            src={frames[currentFrameIndex]}
            alt="Buddy running"
            className="bunny-frame"
            draggable="false"
          />
          <div className="ground-line" />
        </div>

        <div className="soon-links">
          <a className="button primary" href="https://megabuddies.fun" target="_blank" rel="noreferrer">Stay informed at megabuddies.fun</a>
          <div className="socials">
            <a href="https://x.com/mega_buddies" target="_blank" rel="noreferrer">X: @mega_buddies</a>
            <span className="dot">•</span>
            <a href="https://t.me/megabuddies" target="_blank" rel="noreferrer">Telegram: megabuddies</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;

