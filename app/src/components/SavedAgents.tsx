import { useMemo, useRef, useState } from "react";
import { Download, Save, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSimulation, useSimConfig, useSavedAgents } from "../hooks";
import {
  DefautWidgetBox,
  IconMini,
  MutedText,
  OriginBadge,
  SavedActions,
  SavedBtn,
  SavedCard,
  SavedEmpty,
  SavedForm,
  SavedHint,
  SavedInput,
  SavedList,
  WidgetTitle,
} from "../styles";
import type { AgentKey, SavedAgent } from "../types";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

// Stable, non-translated slug used to build the default save name. Only tabular
// agents are saveable, but DQN is listed too so its placeholder reads
// "My-DQN-1" rather than "My-D-1".
const AGENT_SLUG: Partial<Record<AgentKey, string>> = {
  Q: "Q-Learning",
  S: "SARSA",
  M: "Monte-Carlo",
  D: "DQN",
};

// Next free "My-<slug>-N" name not already taken by a saved agent.
const nextDefaultName = (slug: string, taken: SavedAgent[]): string => {
  const prefix = `My-${slug}-`;
  const used = new Set(
    taken
      .map((a) => a.name)
      .filter((n) => n.startsWith(prefix))
      .map((n) => Number(n.slice(prefix.length)))
      .filter((n) => Number.isInteger(n) && n > 0)
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `${prefix}${n}`;
};

export const SavedAgents = () => {
  const { t } = useTranslation();
  const { qTable, status } = useSimulation();
  const { agent, isDouble, mode, savedAgentId, setSavedAgentId, setAgent, setIsDouble } =
    useSimConfig();
  const {
    agents,
    maxSlots,
    hasFreeSlot,
    saveLocal,
    saveFile,
    exportFile,
    importFile,
    remove,
  } = useSavedAgents();

  const isDemo = mode === "demo";
  const locked = status === "running" || status === "paused";
  // Only tabular agents (Q/SARSA/Monte Carlo) carry a saveable model. DQN's full
  // weights never reach the front, and random/heuristic have no learned model.
  const isTabular = agent === "Q" || agent === "S" || agent === "M";
  // A saveable model = a tabular agent that has produced a Q-table.
  const trainedQ = qTable?.q ?? null;
  const canSave = isTabular && !!trainedQ && trainedQ.length > 0;

  const slug = AGENT_SLUG[agent] ?? agent;
  const defaultName = useMemo(() => nextDefaultName(slug, agents), [slug, agents]);
  // When nothing can be saved, the suggested name is a plain "-" so it doesn't
  // look like a (non-existent) saveable model for the current agent.
  const placeholder = canSave ? defaultName : "-";
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveName = name.trim() || defaultName;
  const selectable = isDemo && !locked;

  const handleSaveLocal = () => {
    if (!canSave || !trainedQ) return;
    const ok = saveLocal({ name: effectiveName, agent, double: isDouble, qTable: trainedQ });
    if (ok) {
      setName("");
      setMsg(null);
    } else {
      setMsg(t("saved.slotsFull"));
    }
  };

  const handleSaveFile = () => {
    if (!canSave || !trainedQ) return;
    saveFile({ name: effectiveName, agent, double: isDouble, qTable: trainedQ });
    setName("");
    setMsg(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    const ok = await importFile(file);
    setMsg(ok ? null : t("saved.importFailed"));
  };

  const select = (sa: SavedAgent) => {
    if (!selectable) return;
    setSavedAgentId(sa.id);
    setAgent(sa.agent);
    setIsDouble(sa.double);
  };

  const handleDelete = (sa: SavedAgent) => {
    if (savedAgentId === sa.id) setSavedAgentId(null);
    remove(sa.id);
  };

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          <VersionTag />
          {t("saved.title")}
          <WidgetHelp content={t("saved.help")} />
        </span>
        <MutedText>{t("saved.slots", { used: agents.length, max: maxSlots })}</MutedText>
      </WidgetTitle>

      <SavedForm>
        <SavedInput
          value={name}
          placeholder={placeholder}
          disabled={!canSave}
          onChange={(e) => setName(e.target.value)}
        />
        <SavedActions>
          <SavedBtn onClick={handleSaveLocal} disabled={!canSave || !hasFreeSlot} title={t("saved.saveLocal")}>
            <Save size={13} />
            {t("saved.local")}
          </SavedBtn>
          <SavedBtn onClick={handleSaveFile} disabled={!canSave} title={t("saved.saveFile")}>
            <Download size={13} />
            {t("saved.file")}
          </SavedBtn>
          <SavedBtn onClick={() => fileRef.current?.click()} disabled={!hasFreeSlot} title={t("saved.import")}>
            <Upload size={13} />
            {t("saved.import")}
          </SavedBtn>
        </SavedActions>
      </SavedForm>

      {msg ? (
        <SavedHint style={{ color: "var(--accent)" }}>{msg}</SavedHint>
      ) : !isTabular ? (
        <SavedHint>{t("saved.tabularOnly")}</SavedHint>
      ) : !canSave ? (
        <SavedHint>{t("saved.noModel")}</SavedHint>
      ) : null}

      {agents.length === 0 ? (
        <SavedEmpty>{t("saved.empty")}</SavedEmpty>
      ) : (
        <SavedList>
          {agents.map((sa) => (
            <SavedCard
              key={sa.id}
              $active={savedAgentId === sa.id}
              $demo={isDemo}
              $selectable={selectable}
              role="button"
              tabIndex={selectable ? 0 : -1}
              aria-disabled={!selectable}
              onClick={() => select(sa)}
              onKeyDown={(e) => {
                if (selectable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  select(sa);
                }
              }}
              title={selectable ? sa.name : t("saved.demoOnly")}
            >
              <div className="head">
                <span className="name">{sa.name}</span>
                <OriginBadge $persisted={sa.persisted}>
                  {sa.persisted ? t("saved.local") : t("saved.file")}
                </OriginBadge>
              </div>
              <span className="sub">
                {t(`agents.${sa.agent}.label`)}
                {sa.double ? ` · ${t("saved.double")}` : ""}
              </span>
              <div className="ops">
                <IconMini
                  onClick={(e) => {
                    e.stopPropagation();
                    exportFile(sa.id);
                  }}
                  aria-label={t("saved.export")}
                  title={t("saved.export")}
                >
                  <Download size={12} />
                </IconMini>
                <IconMini
                  $danger
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(sa);
                  }}
                  aria-label={t("saved.delete")}
                  title={t("saved.delete")}
                >
                  <Trash2 size={12} />
                </IconMini>
              </div>
            </SavedCard>
          ))}
        </SavedList>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={handleImport}
      />
    </DefautWidgetBox>
  );
};
