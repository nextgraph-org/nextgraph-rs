import { useState } from 'react';
import {
  Box,
  Typography,
  Rating,
  Button,
  TextField,
  Collapse,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import {
  UilThumbsUp as ThumbUp,
  UilThumbsDown as ThumbDown,
  UilCommentAltMessage as Feedback,
  UilMessage as Send,
  UilAngleUp as ExpandLess,
} from '@iconscout/react-unicons';

interface AIResponseRatingProps {
  responseId: string;
  onRatingSubmit: (rating: AIResponseRating) => void;
  existingRating?: AIResponseRating;
}

export interface AIResponseRating {
  responseId: string;
  rating: number; // 1-5 stars
  feedback?: string;
  helpfulVote?: 'helpful' | 'not-helpful';
  categories?: string[]; // e.g., ['accurate', 'comprehensive', 'actionable']
  userId: string;
  timestamp: Date;
}

const AIResponseRatingComponent: React.FC<AIResponseRatingProps> = ({
  responseId,
  onRatingSubmit,
  existingRating,
}) => {
  const [rating, setRating] = useState<number>(existingRating?.rating || 0);
  const [feedback, setFeedback] = useState<string>(existingRating?.feedback || '');
  const [helpfulVote, setHelpfulVote] = useState<'helpful' | 'not-helpful' | undefined>(
    existingRating?.helpfulVote
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    existingRating?.categories || []
  );
  const [showDetailedRating, setShowDetailedRating] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(!!existingRating);

  const ratingCategories = [
    { id: 'accurate', label: 'Accurate', color: 'success' as const },
    { id: 'comprehensive', label: 'Comprehensive', color: 'info' as const },
    { id: 'actionable', label: 'Actionable', color: 'primary' as const },
    { id: 'relevant', label: 'Relevant', color: 'secondary' as const },
    { id: 'clear', label: 'Clear', color: 'default' as const },
    { id: 'timely', label: 'Timely', color: 'warning' as const },
  ];

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleQuickVote = (vote: 'helpful' | 'not-helpful') => {
    setHelpfulVote(vote);
    
    // For quick votes, submit immediately with minimal data
    const quickRating: AIResponseRating = {
      responseId,
      rating: vote === 'helpful' ? 4 : 2, // Default ratings for quick votes
      helpfulVote: vote,
      categories: vote === 'helpful' ? ['relevant'] : [],
      userId: 'current-user', // Would be actual user ID
      timestamp: new Date(),
    };
    
    onRatingSubmit(quickRating);
    setHasSubmitted(true);
  };

  const handleDetailedSubmit = () => {
    if (rating === 0) return;

    const detailedRating: AIResponseRating = {
      responseId,
      rating,
      feedback: feedback.trim() || undefined,
      helpfulVote,
      categories: selectedCategories,
      userId: 'current-user', // Would be actual user ID
      timestamp: new Date(),
    };
    
    onRatingSubmit(detailedRating);
    setHasSubmitted(true);
    setShowDetailedRating(false);
  };

  if (hasSubmitted && !showDetailedRating) {
    return (
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'success.50', border: 1, borderColor: 'success.200' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThumbUp sx={{ color: 'success.main', fontSize: 20 }} />
            <Typography variant="body2" color="success.dark">
              Thank you for rating this response!
            </Typography>
          </Box>
          <Button 
            size="small" 
            onClick={() => setShowDetailedRating(true)}
            sx={{ color: 'success.dark' }}
          >
            Edit Rating
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {/* Quick Rating Buttons */}
      {!showDetailedRating && !hasSubmitted && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Was this response helpful?
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={helpfulVote === 'helpful' ? 'contained' : 'outlined'}
              startIcon={<ThumbUp />}
              onClick={() => handleQuickVote('helpful')}
              color="success"
            >
              Yes
            </Button>
            <Button
              size="small"
              variant={helpfulVote === 'not-helpful' ? 'contained' : 'outlined'}
              startIcon={<ThumbDown />}
              onClick={() => handleQuickVote('not-helpful')}
              color="error"
            >
              No
            </Button>
          </Box>
          
          <Button
            size="small"
            startIcon={<Feedback />}
            onClick={() => setShowDetailedRating(true)}
            sx={{ ml: 'auto' }}
          >
            Detailed Rating
          </Button>
        </Box>
      )}

      {/* Detailed Rating Panel */}
      <Collapse in={showDetailedRating}>
        <Paper sx={{ p: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Rate This Response</Typography>
            <IconButton 
              size="small" 
              onClick={() => setShowDetailedRating(false)}
            >
              <ExpandLess />
            </IconButton>
          </Box>

          {/* Star Rating */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Overall Rating
            </Typography>
            <Rating
              value={rating}
              onChange={(_, newValue) => setRating(newValue || 0)}
              size="large"
            />
          </Box>

          {/* Categories */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              What made this response good? (optional)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ratingCategories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.label}
                  variant={selectedCategories.includes(category.id) ? 'filled' : 'outlined'}
                  color={selectedCategories.includes(category.id) ? category.color : 'default'}
                  onClick={() => handleCategoryToggle(category.id)}
                  size="small"
                />
              ))}
            </Box>
          </Box>

          {/* Feedback */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Any additional feedback to help improve AI responses? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Box>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button 
              onClick={() => setShowDetailedRating(false)}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDetailedSubmit}
              variant="contained"
              startIcon={<Send />}
              disabled={rating === 0}
            >
              Submit Rating
            </Button>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AIResponseRatingComponent;