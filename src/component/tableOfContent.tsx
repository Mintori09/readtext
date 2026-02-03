import { useEffect, useState, RefObject } from "react";

interface HeadingData {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  hideHeader?: boolean;
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
  hideHeader = false,
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
        aria-expanded={isMobileMenuOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="toc-icon"
        >
          {isMobileMenuOpen ? (
            <path
              d="M5 5L15 15M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <>
              <path d="M3 5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      <nav
        className={`toc-sidebar ${isMobileMenuOpen ? "show" : "hide"}`}
        aria-label="Table of Contents"
      >
        {!hideHeader && (
          <div className="toc-header">
            <h2 className="toc-title">Contents</h2>
            <div className="toc-count">{headings.length} sections</div>
          </div>
        )}
        
        <div className="toc-scroll-area">
          <ul role="list">
            {headings.map((heading, index) => {
              const isActive = activeHeadingId === heading.id;

              return (
                <li
                  key={`${heading.id}-${index}`}
                  className={`toc-item level-${heading.level} ${isActive ? "active" : ""}`}
                >
                  <button
                    className="toc-link"
                    onClick={() => handleHeadingClick(heading.id)}
                    aria-current={isActive ? "location" : undefined}
                  >
                    <span className="toc-indicator" />
                    <span className="toc-text">{heading.text}</span>
                  </button>
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
          aria-hidden="true"
        />
      )}
    </>
  );
};
