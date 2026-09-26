import React, { useEffect, useState } from "react";
import { backgroundMusic } from "../lib/backgroundMusic";
import { Volume2, VolumeX, Play, Pause, Volume1 } from "lucide-react";

export const BackgroundMusicWidget: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [status, setStatus] = useState(() => backgroundMusic.getStatus());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    const unsubscribe = backgroundMusic.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    backgroundMusic.toggleMute();
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status.isPlaying) {
      backgroundMusic.stop();
    } else {
      backgroundMusic.start("quiz");
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVol = parseFloat(e.target.value);
    backgroundMusic.setVolume(newVol);
    if (status.isMuted) {
      backgroundMusic.setMuted(false);
    }
  };

  const handleQuickBoost = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle between 0.55 (Standard), 0.80 (Loud), 1.0 (Maximum)
    const nextVol = status.volume < 0.7 ? 0.85 : status.volume < 0.95 ? 1.0 : 0.55;
    backgroundMusic.setVolume(nextVol);
    if (status.isMuted) {
      backgroundMusic.setMuted(false);
    }
  };

  const volumePct = Math.round(status.volume * 100);

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-slate-900/95 hover:bg-slate-900 text-white rounded-full border border-amber-500/40 shadow-2xl backdrop-blur-md transition-all select-none ${className}`}
    >
      {/* Soundwaves icon */}
      <div
        onClick={() => setShowVolumeSlider(!showVolumeSlider)}
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 pl-1"
        title="Click to adjust volume level"
      >
        <div className="flex items-end gap-0.5 h-3.5 w-3.5">
          <span
            className={`w-0.5 bg-amber-400 rounded-full transition-all duration-300 ${
              status.isPlaying && !status.isMuted ? "h-3 animate-pulse" : "h-1"
            }`}
          />
          <span
            className={`w-0.5 bg-amber-400 rounded-full transition-all duration-300 ${
              status.isPlaying && !status.isMuted ? "h-3.5 animate-bounce" : "h-1.5"
            }`}
          />
          <span
            className={`w-0.5 bg-amber-400 rounded-full transition-all duration-300 ${
              status.isPlaying && !status.isMuted ? "h-2 animate-pulse" : "h-1"
            }`}
          />
        </div>
        <span className="text-[11px] font-bold text-slate-200 tracking-wide hidden sm:inline-block">
          {status.isMuted
            ? "Quiz Music (Muted)"
            : status.isPlaying
            ? "Quiz Music (Loud & Clear)"
            : "Quiz Music (Paused)"}
        </span>
      </div>

      {/* Volume Percentage Badge / Boost Button */}
      <button
        type="button"
        onClick={handleQuickBoost}
        className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer"
        title="Click to Boost Volume (Standard -> Loud -> Max)"
      >
        {status.isMuted ? "0%" : `${volumePct}% Vol`}
      </button>

      {/* Slider popup on click/hover */}
      {showVolumeSlider && (
        <div className="flex items-center gap-1.5 px-2 bg-slate-800 rounded-lg py-1 border border-slate-700">
          <Volume1 className="w-3 h-3 text-slate-400" />
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={status.volume}
            onChange={handleVolumeChange}
            className="w-16 h-1.5 accent-amber-400 cursor-pointer"
            title={`Volume: ${volumePct}%`}
          />
          <Volume2 className="w-3 h-3 text-amber-400" />
        </div>
      )}

      <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={status.isPlaying ? "Pause Music" : "Play Music"}
        >
          {status.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        {/* Mute/Unmute Button */}
        <button
          type="button"
          onClick={handleToggleMute}
          className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
          title={status.isMuted ? "Unmute Music" : "Mute Music"}
        >
          {status.isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </button>
      </div>
    </div>
  );
};
