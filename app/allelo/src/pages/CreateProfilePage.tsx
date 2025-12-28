import {
  UilBell,
  UilFileAlt,
  UilRedo,
  UilRss,
  UilSave,
  UilSearch, UilSetting,
  UilShield, UilUser
} from "@iconscout/react-unicons";
import {Box, Button, Divider, Paper, Tab, Tabs, Typography} from "@mui/material";
import {useCallback, useEffect, useState} from "react";
import {ProfileSection} from "@/components/account/AccountPage";
import {useAddProfile} from "@/hooks/profile/useAddProfile";
import {useNavigate} from "react-router-dom";

const CreateProfilePage = () => {
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(true);

  const {profile, saveProfile, resetProfile} = useAddProfile();

  useEffect(() => {
    setIsValid((profile?.name?.size ?? 0) > 0);
  }, [profile]);

  const save = useCallback(async () => {
    if (!profile || !isValid)//TODO validation
      return;
    saveProfile();
    navigate(`/account`);
  }, [isValid, navigate, profile, saveProfile]);

  // Create tabs similar to AccountPage but with only Profile tab enabled
  const tabItems = [
    {
      label: "Profile",
      icon: <UilUser size="20"/>,
      content: (
        <Box/>
      )
    },
    {label: "Alerts", icon: <UilBell size="20"/>, content: <Box/>, disabled: true},
    {label: "My Stream", icon: <UilRss size="20"/>, content: <Box/>, disabled: true},
    {label: "My Docs", icon: <UilFileAlt size="20"/>, content: <Box/>, disabled: true},
    {label: "Queries", icon: <UilSearch size="20"/>, content: <Box/>, disabled: true},
    {label: "My Cards", icon: <UilShield size="20"/>, content: <Box/>, disabled: true},
    {label: "Settings", icon: <UilSetting size="20"/>, content: <Box/>, disabled: true},
  ];


  return (
    <Box sx={{
      width: '100%',
      maxWidth: {xs: '100vw', md: '100%'},
      overflow: 'hidden',
      boxSizing: 'border-box',
      p: {xs: '10px', md: 0},
      mx: {xs: 0, md: 'auto'}
    }}>
      {/* Header */}
      <Box sx={{
        mb: {xs: 1, md: 1},
        width: '100%',
        overflow: 'hidden',
        minWidth: 0
      }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: {xs: '1.5rem', md: '2.125rem'},
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          Create Your Profile
        </Typography>
      </Box>
      <Tabs
        value={0}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          "& .MuiTabs-flexContainer": {gap: {xs: 0, md: 1}},
          "& .MuiTab-root": {
            minWidth: {xs: "auto", md: 120},
            fontSize: {xs: "0.75rem", md: "0.875rem"},
            px: {xs: 1, md: 2},
          },
          minWidth: 0,
          borderBottom: 1,
          borderColor: "divider",
          mb: 1
        }}
        aria-label="tabs"
      >
        {tabItems.map((item, i) => (
          <Tab
            key={i}
            label={item.label}
            icon={item.icon}
            iconPosition={item.icon ? "start" : undefined}
            disabled={item.disabled}
          />
        ))}
      </Tabs>
      <Paper sx={{p: {xs: 2, md: 3}, mb: 3, backgroundColor: 'background.default'}}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
          <Box></Box>
          <Box sx={{display: 'flex', gap: 1}}>
            <Button
              variant={"text"}
              startIcon={<UilRedo size="20"/>}
              onClick={resetProfile}
            >
              Reset
            </Button>
            <Button
              variant={"text"}
              startIcon={<UilSave size="20"/>}
              onClick={save}
              disabled={!isValid}
            >
              Save
            </Button>
          </Box>
        </Box>

        <ProfileSection initialProfileData={profile} isAddProfile={true}/>
        <Divider sx={{my: 3}}/>
      </Paper>
    </Box>
  );
}

export default CreateProfilePage;