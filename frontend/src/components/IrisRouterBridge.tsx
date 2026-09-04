import { useEffect } from "react";

type RoutePath = "/" | "/money" | "/cash-flow" | "/spending" | "/insights" | "/features" | "/settings";

const PATH_TO_LABEL: Record<RoutePath, string> = {
  "/": "Life State",
  "/money": "Money",
  "/cash-flow": "Cash Flow",
  "/spending": "Spending",
  "/insights": "Insights",
  "/features": "Iris Features",
  "/settings": "Settings",
};

const LABEL_TO_PATH = Object.fromEntries(Object.entries(PATH_TO_LABEL).map(([path, label]) => [label, path])) as Record<string, RoutePath>;

function normalizePath(pathname: string): RoutePath {
  if (pathname === "/cashflow") return "/cash-flow";
  return (pathname in PATH_TO_LABEL ? pathname : "/") as RoutePath;
}

function findNav(label: string): HTMLButtonElement | null {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".iris-shell-nav-item")).find(
    (button) => button.querySelector("span")?.textContent?.trim() === label,
  ) ?? null;
}

export function IrisRouterBridge() {
  useEffect(() => {
    let syncing = false;

    const activatePath = (pathname: string) => {
      const path = normalizePath(pathname);
      const label = PATH_TO_LABEL[path];
      const button = findNav(label);
      if (!button) return;
      syncing = true;
      button.click();
      queueMicrotask(() => { syncing = false; });
    };

    const onNavClick = (event: Event) => {
      if (syncing) return;
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>(".iris-shell-nav-item");
      if (!button) return;
      const label = button.querySelector("span")?.textContent?.trim();
      const path = label ? LABEL_TO_PATH[label] : undefined;
      if (!path || window.location.pathname === path) return;
      window.history.pushState({ irisPath: path }, "", path);
    };

    const onPopState = () => activatePath(window.location.pathname);
    document.addEventListener("click", onNavClick, true);
    window.addEventListener("popstate", onPopState);

    const timer = window.setTimeout(() => activatePath(window.location.pathname), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", onNavClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
