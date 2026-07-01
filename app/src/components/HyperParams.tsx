import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSimulation, useSimConfig, defaultMaxSteps } from "../hooks";
import {
  DefautWidgetBox,
  FieldGrid,
  FieldRow,
  FrozenBanner,
  MutedText,
  NumberInput,
  WidgetTitle,
} from "../styles";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

type Field = { label: string; value: number; set: (n: number) => void; step: number; min?: number; max?: number };

export const HyperParams = () => {
  const { t } = useTranslation();
  const { status } = useSimulation();
  const {
    episodes,
    alpha,
    gamma,
    epsilon,
    seed,
    mode,
    isDouble,
    setEpisodes,
    setAlpha,
    setGamma,
    setEpsilon,
    setSeed,
    setMaxSteps,
  } = useSimConfig();

  const locked = status === "running" || status === "paused";
  const isDemo = mode === "demo";

  const [localAlpha, setLocalAlpha] = useState(alpha);
  const [localGamma, setLocalGamma] = useState(gamma);
  const [localEpsilon, setLocalEpsilon] = useState(epsilon);
  const [localSeed, setLocalSeed] = useState(seed);
  const [localMaxStepsOverride, setLocalMaxStepsOverride] = useState<number | null>(null);
  const localMaxSteps = localMaxStepsOverride ?? defaultMaxSteps(mode, isDouble);

  const sync =
    (setLocal: (n: number) => void, setShared: (n: number) => void) =>
    (n: number) => {
      setLocal(n);
      setShared(n);
    };

  const setAlphaBoth = sync(setLocalAlpha, setAlpha);
  const setGammaBoth = sync(setLocalGamma, setGamma);
  const setEpsilonBoth = sync(setLocalEpsilon, setEpsilon);
  const setSeedBoth = sync(setLocalSeed, setSeed);
  const setMaxStepsBoth = sync(setLocalMaxStepsOverride, setMaxSteps);

  const trainFields: Field[] = [
    { label: t("hyper.episodes"), value: episodes, set: setEpisodes, step: 10, min: 1 },
    { label: t("hyper.maxSteps"), value: localMaxSteps, set: setMaxStepsBoth, step: 50, min: 1 },
    { label: t("hyper.alpha"), value: localAlpha, set: setAlphaBoth, step: 0.01, min: 0, max: 1 },
    { label: t("hyper.gamma"), value: localGamma, set: setGammaBoth, step: 0.01, min: 0, max: 1 },
    { label: t("hyper.epsilon"), value: localEpsilon, set: setEpsilonBoth, step: 0.01, min: 0, max: 1 },
    { label: t("hyper.seed"), value: localSeed, set: setSeedBoth, step: 1 },
  ];

  const demoFields: Field[] = [
    { label: t("hyper.episodesDemo"), value: episodes, set: setEpisodes, step: 1, min: 1 },
    { label: t("hyper.seed"), value: localSeed, set: setSeedBoth, step: 1 },
  ];

  const fields = isDemo ? demoFields : trainFields;

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          <VersionTag />
          {isDemo ? t("hyper.title_demo") : t("hyper.title_train")}
          <WidgetHelp content={isDemo ? t("hyper.help_demo") : t("hyper.help_train")} />
        </span>
      </WidgetTitle>

      {isDemo && (
        <FrozenBanner>
          <CheckCircle2 size={15} />
          {t("hyper.frozen")}
        </FrozenBanner>
      )}

      <FieldGrid>
        {fields.map((f) => (
          <FieldRow key={f.label}>
            <span>{f.label}</span>
            <NumberInput
              type="number"
              value={f.value}
              step={f.step}
              min={f.min}
              max={f.max}
              disabled={locked}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) f.set(n);
              }}
            />
          </FieldRow>
        ))}
      </FieldGrid>
      <MutedText>
        {isDemo ? t("hyper.nextDemo") : t("hyper.next")}
      </MutedText>
    </DefautWidgetBox>
  );
};
