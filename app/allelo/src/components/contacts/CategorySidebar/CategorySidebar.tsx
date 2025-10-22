import {Box} from '@mui/material';
import type {ContactsFilters} from '@/hooks/contacts/useContacts';
import type {UseContactDragDropReturn} from '@/hooks/contacts/useContactDragDrop';
import {useRelationshipCategories} from '@/hooks/useRelationshipCategories';
import {useLayoutEffect, useRef} from "react";

interface CategorySidebarProps {
  filters: ContactsFilters;
  dragDrop?: UseContactDragDropReturn;
  onAddFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
}

const getColorStyles = (category: string, isActive: boolean, isDragOver: boolean, getCategoryColorScheme: (id?: string) => {
  main: string;
  light: string;
  dark: string;
  bg: string
}) => {
  const config = getCategoryColorScheme(category);

  if (isDragOver) {
    return {
      backgroundColor: config.light,
      color: 'white',
      borderColor: config.main,
      transform: 'scale(1.05)'
    };
  }

  if (isActive) {
    return {
      backgroundColor: config.main,
      color: 'white',
      borderColor: config.main
    };
  }

  return {
    backgroundColor: config.bg,
    color: config.main,
    borderColor: config.main === '#9e9e9e' ? '#e0e0e0' : '#ffcc02'
  };
};

export const CategorySidebar = ({
                                  filters,
                                  dragDrop,
                                  onAddFilter,
                                }: CategorySidebarProps) => {
  const {
    getCategoriesArray,
    getCategoryDisplayName,
    getCategoryColorScheme,
    getCategoryIcon
  } = useRelationshipCategories();

  const categories = getCategoriesArray().filter(c => c.id !== 'uncategorized');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const userMovedRef = useRef(false);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const snapIfOverflow = () => {
      if (userMovedRef.current) return;
      const overflow = el.scrollWidth > el.clientWidth + 1;
      el.scrollLeft = overflow ? el.scrollWidth - el.clientWidth : 0;
    };

    snapIfOverflow();

    const mark = () => { userMovedRef.current = true; };
    el.addEventListener("pointerdown", mark, { passive: true });

    const ro = new ResizeObserver(snapIfOverflow);
    ro.observe(el);

    return () => {
      ro.disconnect();
      el.removeEventListener("pointerdown", mark);
    };
  }, [categories.length]);

  const renderCategoryButton = (category: string) => {
    const isActive = filters.relationshipFilter === category;
    const isDragOver = dragDrop?.dragOverCategory === category;
    const styles = getColorStyles(category, isActive, isDragOver, getCategoryColorScheme);

    return (
      <Box sx={{position: 'relative', flexShrink: 0, width: 'auto'}} key={category}>
        <Box
          onClick={() => onAddFilter('relationshipFilter', category)}
          onDragOver={(e) => dragDrop?.handleDragOver(e, category)}
          onDragLeave={dragDrop?.handleDragLeave}
          onDrop={(e) => dragDrop?.handleDrop(e, category)}
          sx={{
            width: '50px',
            height: '50px',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 0,
            gap: 0,
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: 1,
            ...styles,
            '&:hover': {
              backgroundColor: isActive ? styles.backgroundColor : 'grey.200',
              transform: 'translateY(-1px)',
              boxShadow: 2
            }
          }}
        >
          {getCategoryIcon(category, 20)}
        </Box>

        {/* Drag label tooltip*/}
        {isDragOver && (
          <Box sx={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.9)',
            color: 'white',
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: '0.6rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}>
            {dragDrop?.getCategoryDisplayName(category) || getCategoryDisplayName(category)}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{
      width: '100%',
      flexShrink: 0
    }}>
      <Box
        ref={scrollerRef}
        sx={{
          maxWidth: '255px',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          overflowX: 'auto',
          overflowY: 'visible',
          pt: 1,
          px: 1,
          '&::-webkit-scrollbar': {
            width: '4px',
            height: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '2px'
          }
        }}>
        {categories.map(category => renderCategoryButton(category.id))}
      </Box>
    </Box>
  );
};