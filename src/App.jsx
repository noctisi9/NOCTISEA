import { useState, useEffect } from "react";
import { AppProvider } from "./context/AppContext";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setRoute(path);
  };

  const isLanding = route === "/" || route === "/NOCTISEA/" || route === "/NOCTISEA";

  return (
    <AppProvider navigate={navigate}>
      {isLanding ? (
        <LandingPage navigate={navigate} />
      ) : (
        <Dashboard navigate={navigate} route={route} />
      )}
    </AppProvider>
  );
}
