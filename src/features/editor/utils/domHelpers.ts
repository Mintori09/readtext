import Prism from "prismjs";

export const applyHeadingIds = (container: HTMLElement): void => {
  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const usedIds = new Set<string>();

  headings.forEach((heading, index) => {
    if (heading.id) {
      usedIds.add(heading.id);
      return;
    }

    const baseSlug =
      heading.textContent
        ?.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || `heading-${index}`;

    let uniqueSlug = baseSlug;
    let counter = 1;

    while (usedIds.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    heading.id = uniqueSlug;
    usedIds.add(uniqueSlug);
  });
};

export const highlightCodeBlocks = (container: HTMLElement): void => {
  requestAnimationFrame(() => {
    const codeBlocks = container.querySelectorAll("pre code");
    codeBlocks.forEach((block) => {
      Prism.highlightElement(block as HTMLElement);
    });
  });
};
