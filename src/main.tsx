import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initPostHog } from "./lib/posthog";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found");
}

initPostHog();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
