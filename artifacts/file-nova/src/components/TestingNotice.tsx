import React, { useState, useEffect } from "react";
import { Mail, Megaphone, Timer, X } from "lucide-react";

export function TestingNotice() {
  const [timeLeft, setTimeLeft] = useState("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 3 days from May 28, 2026 20:58:19 (Indian standard time offset +05:30)
    const target = new Date("2026-05-31T20:58:19+05:30").getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const isActive = Date.now() < new Date("2026-05-31T20:58:19+05:30").getTime();

  if (!visible || !isActive) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white py-3 px-4 text-center text-xs sm:text-sm font-bold relative animate-fade-in flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 shadow-md z-[100]">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-indigo-200 animate-bounce shrink-0" />
        <span>
          This website is now run 3 days for testing and dont forget to give your feedback on -{" "}
          <a href="mailto:pixelsubhajit@gmail.com" className="underline hover:text-indigo-200 font-black inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 inline" />
            pixelsubhajit@gmail.com
          </a>
        </span>
      </div>
      
      <div className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full border border-white/20 font-mono text-xs shadow-inner">
        <Timer className="h-3.5 w-3.5 text-amber-300 animate-spin-slow shrink-0" />
        <span>Ends in: {timeLeft}</span>
      </div>

      <button 
        onClick={() => setVisible(false)} 
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white rounded-lg p-1 hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
