import {UilEllipsisH as MoreHoriz} from "@iconscout/react-unicons";
import {Box} from "@mui/material";
import {useCallback, useLayoutEffect, useMemo, useRef, useState} from "react";
import {RelationshipCategory} from "@/constants/relationshipCategories.ts";
import {ContentItem, useRCards, ZoneContent} from "@/hooks/rCards/useRCards.ts";
import {RCardProperty} from "@/components/rcards/RCard/RCardProperty.tsx";

interface RCardViewProps {
  card: RelationshipCategory;
  disabled:  boolean;
}

export const RCardView = ({card, disabled = false}: RCardViewProps) => {
  const {zoneContent} = useRCards({card});

  const [foldPercent, setFoldPercent] = useState(1);
  const [isMiddleRevealed, setIsMiddleRevealed] = useState(false);
  const rafRef = useRef<number | null>(null);

  const fold1Ref = useRef<HTMLDivElement>(null);
  const fold2Ref = useRef<HTMLDivElement>(null);
  const [foldHeight, setFoldHeight] = useState(1);

  const hasMiddle = useMemo(() => zoneContent.middle.length > 0, [zoneContent.middle]);

  // Measure middle halves and keep the larger height for a symmetric fold
  useLayoutEffect(() => {
    const measure = () => {
      let h1 = 0;
      let h2 = 0;
      if (fold1Ref.current?.scrollHeight) {
        h1 = fold1Ref.current?.scrollHeight;
      }
      if (fold2Ref.current?.scrollHeight) {
        h2 = fold2Ref.current?.scrollHeight;
      }

      const h = Math.max(h1, h2, 1);
      setFoldHeight(h);
    };

    // Initial measure
    measure();

    // Observe changes
    const ro = new ResizeObserver(measure);
    if (fold1Ref.current) ro.observe(fold1Ref.current);
    if (fold2Ref.current) ro.observe(fold2Ref.current);

    return () => ro.disconnect();
  }, [card, zoneContent]);


  // Easing + animation (unchanged)
  const easeInOutQuad = useCallback((t: number, b: number, c: number, d: number) => {
    let x = t / (d / 2);
    if (x < 1) return (c / 2) * x * x + b;
    x--;
    return (-c / 2) * (x * (x - 2) - 1) + b;
  }, []);

  const animateTo = useCallback(
    (to: number, duration = 400) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const from = foldPercent;
      const start = performance.now();
      const frame = (now: number) => {
        const elapsed = now - start;
        if (elapsed < duration) {
          const step = easeInOutQuad(elapsed, from, to - from, duration);
          setFoldPercent(step);
          rafRef.current = requestAnimationFrame(frame);
        } else {
          setFoldPercent(to);
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    },
    [foldPercent, easeInOutQuad]
  );

  const visual = useMemo(() => {
    const visualFoldHeightRaw = Math.cos(foldPercent * Math.PI / 2) * foldHeight;
    const visualFoldHeight = Math.max(visualFoldHeightRaw, 0);
    const foldsHeight = Math.floor(visualFoldHeight * 2);
    return {
      perspectiveOrigin: `50% ${visualFoldHeight}px`,
      fold1Rot: `rotate3d(1,0,0,${foldPercent * -90}deg)`,
      fold2Rot: `rotate3d(1,0,0,${foldPercent * 180}deg)`,
      shadowOpacity: foldPercent * 0.6,
      bottomShift: 0,
      foldsHeight,
      foldContainerHeight: foldsHeight,
    };
  }, [foldPercent, foldHeight]);

  const toggleReveal = useCallback(() => {
    if (!hasMiddle) return;
    animateTo(isMiddleRevealed ? 1 : 0);
    setIsMiddleRevealed(!isMiddleRevealed);
  }, [isMiddleRevealed, hasMiddle, animateTo]);

  const propertyMapper = useCallback((item: ContentItem, zone: keyof ZoneContent) => <RCardProperty
    item={item}
    zone={zone}
    key={item.id}
  />, []);

  const propertyMapperTop = useCallback((item: ContentItem) =>
    propertyMapper(item, "top"), [propertyMapper]);

  const propertyMapperMiddle = useCallback((item: ContentItem) =>
    propertyMapper(item, "middle"), [propertyMapper]);

  const propertyMapperBottom = useCallback((item: ContentItem) =>
    propertyMapper(item, "bottom"), [propertyMapper]);

  return (
    <Box sx={{ opacity: disabled ? 0.3 : 1, pointerEvents: disabled ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
      {/* Top */}
      <Box
        sx={{
          borderBottom: `0.5px solid #C4C4C4`,
          width: '100%',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {zoneContent.top.length > 0 ? zoneContent.top.map(propertyMapperTop) : <Box/>}


        <Box onClick={() => !disabled && hasMiddle && toggleReveal()} sx={{cursor: "pointer", width: '100%'}}>
          <MoreHoriz size="20" style={{color: hasMiddle ? '#C4C4C4' : '#E0E0E0'}}/></Box>
      </Box>

      {/* Middle with fold */}
      <Box
        sx={{
          position: 'relative',
          perspective: 2000,
          perspectiveOrigin: visual.perspectiveOrigin,
          height: visual.foldContainerHeight,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* fold 1 */}
        <Box
          sx={{
            position: 'relative',
            transformOrigin: '50% 0',
            transformStyle: 'preserve-3d',
            transform: visual.fold1Rot,
            pt: "10px"
          }}
        >
          {/* shadow 1 */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, black, transparent)',
              opacity: visual.shadowOpacity,
              pointerEvents: 'none',
            }}
          />

          {/* fold 1 content wrapper keeps visual height while inner box measures natural content */}
          <Box sx={{height: foldHeight, overflow: 'hidden'}}>
            <Box
              ref={fold1Ref}
              sx={{
                bgcolor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                px: 2,
              }}
            >
              {zoneContent.middle
                .slice(0, Math.ceil(zoneContent.middle.length / 2))
                .map(propertyMapperMiddle)}
            </Box>
          </Box>

          {/* fold 2 nested */}
          <Box
            sx={{
              position: 'relative',
              transformOrigin: '50% 0',
              transformStyle: 'preserve-3d',
              transform: visual.fold2Rot,
            }}
          >
            {/* shadow 2 */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, black, transparent)',
                opacity: visual.shadowOpacity,
                pointerEvents: 'none',
              }}
            />

            {/* fold 2 content */}
            <Box sx={{height: foldHeight, overflow: 'hidden'}}>
              <Box
                ref={fold2Ref}
                sx={{
                  bgcolor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  px: 2,
                }}
              >
                {zoneContent.middle
                  .slice(Math.ceil(zoneContent.middle.length / 2))
                  .map(propertyMapperMiddle)}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Bottom Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'start',
          pt: 2,
        }}
      >
        {zoneContent.bottom.map(propertyMapperBottom)}
      </Box>
    </Box>
  );
};
