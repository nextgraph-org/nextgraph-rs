import {Box} from "@mui/material";
import {RCardProperty} from "./RCardProperty";
import {ContentItem} from "@/models/rcards";
import {useRCards, ZoneContent} from "@/hooks/rCards/useRCards.ts";
import {useCallback, useState} from "react";

interface RCardEditProps { nuri: string; }

export const RCardEdit = ({nuri}: RCardEditProps) => {
  const {zoneContent, changeLocation} = useRCards(nuri, true);
  const [draggedItem, setDraggedItem] = useState<ContentItem | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<keyof ZoneContent | null>(null);
  const [dropTarget, setDropTarget] = useState<{ zone: keyof ZoneContent, index: number } | null>(null);
  const [hasTouchMoved, setHasTouchMoved] = useState(false);

  const getZoneFromEl = (el: Element | null): (keyof ZoneContent) | null => {
    return (el?.closest("[data-zone]") as HTMLElement | null)?.dataset.zone as keyof ZoneContent || null;
  };
  const getZoneEl = (zone: keyof ZoneContent) =>
    document.querySelector(`[data-zone="${zone}"]`) as HTMLElement | null;

  const getIndexInZoneByPoint = (zoneEl: HTMLElement, clientY: number) => {
    // children with data-index in this zone
    const items = Array.from(zoneEl.querySelectorAll<HTMLElement>('[data-index]'));
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (clientY < mid) return i;
    }
    return items.length; // append to end
  };

  const handleDragStart = useCallback((item: ContentItem) => (e: React.DragEvent) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setActiveDropZone(null);
    setDropTarget(null);
  }, []);

  const handleDragEnter = useCallback((zone: keyof ZoneContent, index?: number) => (e: React.DragEvent) => {
    e.stopPropagation();
    if (index === undefined && zone === dropTarget?.zone) return;
    setDropTarget({zone, index: index ?? 0});
    setActiveDropZone(zone);
  }, [dropTarget]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && dropTarget) changeLocation(draggedItem, dropTarget.zone, dropTarget.index);
    handleDragEnd();
  }, [changeLocation, draggedItem, dropTarget, handleDragEnd]);

  const handleTouchStart = useCallback((item: ContentItem) => () => {
    setDraggedItem(item);
    setActiveDropZone(null);
    setDropTarget(null);
    setHasTouchMoved(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggedItem) return;
    // prevent page scroll while dragging
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const zone = getZoneFromEl(el);
    if (!zone) return;
    const zoneEl = getZoneEl(zone);
    if (!zoneEl) return;
    const index = getIndexInZoneByPoint(zoneEl, t.clientY);
    setActiveDropZone(zone);
    setDropTarget({zone, index});
    setHasTouchMoved(true);
  }, [draggedItem]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!hasTouchMoved) {
      setDraggedItem(null);
      setActiveDropZone(null);
      setDropTarget(null);
      setHasTouchMoved(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && dropTarget) changeLocation(draggedItem, dropTarget.zone, dropTarget.index);
    setDraggedItem(null);
    setActiveDropZone(null);
    setDropTarget(null);
    setHasTouchMoved(false);
  }, [changeLocation, draggedItem, dropTarget, hasTouchMoved]);

  const propertyMapper = useCallback((item: ContentItem, idx: number, zone: keyof ZoneContent) => {
    const isDropTarget = dropTarget?.index === idx && dropTarget?.zone === zone;

    return (
      <Box
        key={item.id}
        data-index={idx}
        draggable
        // desktop
        onDragStart={handleDragStart(item)}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter(zone, idx)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        // touch
        onTouchStart={handleTouchStart(item)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          touchAction: 'none',
          width: '100%',
          borderTop: isDropTarget ? '2px solid #1976d2' : 'none',
          transition: 'border-top 0.2s ease',
          cursor: 'move',
          opacity: draggedItem === item && hasTouchMoved ? 0.2 : 1,
          mb: 1
        }}
      >
        <RCardProperty
          key={item.id}
          item={item}
          zone={zone}
          isEditing
        />
      </Box>
    )
  }, [draggedItem, dropTarget, handleDragStart, handleDragEnd, handleDragEnter, handleDragOver, handleDrop, handleTouchStart, handleTouchMove, handleTouchEnd, hasTouchMoved]);

  const propertyMapperTop = useCallback((item: ContentItem, idx: number) => propertyMapper(item, idx, "top"), [propertyMapper]);
  const propertyMapperMiddle = useCallback((item: ContentItem, idx: number) => propertyMapper(item, idx, "middle"), [propertyMapper]);
  const propertyMapperBottom = useCallback((item: ContentItem, idx: number) => propertyMapper(item, idx, "bottom"), [propertyMapper]);

  return (
    <>
      {/* Top */}
      <Box
        data-zone="top"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter("top")}
        onDrop={handleDrop}
        // touch surface
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          touchAction: 'none',
          borderBottom: `0.5px solid #C4C4C4`,
          width: '100%',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: activeDropZone === 'top' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
          transition: 'background-color 0.2s ease',
        }}
      >
        {zoneContent.top.map(propertyMapperTop)}
      </Box>

      {/* Middle */}
      <Box
        data-zone="middle"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter("middle")}
        onDrop={handleDrop}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          touchAction: 'none',
          position: 'relative',
          perspective: 2000,
          height: 'auto',
          width: '100%',
          minHeight: '100px',
          backgroundColor: activeDropZone === 'middle' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
          transition: 'background-color 0.2s ease',
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {zoneContent.middle.map(propertyMapperMiddle)}
      </Box>

      {/* Bottom */}
      <Box
        data-zone="bottom"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter("bottom")}
        onDrop={handleDrop}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          touchAction: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'start',
          pt: 2,
          minHeight: '100px',
          backgroundColor: activeDropZone === 'bottom' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
          transition: 'background-color 0.2s ease',
        }}
      >
        {zoneContent.bottom.map(propertyMapperBottom)}
      </Box>
    </>
  );
};