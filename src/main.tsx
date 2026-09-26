import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Global resilience handlers to safely log and gracefully prevent cross-origin Script error
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("Unhandled promise rejection captured safely:", event.reason);
    // Prevent unhandled promise rejection bubbling up as generic Script error
    event.preventDefault();
  });

  window.addEventListener("error", (event) => {
    if (event.message === "Script error." && event.lineno === 0) {
      console.warn("Cross-origin or iframe script error handled gracefully.");
      return;
    }
    console.warn("Application runtime error captured safely:", event.message);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

