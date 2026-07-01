import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";

import { useSimulations, useSimConfig, SPEED_PRESETS } from "../hooks";
import {
  SpeedHeader,
  SpeedRow,
  SpeedLabels,
  SpeedLabelButton,
  SpeedThumb,
  SpeedTick,
  SpeedTicks,
  SpeedTrack,
  SpeedTrackBar,
} from "../styles";
import { WidgetHelp } from "./WidgetHelp";

export const SpeedSlider = () => {
  const { t } = useTranslation();
  const { slots } = useSimulations();
  const { speedIndex, setSpeedIndex } = useSimConfig();
  const connected = slots.some((s) => s.sim.connected);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const applySpeed = (index: number) =>
    slots.forEach((s) => s.sim.setSpeed(SPEED_PRESETS[index].delay));

  const selectSpeed = (index: number) => {
    if (!connected) return;
    setSpeedIndex(index);
    applySpeed(index);
  };

  const percentFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  };

  const handleSpeedPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!connected) return;
    event.preventDefault();
    setDragPercent(percentFromClientX(event.clientX));

    const handleMove = (moveEvent: PointerEvent) =>
      setDragPercent(percentFromClientX(moveEvent.clientX));
    const handleUp = (upEvent: PointerEvent) => {
      const percent = percentFromClientX(upEvent.clientX);
      const index = Math.min(
        SPEED_PRESETS.length - 1,
        Math.max(0, Math.floor((percent / 100) * SPEED_PRESETS.length))
      );
      setSpeedIndex(index);
      applySpeed(index);
      setDragPercent(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <SpeedRow>
      <SpeedHeader>
        {t("speed.title")}
        <WidgetHelp content={t("speed.help")} />
      </SpeedHeader>
      <SpeedTrack>
        <SpeedTrackBar
          ref={trackRef}
          $disabled={!connected}
          onPointerDown={handleSpeedPointerDown}
        >
          <SpeedTicks>
            {SPEED_PRESETS.map((p) => (
              <SpeedTick key={p.tKey} />
            ))}
          </SpeedTicks>
          <SpeedThumb
            $percent={
              dragPercent ??
              ((speedIndex + 0.5) / SPEED_PRESETS.length) * 100
            }
            $dragging={dragPercent !== null}
            $disabled={!connected}
            onPointerDown={handleSpeedPointerDown}
          />
        </SpeedTrackBar>
        <SpeedLabels>
          {SPEED_PRESETS.map((p, index) => (
            <SpeedLabelButton
              key={p.tKey}
              type="button"
              $active={index === speedIndex}
              disabled={!connected}
              onClick={() => selectSpeed(index)}
              title={t(p.tKey)}
            >
              {t(p.tKey)}
            </SpeedLabelButton>
          ))}
        </SpeedLabels>
      </SpeedTrack>
    </SpeedRow>
  );
};
