import {UilInfoCircle as Info} from "@iconscout/react-unicons";
import {Box, Divider, IconButton, Typography} from "@mui/material";
import {useRelationshipCategories} from "@/hooks/useRelationshipCategories";
import {useDroppable} from "@dnd-kit/core";
import type {RelationshipCategory} from "@/constants/relationshipCategories";
import type {ReactElement} from "react";

interface RCardsCategoryTileProps {
  category: RelationshipCategory;
  getCategoryIcon: (id?: string, size?: number) => ReactElement;
}

const RCardsCategoryTile = ({category, getCategoryIcon}: RCardsCategoryTileProps) => {
  const {setNodeRef, isOver, active} = useDroppable({
    id: `rcards-category-${category.id}`,
    data: {
      type: 'category',
      categoryId: category.id
    }
  });
  const isDragOver = Boolean(isOver && active?.data?.current?.type === 'contact');
  const borderColor = isDragOver ? category.color : 'divider';
  const backgroundColor = isDragOver ? `${category.color}14` : 'transparent';

  return (
    <Box
      ref={setNodeRef}
      data-category={category.id}
      sx={{
        position: 'relative',
        minHeight: 80,
        border: 2,
        borderColor,
        borderStyle: isDragOver ? 'solid' : 'dashed',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        cursor: 'pointer',
        backgroundColor,
        transition: 'all 0.2s ease-in-out',
        boxShadow: isDragOver ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
        transform: isDragOver ? 'translateY(-2px)' : 'translateY(0)',
        '&:hover': {
          borderColor: category.color,
          backgroundColor: `${category.color}0f`
        }
      }}
    >
      <Box sx={{color: category.color, mb: 0.5}}>
        {getCategoryIcon(category.id, 28)}
      </Box>
      <Typography
        variant="caption"
        sx={{
          textAlign: 'center',
          fontSize: '0.7rem',
          fontWeight: 500,
          lineHeight: 1.2
        }}
      >
        {category.name}
      </Typography>
      {(category.count ?? 0) > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.6rem',
            mt: 0.5
          }}
        >
          {category.count}
        </Typography>
      )}
      {isDragOver && (
        <Box sx={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translate(-50%, -100%)',
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: 'white',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontSize: '0.6rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        }}>
          {`Assign to ${category.name}`}
        </Box>
      )}
    </Box>
  );
};

export const RCardsSideWidget = () => {
  const {getCategoryIcon, getCategoriesArray} = useRelationshipCategories();
  const relationshipCategories = getCategoriesArray();

  const handleInfoClick = () => {
    console.log('Relationship categories info clicked');
    // TODO: Show info dialog or tooltip about relationship categories
  };

  return (
    <Box sx={{px: 2, pb: 2, overflow: 'auto'}}>
      <Divider sx={{mb: 2}}/>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 1,
        px: 1
      }}>
        <Typography variant="subtitle2" sx={{fontWeight: 600, color: 'text.secondary'}}>
          Relationships
        </Typography>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
          <IconButton
            size="small"
            onClick={handleInfoClick}
            sx={{
              color: 'text.secondary',
              p: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <Info size="16"/>
          </IconButton>
        </Box>
      </Box>
      <Typography variant="caption"
                  sx={{mb: 2, color: 'text.secondary', px: 1, fontSize: '0.7rem', lineHeight: 1.2, display: 'block'}}>
        Drag and drop contacts into a category to automatically set sharing permissions.
      </Typography>
      <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1}}>
        {relationshipCategories.map((category) => (
          <RCardsCategoryTile
            key={category.id}
            category={category}
            getCategoryIcon={getCategoryIcon}
          />
        ))}
      </Box>
    </Box>
  );
};
