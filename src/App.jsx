import React from 'react';
import { useState, useEffect } from "react";
import { AppProvider } from "./context/AppContext";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [route, setRoute] = useState("/");

  useEffect(() => {
    const handlePop = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const navigate = (path) => {
    try {
      window.history.pushState({}, "", path);
    } catch (e) {}
    setRoute(path);
  };

  return (
      <AppProvider navigate={navigate}>
        {route === "/" ? (
          <LandingPage navigate={navigate} />
        ) : (
          <Dashboard navigate={navigate} route={route} />
        )}
      </AppProvider>  
  );
}