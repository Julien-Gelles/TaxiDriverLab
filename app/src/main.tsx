import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GlobalStyle } from "./styles/App.css.ts";
import { App } from "./App.tsx";
import "./i18n/index";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalStyle />
    <App />
  </StrictMode>,
);
