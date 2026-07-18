import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

it("renders GitHub link", () => {
  render(<Footer />);
  const link = screen.getByRole("link", { name: "Luca Gobbi on GitHub" });
  expect(link).toHaveAttribute(
    "href",
    "https://github.com/lucavgobbi/vibe-poker-planning",
  );
  expect(link).toHaveAttribute("target", "_blank");
});

it("renders Stripe Projects link", () => {
  render(<Footer />);
  const link = screen.getByRole("link", { name: "Stripe Projects" });
  expect(link).toHaveAttribute("href", "https://projects.dev");
});

it("renders Codex link", () => {
  render(<Footer />);
  const link = screen.getByRole("link", { name: "Codex" });
  expect(link).toHaveAttribute("href", "https://openai.com/codex");
});
