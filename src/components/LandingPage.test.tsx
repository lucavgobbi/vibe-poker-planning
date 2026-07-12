import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LandingPage from "./LandingPage";

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "location", {
    value: { assign: vi.fn() },
    writable: true,
  });
});

it("renders hero with title", () => {
  render(<LandingPage />);
  expect(
    screen.getByText("Fast room links, instant votes, no account ceremony."),
  ).toBeInTheDocument();
});

it("renders all deck options", () => {
  render(<LandingPage />);
  expect(screen.getByText("Fibonacci")).toBeInTheDocument();
  expect(screen.getByText("Base 2")).toBeInTheDocument();
  expect(screen.getByText("Regular (1-12)")).toBeInTheDocument();
});

it("shows Fibonacci deck selected by default", () => {
  render(<LandingPage />);
  expect(screen.getByText("Fibonacci")).toHaveClass("active");
});

it("switches active deck on click", async () => {
  const user = userEvent.setup();
  render(<LandingPage />);

  await user.click(screen.getByText("Base 2"));
  expect(screen.getByText("Base 2")).toHaveClass("active");
  expect(screen.getByText("Fibonacci")).not.toHaveClass("active");
});

it("renders feature cards", () => {
  render(<LandingPage />);
  expect(screen.getByText("Room URLs")).toBeInTheDocument();
  expect(screen.getByText("Reveal together")).toBeInTheDocument();
  expect(screen.getByText("Dark mode ready")).toBeInTheDocument();
});
