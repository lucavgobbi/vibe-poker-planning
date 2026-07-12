import { render, screen } from "@testing-library/react";
import Header from "./Header";
import { renderWithAppShell } from "../test/utils";

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "location", {
    value: {
      pathname: "/",
      origin: "http://localhost",
      assign: vi.fn(),
    },
    writable: true,
  });
});

it("renders logo icon on landing page", () => {
  renderWithAppShell(<Header />);
  expect(
    screen.getByRole("img", { name: "Poker Planning logo" }),
  ).toBeInTheDocument();
});

it("renders theme toggle button on landing page", () => {
  renderWithAppShell(<Header />);
  expect(screen.getByRole("button", { name: /dark mode/i })).toBeInTheDocument();
});

it("renders room bar when on a room page with a name set", () => {
  window.localStorage.setItem("planning-poker-display-name", "TestUser");
  Object.defineProperty(window, "location", {
    value: {
      pathname: "/my-room",
      origin: "http://localhost",
      assign: vi.fn(),
    },
    writable: true,
  });

  renderWithAppShell(<Header />);
  expect(screen.getByText("room:")).toBeInTheDocument();
  expect(screen.getByText("my-room")).toBeInTheDocument();
  expect(screen.getByTitle("Copy room URL")).toBeInTheDocument();
  expect(screen.getByTitle("Menu")).toBeInTheDocument();
});
