import {useState} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography
} from '@mui/material';
import {useGetRCards} from '@/hooks/rCards/useGetRCards';
import {useRCardsConfigs} from '@/hooks/rCards/useRCardsConfigs';
import {RCard} from '@/.orm/shapes/rcard.typings';

interface AssignRCardDialogProps {
  open: boolean;
  selectedContactsCount: number;
  onClose: () => void;
  onAssign: (rcardId: string) => void;
}

const RCardTile = ({
  rCard,
  isSelected,
  onSelect
}: {
  rCard: RCard;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const {getCategoryById, getCategoryIcon} = useRCardsConfigs();
  const categoryId = rCard.cardId;
  const category = getCategoryById(categoryId);
  const categoryColor = category.color;

  return (
    <Box
      onClick={onSelect}
      sx={{
        position: 'relative',
        minHeight: 80,
        border: 2,
        borderColor: isSelected ? categoryColor : 'divider',
        borderStyle: isSelected ? 'solid' : 'dashed',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        cursor: 'pointer',
        backgroundColor: isSelected ? `${categoryColor}14` : 'transparent',
        transition: 'all 0.2s ease-in-out',
        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
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
    </Box>
  );
};

export const AssignRCardDialog = ({
  open,
  selectedContactsCount,
  onClose,
  onAssign
}: AssignRCardDialogProps) => {
  const {rCards} = useGetRCards();
  const {getCategoryById} = useRCardsConfigs();
  const [selectedRCardId, setSelectedRCardId] = useState<string | null>(null);

  const handleAssign = () => {
    if (selectedRCardId) {
      onAssign(selectedRCardId);
      setSelectedRCardId(null);
    }
  };

  const handleClose = () => {
    setSelectedRCardId(null);
    onClose();
  };

  const selectedRCard = selectedRCardId
    ? [...rCards ?? []].find(rc => rc["@id"] === selectedRCardId)
    : null;

  const selectedCategoryLabel = selectedRCard
    ? getCategoryById(selectedRCard.cardId).name
    : '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Assign Relationship Category
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>
          Select a relationship category to assign to {selectedContactsCount} selected contact{selectedContactsCount !== 1 ? 's' : ''}
        </Typography>
        <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1}}>
          {[...rCards ?? []].map((rCard) => (
            <RCardTile
              key={rCard["@id"]}
              rCard={rCard}
              isSelected={selectedRCardId === rCard["@id"]}
              onSelect={() => setSelectedRCardId(rCard["@id"]!)}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          disabled={!selectedRCardId}
        >
          Assign {selectedCategoryLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};