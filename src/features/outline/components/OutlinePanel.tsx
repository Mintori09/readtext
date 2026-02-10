import { useEffect, useState, useRef, memo } from "react";
import { HeadingData } from "../../../types";
import "../../../styles/panels.css";

interface OutlinePanelProps {
  headings: HeadingData[];
  activeHeadingId: string;
  onHeadingClick: (id: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const OutlinePanel = memo(({ 
  headings, 
  activeHeadingId, 
  onHeadingClick,
  scrollRef,
}: OutlinePanelProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [readProgress, setReadProgress] = useState(0);

  // Calculate reading progress
  useEffect(() => {
    const container = scrollRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = Math.min(100, (scrollTop / (scrollHeight - clientHeight)) * 100);
      setReadProgress(Math.round(progress));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  // Scroll active item into view
  useEffect(() => {
    if (!activeHeadingId || !scrollContainerRef.current) return;
    
    const activeItem = scrollContainerRef.current.querySelector(
      `[data-heading-id="${activeHeadingId}"]`
    );
    
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    // Update focused index to match active
    const index = visibleHeadings.findIndex(h => h.id === activeHeadingId);
    if (index !== -1) setFocusedIndex(index);
  }, [activeHeadingId]);

  // Filter visible headings based on collapsed levels
  const visibleHeadings = headings.filter(h => !collapsedLevels.has(h.level));

  // Toggle collapse for a level
  const toggleLevel = (level: number) => {
    setCollapsedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (visibleHeadings.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, visibleHeadings.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < visibleHeadings.length) {
          onHeadingClick(visibleHeadings[focusedIndex].id);
        }
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(visibleHeadings.length - 1);
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !scrollContainerRef.current) return;
    const focusedItem = scrollContainerRef.current.querySelector(
      `[data-index="${focusedIndex}"]`
    );
    focusedItem?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  // Get unique levels for filter buttons
  const levels = [...new Set(headings.map(h => h.level))].sort();

  return (
    <div className="outline-panel" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="panel-header">
        <h3 className="panel-title">OUTLINE</h3>
        <div className="outline-header-right">
          {readProgress > 0 && (
            <span className="outline-progress-text">{readProgress}%</span>
          )}
          {headings.length > 0 && (
            <span className="panel-count">{visibleHeadings.length}/{headings.length}</span>
          )}
        </div>
      </div>

      {/* Level filter buttons */}
      {levels.length > 1 && (
        <div className="outline-filters">
          {levels.map(level => (
            <button
              key={level}
              className={`outline-filter-btn ${collapsedLevels.has(level) ? "collapsed" : ""}`}
              onClick={() => toggleLevel(level)}
              title={collapsedLevels.has(level) ? `Show H${level}` : `Hide H${level}`}
            >
              H{level}
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="outline-progress-bar">
        <div 
          className="outline-progress-fill" 
          style={{ width: `${readProgress}%` }} 
        />
      </div>

      {headings.length === 0 ? (
        <div className="panel-empty">No headings found</div>
      ) : visibleHeadings.length === 0 ? (
        <div className="panel-empty">All headings hidden</div>
      ) : (
        <div className="panel-scroll-area" ref={scrollContainerRef} style={{ overflowY: "auto" }}>
          <ul role="list">
            {visibleHeadings.map((heading, index) => {
              const isActive = activeHeadingId === heading.id;
              const isFocused = focusedIndex === index;

              return (
                <li
                  key={`${heading.id}-${index}`}
                  data-heading-id={heading.id}
                  data-index={index}
                  className={`outline-item level-${heading.level} ${isActive ? "active" : ""} ${isFocused ? "focused" : ""}`}
                >
                  <button
                    className="outline-link"
                    onClick={() => onHeadingClick(heading.id)}
                    aria-current={isActive ? "location" : undefined}
                  >
                    <span className="outline-indicator" />
                    <span className="outline-text">{heading.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
});
