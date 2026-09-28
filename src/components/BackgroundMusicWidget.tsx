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
    const nextVol = status.volume < 0.7 ? 0.85 : status.volume < 0.95 ? 1.0 : 0.55;
    backgroundMusic.setVolume(nextVol);
    if (status.isMuted) {
      backgroundMusic.setMuted(false);
    }
  };

  const volumePct = Math.round(status.volume * 100);

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-[#2B2A28] text-[#FFFFFF] rounded-full border border-[#D5D4D4] shadow-md transition-all select-none ${className}`}
    >
      {/* Soundwaves icon */}
      <div
        onClick={() => setShowVolumeSlider(!showVolumeSlider)}
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 pl-1"
        title="Click to adjust volume level"
      >
        <div className="flex items-end gap-0.5 h-3.5 w-3.5">
          <span
            className={`w-0.5 bg-[#008DD2] rounded-full transition-all duration-300 ${
              status.isPlaying && !status.isMuted ? "h-3 animate-pulse" : "h-1"
            }`}
          />
          <span
            className={`w-0.5 bg-[#008DD2] rounded-full transition-all duration-300 ${
              status.isPlaying && !status.isMuted ? "h-3.5 animate-bounce" : "h-1.5"
            }`}
          />
          <span
            className={`w-0.5 bg-[#008DD2] rounded-full transition-all duration-300 ${
              status.isPlaying && !status.isMuted ? "h-2 animate-pulse" : "h-1"
            }`}
          />
        </div>
        <span className="text-[11px] font-bold text-[#FFFFFF] tracking-wide hidden sm:inline-block">
          {status.isMuted
            ? "Audio (Muted)"
            : status.isPlaying
            ? "Audio (Active)"
            : "Audio (Paused)"}
        </span>
      </div>

      {/* Volume Percentage Badge / Boost Button */}
      <button
        type="button"
        onClick={handleQuickBoost}
        className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#E6F4FA] text-[#006393] hover:bg-[#CCE8F6] border border-[#59B5E2] transition-colors cursor-pointer"
        title="Click to Boost Volume (Standard -> Loud -> Max)"
      >
        {status.isMuted ? "0%" : `${volumePct}% Vol`}
      </button>

      {/* Slider popup on click/hover */}
      {showVolumeSlider && (
        <div className="flex items-center gap-1.5 px-2 bg-[#403F3E] rounded-lg py-1 border border-[#757573]">
          <Volume1 className="w-3 h-3 text-[#D5D4D4]" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={status.volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 accent-[#008DD2] cursor-pointer"
          />
        </div>
      )}

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className="p-1 rounded-full hover:bg-[#403F3E] text-[#FFFFFF] transition-colors cursor-pointer"
        title={status.isPlaying ? "Pause Audio" : "Play Audio"}
      >
        {status.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#008DD2]" />}
      </button>

      {/* Mute/Unmute Button */}
      <button
        type="button"
        onClick={handleToggleMute}
        className="p-1 rounded-full hover:bg-[#403F3E] text-[#FFFFFF] transition-colors cursor-pointer"
        title={status.isMuted ? "Unmute Audio" : "Mute Audio"}
      >
        {status.isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#B5B4B4]" /> : <Volume2 className="w-3.5 h-3.5 text-[#008DD2]" />}
      </button>
    </div>
  );
};
