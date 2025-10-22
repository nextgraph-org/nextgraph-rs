import {forwardRef, useCallback, useEffect, useRef} from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  InputBase,
  useMediaQuery,
  useTheme,
  Avatar
} from '@mui/material';
import {Send, AttachFile, EmojiEmotions, ArrowBack, Group, Circle, MoreVert} from '@mui/icons-material';
import {MessagesProps} from "@/components/chat/Conversation/types";
import {getContactPhotoStyles} from '@/utils/photoStyles';

export const Conversation = forwardRef<HTMLDivElement, MessagesProps>(
  ({
     messages,
     currentMessage,
     onMessageChange,
     onSendMessage,
     chatName,
     avatar,
     onBack,
     lastActivity,
     showBackButton = true,
     isOnline = false,
     isGroup = false,
     members
   }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const renderHeader = () => (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderBottom: `1px solid #74796D24`,
        backgroundColor: 'background.default',
        flexShrink: 0
      }}>
        {/* Back button for mobile */}
        {isMobile && showBackButton && (
          <IconButton
            onClick={onBack}
            sx={{mr: 1}}
          >
            <ArrowBack/>
          </IconButton>
        )}
        <Avatar
          src={avatar}
          sx={{
            width: 40,
            height: 40,
            mr: 2,
            backgroundColor: isGroup ? 'primary.main' : 'secondary.main',
            backgroundImage: avatar ? `url(${avatar})` : 'none',
            backgroundSize: avatar && chatName ? getContactPhotoStyles(chatName).backgroundSize : 'cover',
            backgroundPosition: avatar && chatName ? getContactPhotoStyles(chatName).backgroundPosition : 'center',
          }}
        >
          {!avatar && (isGroup ? <Group/> : chatName?.charAt(0))}
        </Avatar>
        <Box sx={{flex: 1}}>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <Typography variant="h6" sx={{fontWeight: 600}}>
              {chatName}
            </Typography>
            {isGroup && (
              <Group sx={{fontSize: 18, color: 'text.secondary'}}/>
            )}
            {isOnline && !isGroup && (
              <Circle sx={{fontSize: 8, color: 'success.main'}}/>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {isGroup
              ? `${members?.join(', ')}`
              : lastActivity
            }
          </Typography>
        </Box>
        <IconButton>
          <MoreVert/>
        </IconButton>
      </Box>
    )


    const scrollToBottom = () => {
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
      }
    };

    const renderMessageInput = useCallback(() => (<Box sx={{
      px: 2,
      py: 1,
      borderTop: `1px solid #74796D24`,
      backgroundColor: 'background.default',
      flexShrink: 0,
    }}>
      <Paper sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1,
        border: `1px solid #74796D24`
      }}>
        <IconButton size="small">
          <AttachFile/>
        </IconButton>
        <InputBase
          fullWidth
          multiline
          maxRows={4}
          placeholder={isGroup ? `Message ${chatName ?? 'group'}...` : "Type a message..."}
          value={currentMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          sx={{
            fontSize: '0.875rem',
            '& .MuiInputBase-input': {
              py: 0.5
            }
          }}
        />
        <IconButton size="small">
          <EmojiEmotions/>
        </IconButton>
        <IconButton
          size="small"
          onClick={onSendMessage}
          disabled={!currentMessage.trim()}
          sx={{
            ml: 1,
            color: 'primary.main',
            '&:disabled': {
              color: 'text.disabled'
            }
          }}
        >
          <Send/>
        </IconButton>
      </Paper>
    </Box>), [chatName, currentMessage, isGroup, onMessageChange, onSendMessage])

    useEffect(scrollToBottom, [messages]);

    const formatMessageTime = (date: Date) => {
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    };

    return (
      <Paper sx={{
        flex: 1,
        width: {xs: '100%', md: 'auto'},
        flexDirection: 'column',
        ml: {xs: 0, md: 2},
        borderRadius: {xs: 0, md: '12px 12px 0 0'},
        minHeight: 0,
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto', // header | messages scroller | composer
        overflow: 'hidden',
      }}>
        {renderHeader()}
        <Box
          ref={ref}
          sx={{
            mt: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto'
          }}
        >
          {/* Messages */}
          <Box sx={{
            flex: 1,
            overflow: 'auto',
            px: 0,
            py: 1,
            pb: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: '4px',
            },
          }}>
            {messages.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No messages yet. Start the conversation!
                </Typography>
              </Box>
            ) : (
              messages.map((message, index) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.isOwn ? 'flex-end' : 'flex-start',
                    mb: 1,
                    ...(index === 0 && {mt: 'auto'}) // Push first message to bottom
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      backgroundColor: message.isOwn ? 'background.default' : '#F7F3EA',
                      color: 'text.primary',
                      borderRadius: 2,
                      p: 1.5,
                      position: 'relative',
                      border: message.isOwn ? `1px solid #74796D24` : 'none'
                    }}
                  >
                    {/* Show sender name in group chats for non-own messages */}
                    {isGroup && !message.isOwn && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'primary.main',
                          fontWeight: 600,
                          display: 'block',
                          mb: 0.5
                        }}
                      >
                        {message.sender}
                      </Typography>
                    )}
                    <Typography variant="body1">
                      {message.text}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        mt: 0.5,
                        display: 'block'
                      }}
                    >
                      {formatMessageTime(message.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}

            <div ref={messagesEndRef}/>
          </Box>


        </Box>
        {renderMessageInput()}
      </Paper>
    );
  }
);

Conversation.displayName = 'Conversation';