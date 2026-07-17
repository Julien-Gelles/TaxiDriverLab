import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarSearchValue = { q: string; setQ: (v: string) => void };

export type WidgetCountProviderProps = {
  counts: Record<string, number>;
  children: ReactNode;
};

export type SidebarHeaderContentProps = { rowHeight: number };

export type SidebarItem = { tKey: string; id?: string; note?: boolean };

export type SidebarMenuDef = {
  tKey: string;
  Icon: LucideIcon;
  items: SidebarItem[];
};

export type SidebarMenuProps = {
  def: SidebarMenuDef;
  badge?: boolean;
  query?: string;
  open?: boolean;
  onToggle?: () => void;
};
