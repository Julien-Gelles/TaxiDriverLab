import styled, { createGlobalStyle, keyframes } from "styled-components";
import { theme } from "./theme";

const drift1 = keyframes`
  0%   { transform: translate(0, 0) scale(1); }
  50%  { transform: translate(8vw, 6vh) scale(1.2); }
  100% { transform: translate(0, 0) scale(1); }
`;
const drift2 = keyframes`
  0%   { transform: translate(0, 0) scale(1.1); }
  50%  { transform: translate(-7vw, 5vh) scale(0.9); }
  100% { transform: translate(0, 0) scale(1.1); }
`;
const drift3 = keyframes`
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(5vw, -6vh) scale(1.15); }
  66%  { transform: translate(-6vw, -3vh) scale(0.95); }
  100% { transform: translate(0, 0) scale(1); }
`;
const drift4 = keyframes`
  0%   { transform: translate(0, 0) scale(1); }
  50%  { transform: translate(6vw, -7vh) scale(1.1); }
  100% { transform: translate(0, 0) scale(1); }
`;

export const DRIFTS = [drift1, drift2, drift3, drift4];

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  /* Base gradient — gold in training, green in demo. */
  background: linear-gradient(
    135deg,
    ${theme.yellowDark} 0%,
    ${theme.yellow} 42%,
    ${theme.yellowGlow} 68%,
    ${theme.yellowDark} 100%
  );
  :root[data-demo="true"] & {
    background: linear-gradient(
      135deg,
      #16a34a 0%,
      #22c55e 42%,
      #4ade80 68%,
      #16a34a 100%
    );
  }
`;

export const Blob = styled.div<{
  $size: string;
  $color: string;
  $top: string;
  $left: string;
  $anim: ReturnType<typeof keyframes>;
  $dur: string;
  $delay: string;
  $opacity?: number;
  $blend?: string;
}>`
  position: absolute;
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    ${({ $color }) => $color} 0%,
    transparent 70%
  );
  filter: blur(44px);
  opacity: ${({ $opacity }) => $opacity ?? 0.85};
  /* Yellows use "screen" for a richer molten-gold look where they overlap; the
     green/blue accents use "normal" so their hue actually reads over the gold
     instead of being washed out to pale by the screen blend. */
  mix-blend-mode: ${({ $blend }) => $blend ?? "screen"};
  will-change: transform;
  animation: ${({ $anim }) => $anim} ${({ $dur }) => $dur} ease-in-out
    ${({ $delay }) => $delay} infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const GlobalStyle = createGlobalStyle`
  :root {
    font-family: "Plus Jakarta Sans", system-ui, Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 500;
    color: ${theme.ink};

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    /* Accent palette as CSS variables so every small accent touch can follow the
       global mode: golden in training, green in demo. The data-demo attribute is
       toggled on <html> from the shared mode (see DemoModeSync in App). */
    --accent: ${theme.yellow};
    --accent-glow: ${theme.yellowGlow};
    --accent-dark: ${theme.yellowDark};
    --accent-soft: ${theme.accentSoft};
  }

  /* Demo mode: the golden accent becomes green everywhere it's used via var(). */
  :root[data-demo="true"] {
    --accent: #22c55e;
    --accent-glow: #4ade80;
    --accent-dark: #16a34a;
    --accent-soft: rgba(34, 197, 94, 0.14);
  }

  :root[data-demo="true"] body {
    background: radial-gradient(120% 95% at 50% -10%, #22c55e 0%, #16a34a 42%, #134e2a 100%);
  }

  html, body {
    height: 100%;
  }

  body {
    margin: 0;
    min-width: 320px;
    /* The app panel is a fixed-size layer; nothing scrolls at the page level. */
    overflow: hidden;
    /* Coloured backdrop visible in the margin around the app panel. */
    background:
      radial-gradient(120% 95% at 50% -10%, ${theme.yellow} 0%, ${theme.yellowDark} 42%, #7C6411 100%);
  }

  /* Base reset for buttons; the pill look lives in the component styles. */
  button {
    font-family: inherit;
    cursor: pointer;
  }

  /* Dark, slim scrollbars to match the dashboard. */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${theme.creamDark} transparent;
  }
  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  *::-webkit-scrollbar-thumb {
    background: ${theme.creamDark};
    border-radius: 6px;
    border: 2px solid ${theme.page};
  }
  *::-webkit-scrollbar-thumb:hover {
    background: ${theme.grey};
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }

  ::selection {
    background: ${theme.yellow};
    color: ${theme.onAccent};
  }

  /* react-tooltip v6 override — opaque background + accent border */
  .react-tooltip {
    background: ${theme.creamDark} !important;
    color: ${theme.ink} !important;
    border: 1px solid var(--accent) !important;
    border-radius: ${theme.radius} !important;
    opacity: 1 !important;
    box-shadow: ${theme.shadow} !important;
  }
  .react-tooltip-arrow {
    border-color: var(--accent) !important;
  }
`;
