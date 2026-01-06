import {Box, Typography} from "@mui/material";
import {RCard} from "@/.orm/shapes/rcard.typings.ts";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {useMemo} from "react";

interface RCardsMobileWidgetTileProps {
  rCard: RCard;
  onActivate: () => void;
  isDragOver: boolean;
  isActive:  boolean;
  setNodeRef: (element: HTMLElement | null) => void;
}

export const RCardsMobileWidgetTile = ({rCard, onActivate, isDragOver, isActive, setNodeRef}: RCardsMobileWidgetTileProps) => {
  const {getCategoryColorScheme, getCategoryIcon, getCategoryDisplayName} = useRCardsConfigs();
  const categoryId = rCard.cardId;

  const styles = useMemo(() => {
    const config = getCategoryColorScheme(categoryId);

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
  }, [getCategoryColorScheme, isActive, isDragOver, categoryId]);

  return (
    <Box sx={{position: 'relative', flexShrink: 0, width: 'auto'}}>
      <Box
        ref={setNodeRef}
        onClick={onActivate}
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
        <Typography variant={"body2"} fontSize={11} sx={{color: styles.color}}>{getCategoryDisplayName(categoryId)}</Typography>
      </Box>
    </Box>
  );
}
