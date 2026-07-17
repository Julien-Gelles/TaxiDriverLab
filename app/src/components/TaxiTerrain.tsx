import { useTranslation } from "react-i18next";

import { useSimulation } from "../hooks";
import {
  Centered,
  CheckerBar,
  DefautWidgetBox,
  StatusPill,
  TaxiGlyph,
  TerrainSvg,
  WidgetTitle,
  theme,
} from "../styles";
import type {
  DoublePassengersProps,
  SinglePassengerProps,
  StepState,
} from "../types";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";
import { statusInfo } from "./TopBar";

export const TaxiTerrain = () => {
  const { t } = useTranslation();
  const { layout, step, status, connected, isDouble } = useSimulation();

  if (!layout) {
    return (
      <DefautWidgetBox>
        <WidgetTitle><VersionTag />{t("terrain.title")}</WidgetTitle>
        <CheckerBar />
        <Centered>
          {connected ? t("status.waiting") : t("terrain.apiConnecting")}
        </Centered>
      </DefautWidgetBox>
    );
  }

  const { rows, cols, locations, walls, passengerInTaxi, passengerDelivered } = layout;
  const taxi = step?.taxi;
  const { text: statusText, color: statusColor } = statusInfo(connected ? status : "disconnected", t);

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          <VersionTag />
          {t("terrain.title")}{isDouble ? t("terrain.double") : ""}
          <WidgetHelp content={t("terrain.help")} />
        </span>
        <StatusPill>
          <span className="dot" style={{ background: statusColor }} />
          {statusText}
        </StatusPill>
      </WidgetTitle>
      <CheckerBar />

      <TerrainSvg
        viewBox={`-0.15 -0.15 ${cols + 0.3} ${rows + 0.3}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x={-0.05}
          y={-0.05}
          width={cols + 0.1}
          height={rows + 0.1}
          rx={0.18}
          fill={theme.asphalt}
          stroke={theme.ink}
          strokeWidth={0.1}
        />

        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          return (
            <rect
              key={`cell-${i}`}
              x={c}
              y={r}
              width={1}
              height={1}
              fill="none"
              stroke={theme.asphaltLine}
              strokeWidth={0.03}
            />
          );
        })}

        {locations.map((loc) => {
          const isDest = isDouble
            ? loc.id === step?.p1Dest || loc.id === step?.p2Dest
            : loc.id === step?.destination;
          return (
            <g key={`loc-${loc.id}`}>
              <rect
                x={loc.col + 0.12}
                y={loc.row + 0.12}
                width={0.76}
                height={0.76}
                rx={0.14}
                fill={theme.loc[loc.id]}
                stroke={theme.onAccent}
                strokeWidth={isDest ? 0.09 : 0.06}
                opacity={isDest ? 1 : 0.92}
              />
              <text
                x={loc.col + 0.5}
                y={loc.row + 0.5}
                fontSize={0.3}
                fontWeight="bold"
                fill={theme.onAccent}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {loc.label}
              </text>
            </g>
          );
        })}

        {isDouble ? (
          <DoublePassengers
            step={step}
            locations={locations}
            passengerInTaxi={passengerInTaxi}
            passengerDelivered={passengerDelivered}
          />
        ) : (
          <SinglePassenger
            step={step}
            locations={locations}
            passengerInTaxi={passengerInTaxi}
          />
        )}

        {taxi && (
          <TaxiGlyph
            x={taxi.col + 0.5}
            y={taxi.row + 0.64}
            fontSize={0.66}
            textAnchor="middle"
          >
            {taxiEmoji(step, passengerInTaxi, isDouble)}
          </TaxiGlyph>
        )}

        {walls.map(([a, b], i) => {
          const x = Math.max(a[1], b[1]);
          const y = a[0];
          return (
            <line
              key={`wall-${i}`}
              x1={x}
              y1={y + 0.02}
              x2={x}
              y2={y + 0.98}
              stroke={theme.ink}
              strokeWidth={0.1}
              strokeLinecap="round"
            />
          );
        })}
      </TerrainSvg>
    </DefautWidgetBox>
  );
};

function SinglePassenger({
  step,
  locations,
  passengerInTaxi,
}: SinglePassengerProps) {
  const destination = step?.destination;
  const passenger = step?.passenger;

  const destCell = locations.find((l) => l.id === destination);
  const passengerCell =
    passenger !== undefined && passenger !== passengerInTaxi
      ? locations.find((l) => l.id === passenger)
      : undefined;

  return (
    <>
      {destCell && (
        <text x={destCell.col + 0.82} y={destCell.row + 0.84} fontSize={0.34} textAnchor="middle">
          🏁
        </text>
      )}
      {passengerCell && (
        <text x={passengerCell.col + 0.5} y={passengerCell.row + 0.6} fontSize={0.42} textAnchor="middle">
          🧍
        </text>
      )}
    </>
  );
}

function DoublePassengers({
  step,
  locations,
  passengerInTaxi,
  passengerDelivered,
}: DoublePassengersProps) {
  if (!step) return null;

  const { p1Loc, p1Dest, p2Loc, p2Dest } = step;

  const p1Cell =
    p1Loc !== undefined && p1Loc < passengerInTaxi
      ? locations.find((l) => l.id === p1Loc)
      : undefined;

  const p2Cell =
    p2Loc !== undefined && p2Loc < passengerInTaxi
      ? locations.find((l) => l.id === p2Loc)
      : undefined;

  const dest1Cell =
    p1Loc !== undefined && p1Loc !== passengerDelivered
      ? locations.find((l) => l.id === p1Dest)
      : undefined;

  const dest2Cell =
    p2Loc !== undefined && p2Loc !== passengerDelivered
      ? locations.find((l) => l.id === p2Dest)
      : undefined;

  return (
    <>
      {dest1Cell && (
        <text x={dest1Cell.col + 0.78} y={dest1Cell.row + 0.28} fontSize={0.3} textAnchor="middle">
          🔵
        </text>
      )}
      {dest2Cell && dest2Cell !== dest1Cell && (
        <text x={dest2Cell.col + 0.82} y={dest2Cell.row + 0.28} fontSize={0.3} textAnchor="middle">
          🔴
        </text>
      )}

      {p1Cell && (
        <text x={p1Cell.col + 0.42} y={p1Cell.row + 0.62} fontSize={0.38} textAnchor="middle">
          🧍
        </text>
      )}
      {p2Cell && p2Cell !== p1Cell && (
        <text x={p2Cell.col + 0.62} y={p2Cell.row + 0.62} fontSize={0.38} textAnchor="middle">
          🧑
        </text>
      )}
      {p2Cell && p2Cell === p1Cell && (
        <text x={p2Cell.col + 0.58} y={p2Cell.row + 0.62} fontSize={0.38} textAnchor="middle">
          👥
        </text>
      )}
    </>
  );
}

function taxiEmoji(
  step: StepState | null,
  passengerInTaxi: number,
  isDouble: boolean,
): string {
  if (!step) return "🚖";
  if (isDouble) {
    const onboard = step.p1Loc === passengerInTaxi || step.p2Loc === passengerInTaxi;
    return onboard ? "🚕" : "🚖";
  }
  return step.passenger === passengerInTaxi ? "🚕" : "🚖";
}
