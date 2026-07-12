import { render, screen } from "@testing-library/react";
import LogoIcon from "./LogoIcon";

it("renders with default size", () => {
  render(<LogoIcon />);
  const svg = screen.getByRole("img", { name: "Poker Planning logo" });
  expect(svg).toBeInTheDocument();
  expect(svg).toHaveAttribute("width", "40");
  expect(svg).toHaveAttribute("height", "40");
});

it("renders with custom size", () => {
  render(<LogoIcon size={64} />);
  const svg = screen.getByRole("img");
  expect(svg).toHaveAttribute("width", "64");
  expect(svg).toHaveAttribute("height", "64");
});
