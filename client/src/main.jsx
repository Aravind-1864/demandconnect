import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { CollectionsProvider } from "./context/CollectionsContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <CollectionsProvider>
            <App />
          </CollectionsProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
