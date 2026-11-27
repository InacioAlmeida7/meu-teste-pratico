import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App";
import { tryReloadOnceForStaleChunk } from "./utils/chunkRecovery";

window.addEventListener("vite:preloadError", (event) => {
  if (tryReloadOnceForStaleChunk()) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
