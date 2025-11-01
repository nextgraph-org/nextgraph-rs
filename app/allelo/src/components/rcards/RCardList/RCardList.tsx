import {useState, useRef, useEffect, useCallback} from 'react';
import {
  Box,
  IconButton,
} from '@mui/material';
import {
  UilAngleLeft as ChevronLeft,
  UilAngleRight as ChevronRight,
} from '@iconscout/react-unicons';
import {RCard} from "@/components/rcards/RCard";
import {relationshipCategories} from "@/constants/relationshipCategories";


const RCardList = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [editingCardId, setEditingCardId] = useState("");
  const [arrowOffsets, setArrowOffsets] = useState<{left: number; right: number}>({
    left: 16,
    right: 16,
  });

  const checkScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  const updateArrowOffsets = useCallback(() => {
    if (typeof window === 'undefined') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    setArrowOffsets({
      left: Math.max(rect.left + 8, 16),
      right: Math.max(window.innerWidth - rect.right + 8, 16),
    });
  }, []);

  useEffect(() => {
    checkScroll();
    updateArrowOffsets();

    const handleResize = () => {
      checkScroll();
      updateArrowOffsets();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScroll, updateArrowOffsets]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollAmount = 400;
    if (container.clientWidth) {
      scrollAmount = container.clientWidth + 19.5;
    }
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  return <Box
    sx={{
      position: 'relative',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
    }}
  >
    {/* Left Arrow */}
    {showLeftArrow && (
      <IconButton
        onClick={() => handleScroll('left')}
        sx={{
          position: 'fixed',
          left: arrowOffsets.left,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          backgroundColor: 'background.paper',
          boxShadow: 3,
          '&:hover': {
            backgroundColor: '#fff',
          },
        }}
      >
        <ChevronLeft size="24"/>
      </IconButton>
    )}

    {/* Scrollable Cards Container */}
    <Box
      ref={scrollContainerRef}
      onScroll={checkScroll}
      sx={{
        display: 'flex',
        gap: 3,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        px: 0,
        py: 2,
      }}
    >
      {Array.from(relationshipCategories).map((card) => (
        <RCard
          key={card.id}
          setEditingCardId={setEditingCardId}
          isEditing={editingCardId === card.id}
          disabled={editingCardId ? card.id !== editingCardId : false}
          id={card.id}
          card={card}
        />
      ))}
    </Box>

    {/* Right Arrow */}
    {showRightArrow && (
      <IconButton
        onClick={() => handleScroll('right')}
        sx={{
          position: 'fixed',
          right: arrowOffsets.right,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          backgroundColor: 'background.paper',
          boxShadow: 3,
          '&:hover': {
            backgroundColor: '#fff',
          },
        }}
      >
        <ChevronRight size="24"/>
      </IconButton>
    )}
  </Box>;
};

export default RCardList;
