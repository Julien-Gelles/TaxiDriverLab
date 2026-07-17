import { createContext, useContext, useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Bot,
  Brain,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Gauge,
  HelpCircle,
  Info,
  LineChart,
  Map as MapIcon,
  Save,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useSimConfig } from "../hooks";
import type {
  ChildrenProps,
  SidebarHeaderContentProps,
  SidebarMenuDef,
  SidebarMenuProps,
  SidebarSearchValue,
  WidgetCountProviderProps,
} from "../types";
import {
  Badge,
  Brand,
  BrandZone,
  DragChip,
  EmptyNote,
  ExpandAllBtn,
  Logo,
  MenuButton,
  MenuGroup,
  Nav,
  SearchBox,
  SearchZone,
  SectionHeader,
  SectionLabel,
  SettingsGroup,
  SubList,
  Thumb,
  ThumbOverlay,
} from "../styles";
import taxiImg from "../assets/taxi.webp";
import taxiDemoImg from "../assets/taxi-demo.webp";
import { widgetDrag, widgetLimit } from "./widgetDrag";

const buildDragGhost = (type: string): HTMLElement | null => {
  const original = document.querySelector<HTMLElement>(
    `.grid-stack-item[gs-id="${type}"] .grid-stack-item-content`,
  );
  if (!original) return null;

  const rect = original.getBoundingClientRect();
  const holder = document.createElement("div");
  holder.style.cssText = [
    "position:fixed",
    "top:0",
    "left:-99999px",
    "pointer-events:none",
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    "overflow:hidden",
    "border-radius:12px",
    "box-shadow:0 18px 40px rgba(0,0,0,0.35)",
  ].join(";");

  const clone = original.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  holder.appendChild(clone);
  document.body.appendChild(holder);
  return holder;
};

const SearchContext = createContext<SidebarSearchValue>({
  q: "",
  setQ: () => {},
});

export const SidebarProvider = ({ children }: ChildrenProps) => {
  const [q, setQ] = useState("");
  return (
    <SearchContext.Provider value={{ q, setQ }}>
      {children}
    </SearchContext.Provider>
  );
};

const useSidebarSearch = () => useContext(SearchContext);

const WidgetCountContext = createContext<Record<string, number>>({});

export const WidgetCountProvider = ({
  counts,
  children,
}: WidgetCountProviderProps) => (
  <WidgetCountContext.Provider value={counts}>
    {children}
  </WidgetCountContext.Provider>
);

const useWidgetCounts = () => useContext(WidgetCountContext);

export const SidebarHeaderContent = ({
  rowHeight,
}: SidebarHeaderContentProps) => {
  const { t } = useTranslation();
  const { q, setQ } = useSidebarSearch();
  const { mode } = useSimConfig();
  const taxiImage = mode === "demo" ? taxiDemoImg : taxiImg;
  return (
    <>
      <BrandZone style={{ height: rowHeight }}>
        <Brand>
          <Logo src={taxiImage} alt="Taxi" />
          <div className="meta">
            <div className="name">{t("sidebar.brand")}</div>
            <div className="desc">{t("sidebar.brandDesc")}</div>
          </div>
        </Brand>
      </BrandZone>
      <SearchZone>
        <SearchBox>
          <Search size={15} className="lead" />
          <input
            placeholder={t("sidebar.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className="clear"
              aria-label={t("sidebar.clear")}
              onClick={() => setQ("")}
            >
              <X size={14} />
            </button>
          )}
        </SearchBox>
      </SearchZone>
    </>
  );
};

const THUMBS = import.meta.glob("../assets/components/*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const thumb = (id: string, demo: boolean): string | undefined => {
  if (demo) {
    const demoSrc = THUMBS[`../assets/components/${id}-demo.webp`];
    if (demoSrc) return demoSrc;
  }
  return THUMBS[`../assets/components/${id}.webp`];
};

const COMPONENT_MENUS: SidebarMenuDef[] = [
  { tKey: "map", Icon: MapIcon, items: [{ tKey: "terrain", id: "terrain" }] },
  {
    tKey: "controls",
    Icon: Gamepad2,
    items: [
      { tKey: "play", id: "play" },
      { tKey: "speed", id: "speed" },
    ],
  },
  {
    tKey: "agent",
    Icon: Bot,
    items: [
      { tKey: "agentChoice", id: "agent" },
      { tKey: "hyper", id: "hyper" },
      { tKey: "stats", id: "stats" },
    ],
  },
  {
    tKey: "model",
    Icon: Brain,
    items: [
      { tKey: "qtable", id: "qtable" },
      { tKey: "network", id: "network" },
    ],
  },
  {
    tKey: "graphs",
    Icon: LineChart,
    items: [
      { tKey: "reward", id: "reward" },
      { tKey: "steps", id: "steps" },
      { tKey: "epsilon", id: "epsilon" },
    ],
  },
  {
    tKey: "indicators",
    Icon: Gauge,
    items: [
      { tKey: "totalSteps", id: "m-steps-total" },
      { tKey: "avgReward", id: "m-reward" },
      { tKey: "epsilonMetric", id: "m-epsilon" },
      { tKey: "avgSteps", id: "m-steps" },
      { tKey: "maxReward", id: "m-reward-max" },
      { tKey: "minSteps", id: "m-steps-min" },
    ],
  },
  {
    tKey: "performance",
    Icon: Activity,
    items: [
      { tKey: "performance", id: "performance" },
      { tKey: "chrono", id: "chrono" },
    ],
  },
  {
    tKey: "save",
    Icon: Save,
    items: [
      { tKey: "savedAgents", id: "saved" },
      { tKey: "savedLayouts", id: "layouts" },
    ],
  },
  { tKey: "about", Icon: Info, items: [{ tKey: "about", id: "about" }] },
];

const SETTINGS_MENUS: SidebarMenuDef[] = [
  {
    tKey: "params",
    Icon: SlidersHorizontal,
    items: [{ tKey: "soon", note: true }],
  },
  {
    tKey: "help",
    Icon: HelpCircle,
    items: [{ tKey: "soon", note: true }],
  },
];

const Menu = ({
  def,
  badge,
  query,
  open: openProp,
  onToggle,
}: SidebarMenuProps) => {
  const { t } = useTranslation();
  const { mode } = useSimConfig();
  const isDemo = mode === "demo";
  const [openLocal, setOpenLocal] = useState(false);
  const controlled = onToggle !== undefined;
  const open = controlled ? Boolean(openProp) : openLocal;
  const toggle = () => (controlled ? onToggle!() : setOpenLocal((o) => !o));
  const ghostRef = useRef<HTMLElement | null>(null);
  const counts = useWidgetCounts();

  const q = (query ?? "").trim().toLowerCase();
  const filtering = q.length > 0;

  const groupLabel = t(`sidebar.menus.${def.tKey}`);

  const shown = filtering
    ? def.items.filter((i) =>
        t(`sidebar.items.${i.tKey}`).toLowerCase().includes(q),
      )
    : def.items;
  const isOpen = filtering ? shown.length > 0 : open;
  const { Icon } = def;

  const dnd = (id: string, atMax: boolean) => ({
    draggable: !atMax,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      if (atMax) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("application/x-taxi-widget", id);
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "copy";
      widgetDrag.type = id;
      const ghost = buildDragGhost(id);
      if (ghost) {
        ghostRef.current = ghost;
        e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 28);
      }
    },
    onDragEnd: () => {
      widgetDrag.type = null;
      ghostRef.current?.remove();
      ghostRef.current = null;
    },
  });

  return (
    <div>
      <MenuButton
        $open={isOpen}
        onClick={() => {
          if (!filtering) toggle();
        }}
      >
        <Icon size={18} className="lead" />
        <span className="label">{groupLabel}</span>
        {badge && <Badge>{shown.length}</Badge>}
        {isOpen ? (
          <ChevronUp size={16} className="chev" />
        ) : (
          <ChevronDown size={16} className="chev" />
        )}
      </MenuButton>
      {isOpen && (
        <SubList>
          {shown.map((it) => {
            const itemLabel = t(`sidebar.items.${it.tKey}`);
            const src = it.id ? thumb(it.id, isDemo) : undefined;
            const max = it.id ? widgetLimit(it.id) : 0;
            const used = it.id ? (counts[it.id] ?? 0) : 0;
            const atMax = it.id ? used >= max : false;
            const limitTitle = atMax
              ? t("sidebar.limitReached", { label: itemLabel, used, max })
              : t("sidebar.limitCount", { label: itemLabel, used, max });
            return (
              <li key={it.tKey}>
                {it.note ? (
                  <EmptyNote>{itemLabel}</EmptyNote>
                ) : !it.id ? (
                  <span className="text">{itemLabel}</span>
                ) : src ? (
                  <Thumb
                    $atMax={atMax}
                    title={limitTitle}
                    {...dnd(it.id, atMax)}
                  >
                    <img
                      src={src}
                      alt={itemLabel}
                      loading="lazy"
                      draggable={false}
                    />
                    <ThumbOverlay>
                      <span className="name">{itemLabel}</span>
                      <span className={`count${atMax ? " full" : ""}`}>
                        {used}/{max}
                      </span>
                    </ThumbOverlay>
                  </Thumb>
                ) : (
                  <DragChip
                    $atMax={atMax}
                    title={limitTitle}
                    {...dnd(it.id, atMax)}
                  >
                    <span className="name">{itemLabel}</span>
                    <span className={`count${atMax ? " full" : ""}`}>
                      {used}/{max}
                    </span>
                  </DragChip>
                )}
              </li>
            );
          })}
        </SubList>
      )}
    </div>
  );
};

export const SidebarNav = () => {
  const { t } = useTranslation();
  const { q } = useSidebarSearch();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const allOpen = COMPONENT_MENUS.every((d) => openMap[d.tKey]);
  const setAll = (v: boolean) =>
    setOpenMap(Object.fromEntries(COMPONENT_MENUS.map((d) => [d.tKey, v])));

  return (
    <Nav>
      <MenuGroup>
        <SectionHeader>
          <SectionLabel as="span">{t("sidebar.components")}</SectionLabel>
          <ExpandAllBtn
            type="button"
            onClick={() => setAll(!allOpen)}
            aria-label={
              allOpen ? t("sidebar.collapseAll") : t("sidebar.expandAll")
            }
            title={allOpen ? t("sidebar.collapseAll") : t("sidebar.expandAll")}
          >
            {allOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </ExpandAllBtn>
        </SectionHeader>
        {COMPONENT_MENUS.map((def) => (
          <Menu
            key={def.tKey}
            def={def}
            badge
            query={q}
            open={openMap[def.tKey] ?? false}
            onToggle={() =>
              setOpenMap((m) => ({ ...m, [def.tKey]: !(m[def.tKey] ?? false) }))
            }
          />
        ))}
      </MenuGroup>

      <SettingsGroup>
        <SectionLabel>{t("sidebar.settings")}</SectionLabel>
        {SETTINGS_MENUS.map((def) => (
          <Menu key={def.tKey} def={def} />
        ))}
      </SettingsGroup>
    </Nav>
  );
};
