import posthog from "posthog-js";

export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

export function initPostHog() {
  if (!POSTHOG_KEY || posthog.__loaded) {
    return;
  }

  const options: {
    autocapture: boolean;
    capture_pageview: boolean;
    api_host?: string;
  } = {
    autocapture: false,
    capture_pageview: true,
  };

  if (POSTHOG_HOST) {
    options.api_host = POSTHOG_HOST;
  }

  posthog.init(POSTHOG_KEY, options);
}

export { posthog };
