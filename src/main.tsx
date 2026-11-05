import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
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
