import styled from "styled-components";
import { theme } from "./theme";

const ACCENT_GRADIENT = `linear-gradient(90deg, var(--accent), var(--accent-glow))`;
const ACCENT_GLOW = "0 7px 20px var(--accent-soft)";

// ── Header (brand + search) ────────────────────────────────────────────────

export const BrandZone = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  min-width: 0;
`;

export const SearchZone = styled.div`
  flex: 1;
  display: flex;
  align-items: flex-start;
  min-width: 0;
  margin-top: -10px;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  .meta { min-width: 0; }
  .name {
    font-weight: 800;
    font-size: 15px;
    color: ${theme.ink};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .desc {
    font-size: 11px;
    color: ${theme.grey};
    line-height: 1.3;
  }
`;

export const Logo = styled.img`
  width: 80px;
  height: 80px;
  flex: none;
  object-fit: contain;
`;

export const SearchBox = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: ${theme.border};
  background: ${theme.creamDark};
  color: ${theme.grey};

  .lead { flex: none; }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    color: ${theme.ink};
    font-family: inherit;
    font-size: 13px;
    &::placeholder { color: ${theme.grey}; }
  }

  .clear {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.grey};
    cursor: pointer;
    transition: color 0.12s ease, background 0.12s ease;
    &:hover { color: ${theme.ink}; background: ${theme.cream}; }
  }
`;

// ── Body (nav + menus) ──────────────────────────────────────────────────────

export const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  box-sizing: border-box;
  padding: 18px 10px 12px;
`;

export const MenuGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

export const SettingsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: auto;
  padding-top: 28px;
`;

export const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${theme.grey};
  padding: 8px 8px 6px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 4px;
`;

export const ExpandAllBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: ${theme.grey};
  cursor: pointer;
  transition: color 0.12s ease, background 0.12s ease;
  &:hover { color: ${theme.ink}; background: ${theme.creamDark}; }
`;

export const Badge = styled.span`
  flex: none;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
`;

export const MenuButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 11px;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$open ? "var(--accent)" : "transparent")};
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  background: transparent;
  color: ${theme.ink};
  font-weight: 600;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;

  .label {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${theme.inkSoft};
  }
  .lead, .chev { flex: none; color: ${theme.grey}; }
  ${Badge} { background: var(--accent-soft); color: var(--accent); }

  &:hover {
    background: ${ACCENT_GRADIENT};
    border-color: transparent;
    font-weight: 700;
    box-shadow: ${ACCENT_GLOW};
    color: ${theme.onAccent};
    .label, .lead, .chev { color: ${theme.onAccent}; }
    ${Badge} { background: rgba(0, 0, 0, 0.18); color: ${theme.onAccent}; }
  }
`;

export const SubList = styled.ul`
  list-style: none;
  margin: 2px 0 10px;
  padding: 0 6px 0 38px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  li { list-style: none; }

  .text {
    display: block;
    font-size: 12px;
    color: ${theme.grey};
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    &:hover { background: ${theme.creamDark}; color: ${theme.ink}; }
  }
`;

// Muted placeholder note for empty submenus (settings / help): no hover, no
// interaction — just a short "nothing here yet" line.
export const EmptyNote = styled.div`
  font-size: 11px;
  font-style: italic;
  line-height: 1.4;
  color: ${theme.grey};
  padding: 4px 10px 6px;
`;

// Draggable item without a thumbnail (e.g. the save/layout panels): a labelled
// chip carrying the same drag behaviour + used/max badge as the thumbnails.
export const DragChip = styled.div<{ $atMax: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: ${theme.grey};
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: ${theme.creamDark};
  cursor: ${({ $atMax }) => ($atMax ? "not-allowed" : "grab")};
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;

  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .count {
    flex: none;
    font-size: 10.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${theme.onAccent};
    background: var(--accent);
    border-radius: 999px;
    padding: 2px 7px;
  }
  .count.full {
    color: ${theme.white};
    background: ${theme.danger};
  }

  &:hover {
    color: ${theme.ink};
    border-color: ${({ $atMax }) => ($atMax ? theme.danger : "var(--accent)")};
  }
`;

export const Thumb = styled.div<{ $atMax: boolean }>`
  position: relative;
  display: block;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: ${theme.creamDark};
  cursor: ${({ $atMax }) => ($atMax ? "not-allowed" : "grab")};
  transition: border-color 0.12s ease;

  img {
    width: 100%;
    height: auto;
    border-radius: 6px;
    background: ${theme.ink};
    display: block;
    opacity: ${({ $atMax }) => ($atMax ? 0.4 : 1)};
    transition: opacity 0.12s ease;
  }

  &:hover { border-color: ${({ $atMax }) => ($atMax ? theme.danger : "var(--accent)")}; }
`;

export const ThumbOverlay = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px 6px 0 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
  background: linear-gradient(180deg, rgba(16, 15, 11, 0.92), rgba(16, 15, 11, 0));

  ${Thumb}:hover & { opacity: 1; }

  .name {
    font-size: 11px;
    font-weight: 700;
    color: ${theme.ink};
    line-height: 1.2;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }
  .count {
    flex: none;
    font-size: 10.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${theme.onAccent};
    background: var(--accent);
    border-radius: 999px;
    padding: 2px 7px;
  }
  .count.full { color: ${theme.white}; background: ${theme.danger}; }
`;
