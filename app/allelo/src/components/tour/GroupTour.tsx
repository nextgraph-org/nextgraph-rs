import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Avatar,
  List,
  ListItem,
  Paper,
  Rating,
} from '@mui/material';
import {
  UilStarHalfAlt as AutoAwesome,
  UilRss as RssFeed,
  UilUsersAlt as People,
  UilCommentAltDots as Chat,
  UilFolder as Folder,
  UilLink as LinkIcon,
  UilLightbulbAlt as TipsAndUpdates,
  UilThumbsUp as ThumbUp,
  UilCommentAltQuestion as QuestionAnswer,
  UilCheckCircle as CheckCircle,
} from '@iconscout/react-unicons';
import type { Group } from '@/types/group';

interface GroupTourProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  onStartAIAssistant: (prompt?: string) => void;
}

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
}

interface PopularPrompt {
  id: string;
  prompt: string;
  averageRating: number;
  responseCount: number;
  category: string;
}

const GroupTour: React.FC<GroupTourProps> = ({ 
  open, 
  onClose, 
  group, 
  onStartAIAssistant 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPopularPrompts, setShowPopularPrompts] = useState(false);

  const tourSteps: TourStep[] = [
    {
      title: `Welcome to ${group.name}!`,
      description: `Great! You've joined ${group.name}. Let me give you a quick tour of what you can do here.`,
      icon: <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />,
    },
    {
      title: 'Group Feed',
      description: 'This is where group members share updates, discussions, and collaborate. You can post, comment, and engage with other members here.',
      icon: <RssFeed sx={{ fontSize: 40, color: 'primary.main' }} />,
      target: 'feed-tab',
    },
    {
      title: 'Members',
      description: `See all ${group.memberCount} members of the group, their roles, and activity levels. Great for networking and finding collaborators.`,
      icon: <People sx={{ fontSize: 40, color: 'info.main' }} />,
      target: 'members-tab',
    },
    {
      title: 'Group Chat',
      description: 'Real-time messaging with the entire group. Perfect for quick discussions and staying connected.',
      icon: <Chat sx={{ fontSize: 40, color: 'secondary.main' }} />,
      target: 'chat-tab',
    },
    {
      title: 'Collaborative Files',
      description: 'Share documents, spreadsheets, and other files with the group. Work together on projects in real-time.',
      icon: <Folder sx={{ fontSize: 40, color: 'warning.main' }} />,
      target: 'files-tab',
    },
    {
      title: 'Useful Links',
      description: 'Important resources, websites, and references shared by group members. Bookmark and discover valuable content.',
      icon: <LinkIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      target: 'links-tab',
    },
    {
      title: 'AI Assistant',
      description: 'Your smart companion for this group! Ask questions about members, projects, or get insights about group activity.',
      icon: <AutoAwesome sx={{ fontSize: 40, color: 'primary.main' }} />,
    },
  ];

  // Mock data for popular prompts - in real app, this would come from API
  const popularPrompts: PopularPrompt[] = [
    {
      id: '1',
      prompt: "Who's highly engaged in this project?",
      averageRating: 4.8,
      responseCount: 23,
      category: 'Members & Engagement',
    },
    {
      id: '2',
      prompt: "Who's working on which tasks and needs help?",
      averageRating: 4.6,
      responseCount: 18,
      category: 'Project Management',
    },
    {
      id: '3',
      prompt: "What are the most important discussions happening right now?",
      averageRating: 4.5,
      responseCount: 15,
      category: 'Group Activity',
    },
    {
      id: '4',
      prompt: "Show me recent files and documents shared by the team",
      averageRating: 4.4,
      responseCount: 12,
      category: 'Resources',
    },
    {
      id: '5',
      prompt: "Who are the subject matter experts I should connect with?",
      averageRating: 4.7,
      responseCount: 20,
      category: 'Networking',
    },
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowPopularPrompts(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipTour = () => {
    setShowPopularPrompts(true);
  };

  const handleFinishTour = () => {
    onClose();
  };

  const handleUsePrompt = (prompt: string) => {
    onClose();
    onStartAIAssistant(prompt);
  };

  const renderTourStep = () => (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <Box sx={{ mb: 3 }}>
        {tourSteps[currentStep].icon}
      </Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        {tourSteps[currentStep].title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
        {tourSteps[currentStep].description}
      </Typography>
      
      {/* Progress indicator */}
      <Stepper activeStep={currentStep} sx={{ mt: 4, mb: 3 }}>
        {tourSteps.map((_, index) => (
          <Step key={index}>
            <StepLabel />
          </Step>
        ))}
      </Stepper>
    </Box>
  );

  const renderPopularPrompts = () => (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <AutoAwesome sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Try the AI Assistant!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Here are some popular questions other members have asked the AI assistant. 
          These prompts received high ratings from the community:
        </Typography>
      </Box>

      <List sx={{ maxHeight: 400, overflow: 'auto' }}>
        {popularPrompts.map((prompt) => (
          <ListItem key={prompt.id} sx={{ mb: 1 }}>
            <Paper 
              sx={{ 
                p: 2, 
                width: '100%', 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 2,
                  transform: 'translateY(-1px)',
                }
              }}
              onClick={() => handleUsePrompt(prompt.prompt)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Chip 
                  label={prompt.category} 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={prompt.averageRating} readOnly precision={0.1} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    ({prompt.responseCount})
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                "{prompt.prompt}"
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ThumbUp sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption" color="text.secondary">
                  {prompt.averageRating.toFixed(1)}/5.0 average rating • Click to try this prompt
                </Typography>
              </Box>
            </Paper>
          </ListItem>
        ))}
      </List>

      <Box sx={{ textAlign: 'center', mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <TipsAndUpdates sx={{ color: 'info.main', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          You can also ask your own questions! The AI assistant knows about group members, 
          recent activity, shared files, and can help you get oriented.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <AutoAwesome />
          </Avatar>
          <Typography variant="h6">
            {showPopularPrompts ? 'AI Assistant Examples' : 'Group Tour'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {showPopularPrompts ? renderPopularPrompts() : renderTourStep()}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        {!showPopularPrompts ? (
          <>
            <Button onClick={handleSkipTour} color="inherit">
              Skip Tour
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                onClick={handleBack} 
                disabled={currentStep === 0}
                variant="outlined"
              >
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                variant="contained"
              >
                {currentStep === tourSteps.length - 1 ? 'Continue to AI Assistant' : 'Next'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button 
              onClick={() => onStartAIAssistant()} 
              variant="outlined"
              startIcon={<QuestionAnswer />}
            >
              Ask My Own Question
            </Button>
            <Button onClick={handleFinishTour} variant="contained">
              Finish Tour
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GroupTour;