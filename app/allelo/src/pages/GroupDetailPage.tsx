import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Typography, Box, Avatar, IconButton, alpha } from "@mui/material";
import {
	ArrowBack,
	Info,
	FullscreenExit,
	Fullscreen,
} from "@mui/icons-material";
import { useContacts } from "@/hooks/contacts/useContacts";
import type { Group, GroupPost } from "@/types/group";
import {
	type InviteFormData,
} from "@/components/invitations/InviteForm";
import { ContactMap } from "@/components/ContactMap";
import {getGroupMessages, getMockMembers, getMockPosts} from "@/components/groups/GroupDetailPage/mocks.ts";
import {ActivityFeed} from "@/components/groups/GroupDetailPage/ActivityFeed";
import {NetworkView} from "@/components/groups/GroupDetailPage/NetworkView";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";

const GroupDetailPage = () => {
	const { groupId } = useParams<{ groupId: string }>();
	const { group} = useGroupData(groupId);

	const navigate = useNavigate();

	const [posts, setPosts] = useState<GroupPost[]>([]);
	const [tabValue, setTabValue] = useState(0); // Default to combined view
	const [isLoading, setIsLoading] = useState(false);
	const [showInviteForm, setShowInviteForm] = useState(false);
	const [selectedContactNuri, setSelectedContactNuri] = useState<
		string | undefined
	>();

	const tags = ""; //TODO: group.tag?.join(", ")

	// Chat functionality state
	const [groupChatMessage, setGroupChatMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Get all contacts and filter by group membership
	const { contactNuris, addFilter } = useContacts({limit: 0});

  useEffect(() => {
    if (groupId) {
      addFilter("currentUserGroupIds", [groupId]);
    }

  }, [addFilter, groupId]);

	const members = getMockMembers();

	const [fullscreenSection, setFullscreenSection] = useState<
		"activity" | "network" | "map" | null
	>(null);

	// Scroll to bottom when chat messages change
	useEffect(() => {
		if (tabValue === 1) {
			// Only scroll when on chat tab
			const timer = setTimeout(() => {
				scrollToBottom();
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [tabValue]);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	const handleBack = () => {
		navigate("/groups");
	};

	const handleInviteSubmit = (inviteData: InviteFormData) => {
		console.log("Sending invite:", inviteData);
		const inviteParams = new URLSearchParams();
		inviteParams.set("groupId", groupId || "");
		inviteParams.set("inviteeName", inviteData.inviteeName);
		inviteParams.set("inviterName", inviteData.inviterName);
		if (inviteData.relationshipType) {
			inviteParams.set("relationshipType", inviteData.relationshipType);
		}
		if (inviteData.profileCardType) {
			inviteParams.set("profileCardType", inviteData.profileCardType);
		}

		setShowInviteForm(false);
		navigate(`/invite?${inviteParams.toString()}`);
	};

	const handleSelectFromNetwork = () => {
		setShowInviteForm(false);
		navigate(`/contacts?mode=select&returnTo=group-invite&groupId=${groupId}`);
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const handleFullscreenToggle = (section: "activity" | "network" | "map") => {
		if (fullscreenSection === section) {
			setFullscreenSection(null); // Exit fullscreen
		} else {
			setFullscreenSection(section); // Enter fullscreen
		}
	};

	if (isLoading) {
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
					Loading group...
				</Typography>
			</Box>
		);
	}

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

	// Handle fullscreen rendering
	if (fullscreenSection) {
		return (
			<Box
				sx={{
					width: "100%",
					px: { xs: 2, md: 0 },
				}}
			>
				{fullscreenSection === "activity" && (
					<Box
						sx={{
							height: "100%",
							width: "100%",
							display: "flex",
							flexDirection: "column",
						}}
					>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								mb: 2,
							}}
						>
							<Typography
								variant="h6"
								sx={{ fontWeight: 600, color: "primary.main" }}
							>
								Activity Feed - Fullscreen
							</Typography>
							<IconButton onClick={() => handleFullscreenToggle("activity")}>
								<FullscreenExit />
							</IconButton>
						</Box>
						<ActivityFeed
							posts={posts}
							onFullscreenToggle={handleFullscreenToggle}
						/>
					</Box>
				)}

				{fullscreenSection === "network" && (
					<Box
						sx={{ height: "100%", display: "flex", flexDirection: "column" }}
					>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								mb: 2,
							}}
						>
							<Typography
								variant="h6"
								sx={{ fontWeight: 600, color: "primary.main" }}
							>
								Network - Fullscreen
							</Typography>
							<IconButton onClick={() => handleFullscreenToggle("network")}>
								<FullscreenExit />
							</IconButton>
						</Box>
						<Box
							sx={{
								flex: 1,
								border: 1,
								borderColor: "divider",
								borderRadius: 2,
								overflow: "hidden",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<NetworkView members={members} />
						</Box>
					</Box>
				)}

				{fullscreenSection === "map" && (
					<Box
						sx={{ height: "100%", display: "flex", flexDirection: "column" }}
					>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								mb: 2,
							}}
						>
							<Typography
								variant="h6"
								sx={{ fontWeight: 600, color: "primary.main" }}
							>
								Member Locations - Fullscreen
							</Typography>
							<IconButton onClick={() => handleFullscreenToggle("map")}>
								<FullscreenExit />
							</IconButton>
						</Box>
						<Box
							sx={{
								flex: 1,
								border: 1,
								borderColor: "divider",
								borderRadius: 2,
								overflow: "hidden",
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
				)}
			</Box>
		);
	}

	return (
		<Box
			sx={{
				width: "100%",
			}}
		>
			<Box sx={{ width: "100%", px: { xs: 1, sm: 3 }, py: { xs: 1, sm: 2 } }}>
				{/* Header */}
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						mb: 2,
						px: { xs: 2, sm: 0 },
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
						<IconButton onClick={handleBack} sx={{ color: "text.primary" }}>
							<ArrowBack />
						</IconButton>

						<Avatar
							//src={group.image}
							//alt={group.title}
							sx={{
								width: { xs: 40, md: 56 },
								height: { xs: 40, md: 56 },
								bgcolor: "background.paper",
								border: 1,
								borderColor: "primary.main",
								color: "primary.main",
								flexShrink: 0,
							}}
						>
							{group.title.charAt(0)}
						</Avatar>

						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
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
							display: { xs: "none", md: "flex" },
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
							<Info />
						</IconButton>
					</Box>
					{/* Mobile: Info icon in header */}
					<Box
						sx={{
							display: { xs: "flex", md: "none" },
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
							<Info sx={{ fontSize: 20 }} />
						</IconButton>
					</Box>
				</Box>

				{/* Tabs */}
				{/*<GroupTabs tabValue={tabValue} onTabChange={handleTabChange} />*/}

				{/* Tab Content */}
				{tabValue === 0 && (
					<Box
						sx={{
							display: { xs: "block", md: "flex" },
							gap: 3,
							mt: 2,
							width: "100%",
						}}
					>
						<ActivityFeed
							posts={getMockPosts("1")}
							onFullscreenToggle={handleFullscreenToggle}
						/>

						{/* Network and Map */}
						<Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
							<Typography
								variant="h6"
								sx={{
									fontWeight: 600,
									mb: 2,
									color: "primary.main",
									flexShrink: 0,
								}}
							>
								Network
							</Typography>
							<Box
								sx={{
									flex: 2,
									mb: 2,
									border: 1,
									borderColor: "divider",
									borderRadius: 2,
									overflow: "hidden",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									position: "relative",
								}}
							>
								<NetworkView members={members} />
								{/* Fullscreen expand icon */}
								<IconButton
									size="small"
									onClick={() => handleFullscreenToggle("network")}
									sx={{
										position: "absolute",
										bottom: 8,
										right: 8,
										backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
										"&:hover": {
											backgroundColor: (theme) => theme.palette.background.paper,
										},
										zIndex: 10,
									}}
								>
									<Fullscreen fontSize="small" />
								</IconButton>
							</Box>

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
								{/* Fullscreen expand icon */}
								<IconButton
									size="small"
									onClick={() => handleFullscreenToggle("map")}
									sx={{
										position: "absolute",
										bottom: 8,
										right: 8,
										backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
										"&:hover": {
											backgroundColor: (theme) => theme.palette.background.paper,
										},
										zIndex: 10,
									}}
								>
									<Fullscreen fontSize="small" />
								</IconButton>
							</Box>
						</Box>
					</Box>
				)}

				{/*{tabValue === 1 && (
					<Box sx={{ mt: 2, bgcolor: "background.paper", borderRadius: 2 }}>
						<Conversation
							messages={groupMessages}
							currentMessage={groupChatMessage}
							onMessageChange={setGroupChatMessage}
							onSendMessage={handleSendGroupMessage}
							chatName={group?.name}
							isGroup={true}
							members={(() => {
								const memberNames = members
									.slice(0, 3)
									.map((member) => member.name);
								if (members.length > 3) {
									memberNames.push(`${members.length - 3} others`);
								}
								return memberNames;
							})()}
							showBackButton={false}
							compensationHeight={520}
						/>
					</Box>
				)}

				{tabValue === 2 && <GroupDocs />}*/}
			</Box>

			{/* Invite Form */}
			{/*TODO: {group && (
				<InviteForm
					open={showInviteForm}
					onClose={() => {
						setShowInviteForm(false);
						setSelectedContactNuri(undefined);
					}}
					onSubmit={handleInviteSubmit}
					onSelectFromNetwork={handleSelectFromNetwork}
					group={group}
					inviteeNuri={selectedContactNuri}
				/>
			)}*/}
		</Box>
	);
};

export default GroupDetailPage;
