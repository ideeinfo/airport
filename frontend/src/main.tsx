import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AIDemo } from "./components/generated/AIDemo";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AIDemo />
  </StrictMode>,
);
