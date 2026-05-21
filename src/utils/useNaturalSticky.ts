import {
  useEffect,
  useRef,
  useState,
  CSSProperties,
  DependencyList,
} from 'react';

/**
 * Custom React hook to implement a fluid, Dual-Anchor Sticky Scrolling pattern.
 *
 * For a side panel taller than the viewport:
 * - It scrolls naturally with the page content.
 * - When scrolling down, it pins to the bottom offset boundary when the bottom of the panel is reached.
 * - When scrolling up, it freezes and then pins to the top offset boundary when the top of the panel is reached.
 * - For panels shorter than the viewport, it falls back to standard top stickiness.
 *
 * @param scrollContainerRef Ref of the parent scrollable container (e.g. <main>)
 * @param panelRef Ref of the floating side panel element itself
 * @param dependencies State array triggers to re-run layout checks (e.g. messages, generatedFacets)
 * @param topOffset Pixels to offset from viewport top (default: 48)
 * @param bottomOffset Pixels to offset from viewport bottom (default: 48)
 */
export function useNaturalSticky(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>,
  dependencies: DependencyList = [],
  topOffset = 48,
  bottomOffset = 48
) {
  const [style, setStyle] = useState<CSSProperties>({
    position: 'sticky',
    top: `${topOffset}px`,
  });

  const lastScrollTop = useRef(0);
  const state = useRef<'stuck-top' | 'stuck-bottom' | 'freeze'>('stuck-top');
  const freezeTop = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      if (scrollTop === lastScrollTop.current) return;
      const direction = scrollTop > lastScrollTop.current ? 'down' : 'up';
      lastScrollTop.current = scrollTop;

      const viewportHeight = container.clientHeight;
      const panelHeight = panel.offsetHeight;

      // If the panel fits entirely within the viewport, use normal sticky at the top
      const maxPanelAllowed = viewportHeight - topOffset - bottomOffset;
      if (panelHeight <= maxPanelAllowed) {
        if (state.current !== 'stuck-top') {
          setStyle({
            position: 'sticky',
            top: `${topOffset}px`,
          });
          state.current = 'stuck-top';
        }
        return;
      }

      // Panel is taller than viewport. Natural sticky logic is active.
      const containerRect = container.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      // Measure coordinates relative to viewport bounds
      const panelTopInViewport = panelRect.top - containerRect.top;
      const panelBottomInViewport = containerRect.bottom - panelRect.bottom;

      if (direction === 'down') {
        if (state.current === 'stuck-top') {
          // Freeze the panel at its current height relative to its absolute track
          const currentTop = panel.offsetTop;
          freezeTop.current = currentTop;
          setStyle({
            position: 'absolute',
            top: `${currentTop}px`,
            bottom: 'auto',
          });
          state.current = 'freeze';
        } else if (state.current === 'freeze') {
          // Check if bottom edge is aligned or has scrolled above the bottom viewport offset line
          if (panelBottomInViewport >= bottomOffset) {
            setStyle({
              position: 'sticky',
              top: 'auto',
              bottom: `${bottomOffset}px`,
            });
            state.current = 'stuck-bottom';
          }
        }
      } else {
        // scrolling up
        if (state.current === 'stuck-bottom') {
          // Freeze the panel at its current height relative to its absolute track
          const currentTop = panel.offsetTop;
          freezeTop.current = currentTop;
          setStyle({
            position: 'absolute',
            top: `${currentTop}px`,
            bottom: 'auto',
          });
          state.current = 'freeze';
        } else if (state.current === 'freeze') {
          // Check if top edge has met or scrolled below the top viewport offset line
          if (panelTopInViewport >= topOffset) {
            setStyle({
              position: 'sticky',
              top: `${topOffset}px`,
              bottom: 'auto',
            });
            state.current = 'stuck-top';
          }
        }
      }
    };

    // Run measurement immediately to ensure correct initial layout
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Reactively handle resizing of container or panel content (e.g. toggles, options generated)
    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });
    resizeObserver.observe(container);
    resizeObserver.observe(panel);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollContainerRef, panelRef, topOffset, bottomOffset, ...dependencies]);

  return style;
}
