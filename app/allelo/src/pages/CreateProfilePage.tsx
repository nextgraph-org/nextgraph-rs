import {ContactViewHeader} from "@/components/contacts";
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
import {useNavigate} from "react-router-dom";
import {dataService} from "@/services/dataService.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {useLdo, useNextGraphAuth} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {useCallback, useEffect, useState} from "react";
import {contactCommonProperties, contactLdSetProperties} from "@/utils/socialContact/contactUtils.ts";
import {profileService} from "@/services/profileService.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

const CreateProfilePage = () => {
  const navigate = useNavigate();
  const isNextgraph = isNextGraphEnabled();
  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;
  const {commitData, changeData} = useLdo();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<SocialContact>();
  const [isValid, setIsValid] = useState(true);

  const initProfile = useCallback(async () => {
    const draftProfile = await dataService.getDraftProfile();
    setIsValid((draftProfile?.name?.size ?? 0) > 0); // For now just checking name
    setProfile(draftProfile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;

      await initProfile();
    })();

    return () => {
      cancelled = true;
    };
  }, [initProfile]);

  const saveProfile = useCallback(async () => {
    if (!profile) // TODO validation
      return;
    setLoading(true);
    delete profile.isDraft;

    try {
      // ldo issue
      if (isNextgraph) {
        contactLdSetProperties.forEach(propertyKey => {
          (profile[propertyKey]?.toArray() as any[]).forEach(el => delete el["@id"]);
        });
        contactCommonProperties.forEach(propertyKey => {
          if (profile[propertyKey]) {
            delete (profile[propertyKey] as any)["@id"];
          }
        });

        // For NextGraph, use the dedicated updateProfile method
        await profileService.updateProfile(session, profile, changeData, commitData);
      } else {
        // For mock data, update the profile
        await dataService.updateProfile(profile);
      }

      dataService.removeDraftProfile();
      navigate(`/account`);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setLoading(false);
    }
  }, [profile, isNextgraph, navigate, session, changeData, commitData]);

  const resetProfile = useCallback(() => {
    dataService.removeDraftProfile();
    initProfile();
  }, [initProfile])

  // Create tabs similar to AccountPage but with only Profile tab enabled
  const tabItems = [
      {
        label: "Profile",
        icon: <UilUser size="20"/>,
        content: (
          <Box/>
        )
      },
      {label: "Alerts", icon: <UilBell size="20"/>, content: <Box />, disabled: true},
      {label: "My Stream", icon: <UilRss size="20"/>, content: <Box />, disabled: true},
      {label: "My Docs", icon: <UilFileAlt size="20"/>, content: <Box />, disabled: true},
      {label: "Queries", icon: <UilSearch size="20"/>, content: <Box />, disabled: true},
      {label: "My Cards", icon: <UilShield size="20"/>, content: <Box />, disabled: true},
      {label: "Settings", icon: <UilSetting size="20"/>, content: <Box />, disabled: true},
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
              disabled={loading}
            >
              Reset
            </Button>
            <Button
              variant={"text"}
              startIcon={<UilSave size="20"/>}
              onClick={saveProfile}
              loading={loading}
              disabled={!isValid}
            >
              Save
            </Button>
          </Box>
        </Box>

        <ContactViewHeader
          contact={profile!}
          isLoading={false}
          isEditing={!loading}
          showStatus={false}
          showTags={false}
          showActions={false}
          validateParent={setIsValid}
        />


        <Divider sx={{my: 3}}/>
      </Paper>
    </Box>
  );
}

export default CreateProfilePage;