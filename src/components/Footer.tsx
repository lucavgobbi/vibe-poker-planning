export default function Footer() {
  return (
    <footer className="site-footer">
      <a
        className="footer-link"
        href="https://github.com/lucavgobbi"
        target="_blank"
        rel="noreferrer"
        aria-label="Luca Gobbi on GitHub"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.33 4.8-4.56 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
            fill="currentColor"
          />
        </svg>
        <span>github.com/lucavgobbi</span>
      </a>
      <p className="footer-copy">
        Proudly vibe coded in Toronto 🇨🇦 using{" "}
        <a href="https://projects.dev" target="_blank" rel="noreferrer">
          Stripe Projects
        </a>
        {" and "}
        <a href="https://openai.com/codex" target="_blank" rel="noreferrer">
          Codex
        </a>
      </p>
    </footer>
  );
}

