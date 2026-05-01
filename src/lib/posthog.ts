import posthog from "posthog-js";

export const POSTHOG_KEY =
  import.meta.env.POSTHOG_ANALYTICS_API_KEY || import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST =
  (import.meta.env.POSTHOG_ANALYTICS_HOST as string | undefined) ||
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined);
let missingKeyWarningShown = false;
let defaultHostWarningShown = false;

export function initPostHog(): boolean {
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV && !missingKeyWarningShown) {
      missingKeyWarningShown = true;
      console.warn(
        "PostHog disabled: set `POSTHOG_ANALYTICS_API_KEY` or `VITE_POSTHOG_KEY`.",
      );
    }

    return false;
  }

  if (posthog.__loaded) {
    return true;
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
  } else if (import.meta.env.DEV && !defaultHostWarningShown) {
    defaultHostWarningShown = true;
    console.warn(
      "PostHog using the default US host. Set `POSTHOG_ANALYTICS_HOST` or `VITE_POSTHOG_HOST` if your project uses a different region.",
    );
  }

  posthog.init(POSTHOG_KEY, options);
  return true;
}

export function identifyPostHog(
  distinctId: string,
  properties?: Record<string, string | number | boolean | undefined>,
) {
  if (!initPostHog()) {
    return;
  }

  posthog.identify(distinctId, properties);
}

export function capturePostHog(eventName: string, properties?: Record<string, unknown>) {
  if (!initPostHog()) {
    return;
  }

  posthog.capture(eventName, properties);
}

export { posthog };
