import { useEffect, useState, RefObject, memo, useCallback } from "react";
import { PanelType, HeadingData } from "../types";
import { ExplorerPanel } from "./panels/ExplorerPanel";
import { SearchPanel } from "./panels/SearchPanel";
import { OutlinePanel } from "./panels/OutlinePanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import "../styles/sidebar.css";
import "../styles/panels.css";

interface SidebarProps {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  activePanel: PanelType;
  currentPath: string | null;
  rootPath?: string | null;
  onFileOpen?: (path: string) => void;
}

const HEADING_SELECTOR = ".prose-wrapper h1, .prose-wrapper h2, .prose-wrapper h3";
const DEBOUNCE_DELAY_MS = 300;
const SCROLL_OFFSET_PX = 40;

export const Sidebar = memo(({ 
  content, 
  scrollRef, 
  activePanel, 
  currentPath,
  rootPath,
  onFileOpen 
}: SidebarProps) => {
  // TOC state
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  const [headingElements, setHeadingElements] = useState<Element[]>([]);
  
  // Parse headings once, store both data and elements
  useEffect(() => {
    const parseHeadings = () => {
      const elements = document.querySelectorAll(HEADING_SELECTOR);
      const elementsArray = Array.from(elements);
      
      setHeadingElements(elementsArray);
      
      const extractedHeadings = elementsArray.map((element) => ({
        level: parseInt(element.tagName.replace("H", ""), 10),
        text: (element as HTMLElement).innerText,
        id: element.id,
      }));
      setHeadings(extractedHeadings);
    };

    const debounceTimer = setTimeout(parseHeadings, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  // Track the topmost visible heading
  useEffect(() => {
    if (headingElements.length === 0 || !scrollRef.current) return;
    
    const intersectingHeadings = new Map<string, IntersectionObserverEntry>();
    
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersectingHeadings.set(entry.target.id, entry);
        } else {
          intersectingHeadings.delete(entry.target.id);
        }
      });

      if (intersectingHeadings.size > 0) {
        let topmostId: string | null = null;
        let topmostTop = Infinity;
        
        intersectingHeadings.forEach((entry, id) => {
          const rect = entry.boundingClientRect;
          if (rect.top < topmostTop) {
            topmostId = id;
            topmostTop = rect.top;
          }
        });

        if (topmostId) {
          setActiveHeadingId(topmostId);
        }
      }
    };

    const observerOptions = {
      root: scrollRef.current,
      rootMargin: "-10% 0px -70% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    headingElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [headingElements, scrollRef]);

  const handleHeadingClick = useCallback((id: string) => {
    const targetElement = document.getElementById(id);
    const container = scrollRef.current;

    if (targetElement && container) {
      const scrollPosition = targetElement.offsetTop - SCROLL_OFFSET_PX;

      container.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });

      targetElement.classList.add("heading-highlight");
      setTimeout(() => {
        targetElement.classList.remove("heading-highlight");
      }, 2000);
    }
  }, [scrollRef]);

  const handleFileOpen = useCallback((path: string) => {
    onFileOpen?.(path);
  }, [onFileOpen]);

  if (!activePanel) return null;

  return (
    <aside className="sidebar show">
      {activePanel === "explorer" && (
        <ExplorerPanel 
          currentPath={currentPath} 
          rootPath={rootPath}
          onFileOpen={handleFileOpen}
        />
      )}

      {activePanel === "outline" && (
        <OutlinePanel
          headings={headings}
          activeHeadingId={activeHeadingId}
          onHeadingClick={handleHeadingClick}
          scrollRef={scrollRef}
        />
      )}

      {activePanel === "search" && (
        <SearchPanel content={content} scrollRef={scrollRef} />
      )}

      {activePanel === "settings" && <SettingsPanel />}
    </aside>
  );
});
