import {Box, Divider, Typography} from '@mui/material';
import type {ContactsFilters} from '@/hooks/contacts/useContacts';
import {useRelationshipCategories} from '@/hooks/useRelationshipCategories';
import {useMemo, useRef} from "react";
import type {ReactElement} from "react";
import {useDroppable} from "@dnd-kit/core";

interface CategorySidebarProps {
  filters: ContactsFilters;
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
    color: config.main,
    borderColor: 'rgba(158,158,158,0.56)',
    borderStyle: 'dashed',
  };
};

interface CategoryButtonProps {
  categoryId: string;
  isActive: boolean;
  onActivate: (category: string) => void;
  getCategoryDisplayName: (id?: string) => string;
  getCategoryColorScheme: (id?: string) => { main: string; light: string; dark: string; bg: string };
  getCategoryIcon: (id?: string, size?: number) => ReactElement;
}

const CategoryButton = ({
                          categoryId,
                          isActive,
                          onActivate,
                          getCategoryDisplayName,
                          getCategoryColorScheme,
                          getCategoryIcon
                        }: CategoryButtonProps) => {
  const {setNodeRef, isOver, active} = useDroppable({
    id: `relationship-category-${categoryId}`,
    data: {
      type: 'category',
      categoryId
    }
  });
  const isDragOver = useMemo(() => Boolean(isOver && active?.data?.current?.type === 'contact'), [isOver, active]);
  const styles = getColorStyles(categoryId, isActive, isDragOver, getCategoryColorScheme);

  return (
    <Box sx={{position: 'relative', flexShrink: 0, width: 'auto'}}>
      <Box
        ref={setNodeRef}
        onClick={() => onActivate(categoryId)}
        data-category={categoryId}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1.5,
          py: 1,
          gap: 1,
          cursor: 'pointer',
          transition: 'all 0.2s',
          ...styles,
          '&:hover': {
            backgroundColor: isActive ? styles.backgroundColor : 'grey.200',
            transform: 'translateY(-1px)',
            boxShadow: 2
          }
        }}
      >
        {getCategoryIcon(categoryId, 24)}
        <Typography variant={"body2"} fontSize={11}>{getCategoryDisplayName(categoryId)}</Typography>
      </Box>
    </Box>
  );
};

export const CategorySidebar = ({
                                  filters,
                                  onAddFilter,
                                }: CategorySidebarProps) => {
  const {
    getCategoriesArray,
    getCategoryDisplayName,
    getCategoryColorScheme,
    getCategoryIcon
  } = useRelationshipCategories();

  const categories = getCategoriesArray();
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <Box sx={{
      width: '100%',
      flexShrink: 0,
      px: 2
    }}>
      <Typography variant={"body1"} fontWeight={800}>Relationships</Typography>
      <Typography variant={"body2"} fontSize={"11px"} color={"secondary"}>Drag and drop contacts into a category to
        automatically set sharing permissions.</Typography>
      <Box
        ref={scrollerRef}
        sx={{
          maxWidth: '255px',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          pb: 1
        }}>
        {categories.map(category => (
          <CategoryButton
            key={category.id}
            categoryId={category.id}
            isActive={filters.relationshipFilter === category.id}
            onActivate={(categoryId) => onAddFilter('relationshipFilter', categoryId)}
            getCategoryDisplayName={getCategoryDisplayName}
            getCategoryColorScheme={getCategoryColorScheme}
            getCategoryIcon={getCategoryIcon}
          />
        ))}
      </Box>
      <Divider  />
    </Box>
  );
};
