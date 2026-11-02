import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./style.css";
import "./rooms.css";
import "./organizer.css";
import "./admin-mode.css";
import "./inbox.css";
import "./flow.css";
import "./pixel-ui.css";
import "./landing.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
