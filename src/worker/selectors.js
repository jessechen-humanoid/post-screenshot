const SELECTORS = {
  facebook: [
    "div[role='article']",
    "article",
    "[data-pagelet*='FeedUnit']"
  ],
  instagram: [
    'article',
    "main article"
  ],
  threads: [
    "div[data-pressable-container='true']",
    'article',
    "div[role='main'] article",
    "main article"
  ]
};

export function selectorsForPlatform(platform) {
  const selectors = SELECTORS[platform];

  if (!selectors) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return selectors;
}
