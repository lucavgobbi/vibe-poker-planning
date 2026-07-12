import { type ReactNode } from "react";
import { render } from "@testing-library/react";
import { AppShellProvider } from "../context/AppShellContext";

export function renderWithAppShell(ui: ReactNode) {
  return render(<AppShellProvider>{ui}</AppShellProvider>);
}
