import { useEffect, useState, RefObject } from "react";

interface HeadingData {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
}

const HEADING_SELECTOR =
  ".prose-wrapper h1, .prose-wrapper h2, .prose-wrapper h3";
const DEBOUNCE_DELAY_MS = 300;
const SCROLL_OFFSET_PX = 40;
const INTERSECTION_THRESHOLD = 0.1;
const ROOT_MARGIN = "0px 0px -80% 0px";

export const TableOfContents = ({
  content,
  scrollRef,
}: TableOfContentsProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");

  useEffect(() => {
    const parseHeadings = () => {
      const headingElements = document.querySelectorAll(HEADING_SELECTOR);
      const extractedHeadings = Array.from(headingElements).map((element) => ({
        level: parseInt(element.tagName.replace("H", ""), 10),
        text: (element as HTMLElement).innerText,
        id: element.id,
      }));
      setHeadings(extractedHeadings);
    };

    const debounceTimer = setTimeout(parseHeadings, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveHeadingId(entry.target.id);
        }
      });
    };

    const observerOptions = {
      root: scrollRef.current,
      rootMargin: ROOT_MARGIN,
      threshold: INTERSECTION_THRESHOLD,
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );
    const headingElements = document.querySelectorAll(HEADING_SELECTOR);

    headingElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [headings, scrollRef]);

  const handleHeadingClick = (id: string) => {
    const targetElement = document.getElementById(id);
    const container = scrollRef.current;

    if (targetElement && container) {
      const scrollPosition = targetElement.offsetTop - SCROLL_OFFSET_PX;

      container.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });

      setIsMobileMenuOpen(false);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      <button
        className={`toc-toggle ${isMobileMenuOpen ? "active" : ""}`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Table of Contents"
      >
        {isMobileMenuOpen ? "✕" : "☰"}
      </button>

      <nav className={`toc-sidebar ${isMobileMenuOpen ? "show" : "hide"}`}>
        <div className="toc-title">Table of content</div>
        <div className="toc-scroll-area">
          <ul>
            {headings.map((heading, index) => {
              const isActive = activeHeadingId === heading.id;

              return (
                <li
                  key={`${heading.id}-${index}`}
                  className={`toc-item level-${heading.level} ${isActive ? "active" : ""}`}
                >
                  <div
                    className="toc-link"
                    onClick={() => handleHeadingClick(heading.id)}
                    style={{
                      fontWeight: isActive ? "bold" : "normal",
                      color: isActive
                        ? "var(--accent-color, #007aff)"
                        : "inherit",
                      borderLeft: isActive
                        ? "2px solid #007aff"
                        : "2px solid transparent",
                      paddingLeft: "8px",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {heading.text}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="toc-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};
