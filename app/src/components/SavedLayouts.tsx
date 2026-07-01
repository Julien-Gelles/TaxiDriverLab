import { useMemo, useRef, useState } from "react";
import { Download, FolderOpen, Save, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGridLayout, useSavedLayouts } from "../hooks";
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
import type { SavedLayout } from "../types";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

// Next free "My-Layout-N" name not already taken.
const nextDefaultName = (taken: SavedLayout[]): string => {
  const prefix = "My-Layout-";
  const used = new Set(
    taken
      .map((l) => l.name)
      .filter((n) => n.startsWith(prefix))
      .map((n) => Number(n.slice(prefix.length)))
      .filter((n) => Number.isInteger(n) && n > 0)
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `${prefix}${n}`;
};

export const SavedLayouts = () => {
  const { t } = useTranslation();
  const { getCurrentLayout, applyLayout } = useGridLayout();
  const {
    layouts,
    maxSlots,
    hasFreeSlot,
    saveLocal,
    saveFile,
    exportFile,
    importFile,
    remove,
  } = useSavedLayouts();

  const defaultName = useMemo(() => nextDefaultName(layouts), [layouts]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveName = name.trim() || defaultName;

  const handleSaveLocal = () => {
    const items = getCurrentLayout();
    if (items.length === 0) return;
    const ok = saveLocal({ name: effectiveName, items });
    if (ok) {
      setName("");
      setMsg(null);
    } else {
      setMsg(t("layouts.slotsFull"));
    }
  };

  const handleSaveFile = () => {
    const items = getCurrentLayout();
    if (items.length === 0) return;
    saveFile({ name: effectiveName, items });
    setName("");
    setMsg(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ok = await importFile(file);
    setMsg(ok ? null : t("layouts.importFailed"));
  };

  const handleDelete = (l: SavedLayout) => remove(l.id);

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          <VersionTag />
          {t("layouts.title")}
          <WidgetHelp content={t("layouts.help")} />
        </span>
        <MutedText>{t("layouts.slots", { used: layouts.length, max: maxSlots })}</MutedText>
      </WidgetTitle>

      <SavedForm>
        <SavedInput
          value={name}
          placeholder={defaultName}
          onChange={(e) => setName(e.target.value)}
        />
        <SavedActions>
          <SavedBtn onClick={handleSaveLocal} disabled={!hasFreeSlot} title={t("layouts.saveLocal")}>
            <Save size={13} />
            {t("layouts.local")}
          </SavedBtn>
          <SavedBtn onClick={handleSaveFile} title={t("layouts.saveFile")}>
            <Download size={13} />
            {t("layouts.file")}
          </SavedBtn>
          <SavedBtn onClick={() => fileRef.current?.click()} disabled={!hasFreeSlot} title={t("layouts.import")}>
            <Upload size={13} />
            {t("layouts.import")}
          </SavedBtn>
        </SavedActions>
      </SavedForm>

      {msg && <SavedHint style={{ color: "var(--accent)" }}>{msg}</SavedHint>}

      {layouts.length === 0 ? (
        <SavedEmpty>{t("layouts.empty")}</SavedEmpty>
      ) : (
        <SavedList>
          {layouts.map((l) => (
            <SavedCard
              key={l.id}
              $active={false}
              $demo={false}
              $selectable
              role="button"
              tabIndex={0}
              onClick={() => {
                applyLayout(l.items);
                setMsg(t("layouts.loaded", { name: l.name }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  applyLayout(l.items);
                }
              }}
              title={t("layouts.load")}
            >
              <div className="head">
                <span className="name">{l.name}</span>
                <OriginBadge $persisted={l.persisted}>
                  {l.persisted ? t("layouts.local") : t("layouts.file")}
                </OriginBadge>
              </div>
              <span className="sub">
                <FolderOpen size={11} /> {t("layouts.count", { n: l.items.length })}
              </span>
              <div className="ops">
                <IconMini
                  onClick={(e) => {
                    e.stopPropagation();
                    exportFile(l.id);
                  }}
                  aria-label={t("layouts.export")}
                  title={t("layouts.export")}
                >
                  <Download size={12} />
                </IconMini>
                <IconMini
                  $danger
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(l);
                  }}
                  aria-label={t("layouts.delete")}
                  title={t("layouts.delete")}
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
