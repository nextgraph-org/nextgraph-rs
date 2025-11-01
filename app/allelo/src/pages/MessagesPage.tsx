import {UilPlus} from '@iconscout/react-unicons';
import {Box, IconButton, Typography} from '@mui/material';
import {ConversationList} from "@/components/chat/ConversationList/ConversationList";
import {Conversation} from "@/components/chat/Conversation";
import {useEffect, useMemo, useState} from "react";
import {getConversations, getMessagesForConversation} from "@/components/groups/GroupDetailPage/mocks";
import {useDashboardStore} from "@/stores/dashboardStore";
import {useIsMobile} from "@/hooks/useIsMobile";

const MessagesPage = () => {
  const {setOverflow, setShowHeader} = useDashboardStore();
  const conversations = useMemo(() => getConversations(), []);
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const messages = getMessagesForConversation(selectedConversation);
  const [messageText, setMessageText] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (selectedConv && isMobile) {
      setShowHeader(false);
    }
    return () => {
      setShowHeader(true);
    }
  }, [setShowHeader, selectedConv, isMobile]);

  useEffect(() => {

    setOverflow(false);
    return () => {
      setOverflow(true);
    }
  }, [setOverflow]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      console.log('Sending group message:', messageText);
      setMessageText('');
    }
  };

  return (
    <Box sx={{ height: '100%', minHeight: 0}}>
      <Box sx={{
        justifyContent: 'space-between',
        alignItems: 'center',
        p: {xs: '10px 10px 0 10px', md: ' 0 !important'}, // Remove desktop padding
        mb: {xs: 1, md: 1},
        width: '100%',
        overflow: 'hidden',
        minWidth: 0,
        flexShrink: 0,
        display: {md: "flex", xs: "none"}
      }}>
        <Box sx={{flex: 1, minWidth: 0}}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: {xs: 0, md: 0},
              fontSize: {xs: '1.5rem', md: '2.125rem'},
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            Messages
          </Typography>
        </Box>
        <IconButton size="large" sx={{color: 'primary.main'}}>
          <UilPlus size="24"/>
        </IconButton>
      </Box>
      <Box
        sx={{
          height: {md:'90%', xs: '100%'},
          minHeight: 0,
          display: {xs: 'block', md: 'grid'},
          gridTemplateColumns: {md: 'auto 1fr'},
          gridTemplateRows: {md: '1fr'},
          gap: {md: 2},
          overflow: 'hidden',
        }}
      >
        {/* LEFT: conversation list */}
        <Box
          sx={{
            display: {xs: selectedConversation ? 'none' : 'grid', md: 'grid'},
            height: '100%',
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <ConversationList
            conversations={conversations}
            selectConversation={setSelectedConversation}
            selectedConversation={selectedConversation}
          />
        </Box>

        {/* RIGHT: chat pane */}
        <Box
          sx={{
            display: {xs: selectedConversation ? 'grid' : 'none', md: 'grid'},
            gridTemplateRows: '1fr auto',   // messages | composer
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* messages scroller lives inside Conversation */}
          <Conversation
            chatName={selectedConv?.name}
            members={selectedConv?.members}
            messages={messages}
            lastActivity={selectedConv?.lastActivity}
            isGroup={selectedConv?.isGroup}
            currentMessage={messageText}
            onMessageChange={setMessageText}
            onSendMessage={handleSendMessage}
            onBack={() => setSelectedConversation('')}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default MessagesPage;