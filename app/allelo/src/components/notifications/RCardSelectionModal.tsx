import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Typography,
  Box,
  Avatar,
  Divider,
} from '@mui/material';
import { DEFAULT_PROFILE_CARDS } from '@/types/notification';
import { UilUser } from '@iconscout/react-unicons';

interface RCardSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (rCardIds: string[]) => void;
  contactName?: string;
  isVouch?: boolean;
  multiSelect?: boolean;
}

export const RCardSelectionModal = ({
  open,
  onClose,
  onSelect,
  contactName,
  isVouch = false,
  multiSelect = true,
}: RCardSelectionModalProps) => {
  const [selectedCards, setSelectedCards] = useState<string[]>(
    multiSelect ? ['rcard-default'] : ['rcard-default']
  );

  const handleConfirm = () => {
    onSelect(selectedCards);
    onClose();
  };

  const handleToggleCard = (cardId: string) => {
    if (multiSelect) {
      setSelectedCards(prev => 
        prev.includes(cardId) 
          ? prev.filter(id => id !== cardId)
          : [...prev, cardId]
      );
    } else {
      setSelectedCards([cardId]);
    }
  };

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCards([event.target.value]);
  };

  const handleSelectAll = () => {
    const allCardIds = DEFAULT_PROFILE_CARDS.map(card => `rcard-${card.name.toLowerCase()}`);
    setSelectedCards(allCardIds);
  };

  const handleDeselectAll = () => {
    setSelectedCards([]);
  };

  const allSelected = selectedCards.length === DEFAULT_PROFILE_CARDS.length;

  const getIcon = () => {
    // Using default icon for all profile cards
    return <UilUser size="20" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {multiSelect ? 'Select Profile Cards' : 'Select Profile Card'}
        {contactName && (
          <Typography variant="body2" color="text.secondary">
            {isVouch 
              ? `Choose which profile cards to assign this vouch from ${contactName}`
              : `Choose which profile cards to share ${multiSelect ? '' : 'with ' + contactName}`
            }
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {multiSelect && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedCards.length > 0 && selectedCards.length < DEFAULT_PROFILE_CARDS.length}
                    onChange={allSelected ? handleDeselectAll : handleSelectAll}
                  />
                }
                label={
                  <Typography variant="body1" fontWeight={600}>
                    Select All
                  </Typography>
                }
                sx={{ mb: 1 }}
              />
              <Divider sx={{ mb: 1 }} />
            </>
          )}
          {multiSelect ? (
            // Multi-select with checkboxes
            DEFAULT_PROFILE_CARDS.map((card) => {
              const cardId = `rcard-${card.name.toLowerCase()}`;
              return (
                <FormControlLabel
                  key={card.name}
                  control={
                    <Checkbox
                      checked={selectedCards.includes(cardId)}
                      onChange={() => handleToggleCard(cardId)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: card.color,
                          width: 36,
                          height: 36,
                        }}
                      >
                        {getIcon()}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {card.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {card.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ mb: 1, width: '100%' }}
                />
              );
            })
          ) : (
            // Single select with radio buttons
            <RadioGroup
              value={selectedCards[0] || 'rcard-default'}
              onChange={handleRadioChange}
            >
              {DEFAULT_PROFILE_CARDS.map((card) => {
                const cardId = `rcard-${card.name.toLowerCase()}`;
                return (
                  <FormControlLabel
                    key={card.name}
                    value={cardId}
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: card.color,
                            width: 36,
                            height: 36,
                          }}
                        >
                          {getIcon()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {card.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {card.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ mb: 1, width: '100%' }}
                  />
                );
              })}
            </RadioGroup>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={selectedCards.length === 0}
        >
          {multiSelect ? `Assign to ${selectedCards.length} Card${selectedCards.length !== 1 ? 's' : ''}` : 'Select Card'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};