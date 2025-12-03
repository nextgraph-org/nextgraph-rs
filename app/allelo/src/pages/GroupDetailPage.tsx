import {useParams, useNavigate} from "react-router-dom";
import {Typography, Box, Avatar, IconButton} from "@mui/material";
import {
  ArrowBack,
  Info,
} from "@mui/icons-material";
import {ContactMap} from "@/components/ContactMap";
import {getMockPosts} from "@/components/groups/GroupDetailPage/mocks.ts";
import {ActivityFeed} from "@/components/groups/GroupDetailPage/ActivityFeed";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";

const GroupDetailPage = () => {
  const {groupId} = useParams<{ groupId: string }>();
  const {group} = useGroupData(groupId);

  const navigate = useNavigate();

  const tags = ""; //TODO: group.tag?.join(", ")

  const handleBack = () => {
    navigate("/groups");
  };

  if (!group) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Group not found
        </Typography>
      </Box>
    );
  }

  let contactNuris: string[] = [];
  if (group.hasMember)
    contactNuris = [...group.hasMember];

  return (
    <Box sx={{width: "100%", px: {xs: 1, sm: 3}, py: {xs: 1, sm: 2}}}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          px: {xs: 2, sm: 0},
        }}
      >
        <Box sx={{display: "flex", alignItems: "center", gap: 2, flex: 1}}>
          <IconButton onClick={handleBack} sx={{color: "text.primary"}}>
            <ArrowBack/>
          </IconButton>

          <Avatar
            //src={group.image}
            //alt={group.title}
            sx={{
              width: {xs: 40, md: 56},
              height: {xs: 40, md: 56},
              bgcolor: "background.paper",
              border: 1,
              borderColor: "primary.main",
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            {group.title.charAt(0)}
          </Avatar>

          <Box sx={{flex: 1, minWidth: 0}}>
            <Typography variant="h5" sx={{fontWeight: 600, mb: 0.5}}>
              {group.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {group.hasMember?.size} members • {tags}
            </Typography>
          </Box>
        </Box>

        {/* Desktop buttons */}
        <Box
          sx={{
            display: {xs: "none", md: "flex"},
            gap: 1,
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <IconButton
            onClick={() => navigate(`/groups/${groupId}/info`)}
            sx={{
              border: 1,
              borderColor: "grey.400",
              borderRadius: 2,
            }}
          >
            <Info/>
          </IconButton>
        </Box>
        {/* Mobile: Info icon in header */}
        <Box
          sx={{
            display: {xs: "flex", md: "none"},
            gap: 1,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <IconButton
            onClick={() => navigate(`/groups/${groupId}/info`)}
            sx={{
              border: 1,
              borderColor: "grey.400",
              borderRadius: 2,
              width: 40,
              height: 40,
              mr: 1,
            }}
          >
            <Info sx={{fontSize: 20}}/>
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      {/*<GroupTabs tabValue={tabValue} onTabChange={handleTabChange} />*/}

      {/* Tab Content */}
      {(
        <Box
          sx={{
            display: {xs: "block", md: "flex"},
            gap: 3,
            mt: 2,
            width: "100%",
          }}
        >
          <ActivityFeed
            posts={getMockPosts("1")}
          />

          {/* Network and Map */}
          <Box sx={{display: "flex", flexDirection: "column", flex: 1}}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
                color: "primary.main",
                flexShrink: 0,
              }}
            >
              Member Locations
            </Typography>
            <Box
              sx={{
                flex: 1,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <ContactMap
                contactNuris={contactNuris}
                onContactClick={(contact) => {
                  navigate(`/contacts/${contact["@id"]}`);
                }}
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GroupDetailPage;
