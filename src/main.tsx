import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./styles/design-tokens.css";
import App from "./App";
import { applyTextSize, getStoredTextSize } from "./lib/textSize";

applyTextSize(getStoredTextSize());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
