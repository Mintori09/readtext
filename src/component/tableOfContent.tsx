import { useEffect, useState, RefObject } from "react";

interface TableOfContentsProps {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export const TableOfContents = ({
  content,
  scrollRef,
}: TableOfContentsProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [headings, setHeadings] = useState<
    { level: number; text: string; id: string }[]
  >([]);

  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const headingElements = document.querySelectorAll(
        ".prose-wrapper h1, .prose-wrapper h2, .prose-wrapper h3",
      );
      const extracted = Array.from(headingElements).map((el) => ({
        level: parseInt(el.tagName.replace("H", "")),
        text: (el as HTMLElement).innerText,
        id: el.id,
      }));
      setHeadings(extracted);
    }, 300);
    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        root: scrollRef.current,
        rootMargin: "0px 0px -80% 0px",
        threshold: 0.1,
      },
    );

    const headingElements = document.querySelectorAll(
      ".prose-wrapper h1, .prose-wrapper h2, .prose-wrapper h3",
    );
    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings, scrollRef]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element && scrollRef.current) {
      const offset = 40;
      const elementPosition = element.offsetTop;

      scrollRef.current.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      });
      setIsVisible(false);
    }
  };

  if (headings.length === 0) return null;

  return (
    <>
      <button
        className={`toc-toggle ${isVisible ? "active" : ""}`}
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? "✕" : "☰"}
      </button>

      <nav className={`toc-sidebar ${isVisible ? "show" : "hide"}`}>
        <div className="toc-title">Table of content</div>
        <div className="toc-scroll-area">
          <ul>
            {headings.map((h, i) => (
              <li
                key={`${h.id}-${i}`}
                className={`toc-item level-${h.level} ${activeId === h.id ? "active" : ""}`}
              >
                <div
                  className="toc-link"
                  onClick={() => scrollToHeading(h.id)}
                  style={{
                    fontWeight: activeId === h.id ? "bold" : "normal",
                    color:
                      activeId === h.id
                        ? "var(--accent-color, #007aff)"
                        : "inherit",
                    borderLeft:
                      activeId === h.id
                        ? "2px #007aff"
                        : "2px solid transparent",
                    paddingLeft: "8px",
                    transition: "all 0.2s ease",
                  }}
                >
                  {h.text}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      {isVisible && (
        <div className="toc-overlay" onClick={() => setIsVisible(false)} />
      )}
    </>
  );
};
