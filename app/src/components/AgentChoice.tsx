import { useTranslation } from "react-i18next";

import { useSimulation, useSimConfig, AGENTS, usePretrained } from "../hooks";
import {
  AgentBtn,
  AgentGrid,
  AgentLabel,
  AgentSub,
  DefautWidgetBox,
  PassengerBtn,
  PassengerToggle,
  PretrainedDot,
  WidgetTitle,
} from "../styles";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

export const AgentChoice = () => {
  const { t } = useTranslation();
  const { status } = useSimulation();
  const { agent, setAgent, isDouble, setIsDouble, mode, savedAgentId, setSavedAgentId } =
    useSimConfig();
  const { has: hasPretrained } = usePretrained();

  const locked = status === "running" || status === "paused";
  const isDemo = mode === "demo";

  const passengerOptions = [
    { label: t("agent.passengers1"), double: false },
    { label: t("agent.passengers2"), double: true },
  ];

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          <VersionTag />
          Agent
          <WidgetHelp content={t("agent.help")} />
        </span>
      </WidgetTitle>

      <PassengerToggle>
        {passengerOptions.map(({ label, double: isD }) => (
          <PassengerBtn
            key={label}
            $active={isDouble === isD}
            $demo={isDemo}
            $locked={locked}
            disabled={locked}
            onClick={() => setIsDouble(isD)}
          >
            {label}
          </PassengerBtn>
        ))}
      </PassengerToggle>

      <AgentGrid>
        {AGENTS.map(({ key, tKey, subKey }) => {
          const label = t(tKey);
          const sub = t(subKey);
          // A saved agent (demo) takes precedence: while one is selected, no
          // base agent card is highlighted. Clicking a card clears it.
          const active = savedAgentId == null && agent === key;
          const trained = hasPretrained(key, isDouble);
          return (
            <AgentBtn
              key={key}
              $active={active}
              $demo={isDemo}
              $locked={locked}
              disabled={locked}
              onClick={() => {
                setAgent(key);
                setSavedAgentId(null);
              }}
            >
              {isDemo && trained && <PretrainedDot title={t("agent.pretrained")} />}
              <AgentLabel $active={active}>{label}</AgentLabel>
              <AgentSub>{sub}</AgentSub>
            </AgentBtn>
          );
        })}
      </AgentGrid>
    </DefautWidgetBox>
  );
};
