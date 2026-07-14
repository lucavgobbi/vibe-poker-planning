import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinGate from "./JoinGate";
import { renderWithAppShell } from "../test/utils";

beforeEach(() => {
  window.localStorage.clear();
});

it("renders a Join as spectator checkbox", () => {
  renderWithAppShell(<JoinGate />);
  expect(
    screen.getByRole("checkbox", { name: /join as spectator/i }),
  ).toBeInTheDocument();
});

it("shows Watch room when spectator checkbox is checked", async () => {
  const user = userEvent.setup();
  renderWithAppShell(<JoinGate />);

  const checkbox = screen.getByRole("checkbox", { name: /join as spectator/i });
  await user.click(checkbox);

  // Button text should now be "Watch room"
  // In the initial state (empty name), button is disabled but should still show "Watch room"
  const watchButton = screen.queryByRole("button", { name: /watch room/i });
  expect(watchButton).toBeInTheDocument();
});

it("shows Join room when spectator checkbox is unchecked", () => {
  renderWithAppShell(<JoinGate />);
  expect(
    screen.getByRole("button", { name: /join room/i }),
  ).toBeInTheDocument();
});

it("stores spectator flag in localStorage when joining as spectator", async () => {
  const user = userEvent.setup();
  renderWithAppShell(<JoinGate />);

  const input = screen.getByPlaceholderText("Ada Lovelace");
  await user.type(input, "TestUser");

  const checkbox = screen.getByRole("checkbox", { name: /join as spectator/i });
  await user.click(checkbox);

  const watchButton = screen.getByRole("button", { name: /watch room/i });
  await user.click(watchButton);

  expect(window.localStorage.getItem("planning-poker-spectator")).toBe("true");
});

it("clears spectator flag when joining as voter", async () => {
  window.localStorage.setItem("planning-poker-spectator", "true");

  const user = userEvent.setup();
  renderWithAppShell(<JoinGate />);

  const input = screen.getByPlaceholderText("Ada Lovelace");
  await user.type(input, "TestUser");

  const joinButton = screen.getByRole("button", { name: /join room/i });
  await user.click(joinButton);

  expect(window.localStorage.getItem("planning-poker-spectator")).toBeNull();
});
