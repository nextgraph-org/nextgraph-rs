import {Box, Typography} from "@mui/material";
import {RCard} from "@/.orm/shapes/rcard.typings.ts";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {useMemo} from "react";

interface RCardsSideWidgetTileProps {
  rCard: RCard;
  isDragOver: boolean;
  setNodeRef: (element: HTMLElement | null) => void;
}

export const RCardsSideWidgetTile = ({rCard, isDragOver, setNodeRef}: RCardsSideWidgetTileProps) => {
  const {getCategoryById, getCategoryIcon} = useRCardsConfigs();
  const categoryId = rCard.cardId;
  const category = useMemo(() => getCategoryById(categoryId), [categoryId, getCategoryById]);
  const categoryColor = category.color;

  const borderColor = isDragOver ? categoryColor : 'divider';
  const backgroundColor = isDragOver ? `${categoryColor}14` : 'transparent';

  return (
    <Box
      ref={setNodeRef}
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
          borderColor: categoryColor,
          backgroundColor: `${categoryColor}0f`
        }
      }}
    >
      <Box sx={{color: categoryColor, mb: 0.5}}>
        {getCategoryIcon(categoryId, 28)}
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
      {/*{(category.count ?? 0) > 0 && ( //TODO*/}
      {/*  <Typography*/}
      {/*    variant="caption"*/}
      {/*    sx={{*/}
      {/*      color: 'text.secondary',*/}
      {/*      fontSize: '0.6rem',*/}
      {/*      mt: 0.5*/}
      {/*    }}*/}
      {/*  >*/}
      {/*    {category.count}*/}
      {/*  </Typography>*/}
      {/*)}*/}
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
}