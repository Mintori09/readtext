import { useState, useEffect, useMemo, memo, useCallback } from "react";

interface SearchResult {
  id: string;
  text: string;
  type: "heading" | "paragraph" | "list" | "code";
  level?: number;
}

interface SearchPanelProps {
  content: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

// FIX: Use WeakMap to track assigned IDs without memory leak
const elementIdMap = new WeakMap<Element, string>();
let idCounter = 0;

const getElementId = (element: Element): string => {
  // Check if already assigned
  if (element.id) return element.id;
  
  // Check WeakMap cache
  let id = elementIdMap.get(element);
  if (id) return id;
  
  // Generate new ID
  id = `search-target-${idCounter++}`;
  element.id = id;
  elementIdMap.set(element, id);
  return id;
};

// Truncate text with context around match
const getContextSnippet = (text: string, query: string, maxLength: number = 80): string => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  
  if (matchIndex === -1) return text.slice(0, maxLength);
  
  const contextRadius = Math.floor((maxLength - query.length) / 2);
  let start = Math.max(0, matchIndex - contextRadius);
  let end = Math.min(text.length, matchIndex + query.length + contextRadius);
  
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  
  return snippet;
};

// Custom hook for debounced value
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export const SearchPanel = memo(({ content, scrollRef }: SearchPanelProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  
  // FIX: Debounce search query to reduce CPU usage
  const debouncedQuery = useDebouncedValue(query, 150);

  // FIX: Single combined querySelectorAll instead of 4 separate calls
  const searchableItems = useMemo(() => {
    const items: SearchResult[] = [];
    
    const proseWrapper = document.querySelector(".prose-wrapper");
    if (!proseWrapper) return items;

    // Single query for all searchable elements
    const allElements = proseWrapper.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, li, pre > code"
    );

    allElements.forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      const text = (el as HTMLElement).innerText?.trim();
      
      if (!text) return;

      // Determine element type
      if (tagName.startsWith("h")) {
        items.push({
          id: getElementId(el),
          text,
          type: "heading",
          level: parseInt(tagName.replace("h", ""), 10),
        });
      } else if (tagName === "p" && text.length > 10) {
        items.push({
          id: getElementId(el),
          text,
          type: "paragraph",
        });
      } else if (tagName === "li") {
        items.push({
          id: getElementId(el),
          text,
          type: "list",
        });
      } else if (tagName === "code") {
        const pre = el.parentElement;
        if (pre) {
          items.push({
            id: getElementId(pre),
            text,
            type: "code",
          });
        }
      }
    });

    return items;
  }, [content]);

  // Filter results based on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const lowerQuery = debouncedQuery.toLowerCase();
    const filtered = searchableItems
      .filter((item) => item.text.toLowerCase().includes(lowerQuery))
      .slice(0, 50);
    
    setResults(filtered);
  }, [debouncedQuery, searchableItems]);

  const handleResultClick = useCallback((result: SearchResult) => {
    const element = document.getElementById(result.id);
    const container = scrollRef.current;

    if (element && container) {
      const scrollPosition = element.offsetTop - 60;
      container.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
      
      element.classList.add("search-highlight-element");
      setTimeout(() => {
        element.classList.remove("search-highlight-element");
      }, 2000);
    }
  }, [scrollRef]);

  const highlightMatch = useCallback((text: string, q: string) => {
    if (!q.trim()) return text;
    
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  }, []);

  const getTypeIcon = useCallback((result: SearchResult) => {
    switch (result.type) {
      case "heading": return `H${result.level}`;
      case "paragraph": return "¶";
      case "list": return "•";
      case "code": return "<>";
      default: return "?";
    }
  }, []);

  return (
    <div className="search-panel">
      <div className="panel-header">
        <h3 className="panel-title">SEARCH</h3>
        {results.length > 0 && (
          <span className="panel-count">{results.length}</span>
        )}
      </div>

      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search in document..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery("")}>
            ×
          </button>
        )}
      </div>

      <div className="search-results">
        {debouncedQuery.length >= 2 && results.length === 0 ? (
          <div className="search-empty">No results found</div>
        ) : (
          results.map((result, index) => (
            <button
              key={`${result.id}-${index}`}
              className={`search-result-item type-${result.type}`}
              onClick={() => handleResultClick(result)}
            >
              <span className="search-result-icon">{getTypeIcon(result)}</span>
              <span className="search-result-text">
                {highlightMatch(getContextSnippet(result.text, debouncedQuery), debouncedQuery)}
              </span>
            </button>
          ))
        )}
      </div>

      {!query && (
        <div className="search-hint">
          <p>Type to search in headings, paragraphs, lists, and code</p>
        </div>
      )}

      {query.length === 1 && (
        <div className="search-hint">
          <p>Type at least 2 characters to search</p>
        </div>
      )}
    </div>
  );
});
