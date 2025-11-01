import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Typography, Box, Avatar, IconButton, alpha } from "@mui/material";
import {
	ArrowBack,
	Info,
	FullscreenExit,
	Fullscreen,
} from "@mui/icons-material";
import { dataService } from "@/services/dataService";
import { useContacts } from "@/hooks/contacts/useContacts";
import type { Group, GroupPost } from "@/types/group";
import {
	InviteForm,
	type InviteFormData,
} from "@/components/invitations/InviteForm";
import { NetworkView } from "./NetworkView";
import { ContactMap } from "@/components/ContactMap";
import { ActivityFeed } from "./ActivityFeed";
import { GroupDocs } from "./GroupDocs";
import { Conversation } from "@/components/chat/Conversation";
import { getMockMembers, getGroupMessages, getMockPosts } from "./mocks";
import { GroupTabs } from "@/components/groups/GroupDetailPage/GroupTabs";

const GroupDetailPage = () => {
	const { groupId } = useParams<{ groupId: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const [group, setGroup] = useState<Group | null>(null);
	const [posts, setPosts] = useState<GroupPost[]>([]);
	const [tabValue, setTabValue] = useState(0); // Default to combined view
	const [isLoading, setIsLoading] = useState(true);
	const [showInviteForm, setShowInviteForm] = useState(false);
	const [selectedContactNuri, setSelectedContactNuri] = useState<
		string | undefined
	>();

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

	const groupMessages = getGroupMessages();
	const members = getMockMembers();

	const [fullscreenSection, setFullscreenSection] = useState<
		"activity" | "network" | "map" | null
	>(null);

	useEffect(() => {
		const loadGroupData = async () => {
			if (!groupId) return;

			setIsLoading(true);
			try {
				const groupData = await dataService.getGroup(groupId);
				setGroup(groupData || null);

				// Check if this is user's first visit to this group or came from invitation
				const hasVisitedKey = `hasVisited_group_${groupId}`;
				const fromInvite = searchParams.get("fromInvite") === "true";
				const newMember = searchParams.get("newMember") === "true";

				// Handle returning from contact selection
				const contactNuri = searchParams.get("selectedContactNuri");
				if (contactNuri) {
					setSelectedContactNuri(contactNuri);
					setShowInviteForm(true);

					// Clean up selection parameters
					const newSearchParams = new URLSearchParams(searchParams);
					newSearchParams.delete("selectedContactNuri");
					setSearchParams(newSearchParams);
				}

				// Handle new members who just joined from an invitation
				if ((fromInvite || newMember) && groupData) {
					// Mark as visited
					localStorage.setItem(hasVisitedKey, "true");

					// Check if this is an existing member who just selected their rCard
					const existingMember = searchParams.get("existingMember") === "true";
					const selectedRCard = searchParams.get("rCard");

					if (existingMember && selectedRCard) {
						// Store the selected rCard for this group membership
						sessionStorage.setItem(`groupRCard_${groupId}`, selectedRCard);
						console.log(
							`User joined ${groupData.name} with rCard: ${selectedRCard}`,
						);
					}

					// Clean up URL parameters after processing
					if (fromInvite || newMember) {
						const newSearchParams = new URLSearchParams(searchParams);
						newSearchParams.delete("fromInvite");
						newSearchParams.delete("newMember");
						newSearchParams.delete("firstName");
						newSearchParams.delete("inviteeName");
						newSearchParams.delete("existingMember");
						newSearchParams.delete("rCard");
						setSearchParams(newSearchParams);
					}
				}

				const mockPosts = getMockPosts(groupId);
				setPosts(mockPosts);
				console.log("Posts loaded:", mockPosts.length, "posts");
			} catch (error) {
				console.error("Failed to load group data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadGroupData();
	}, [groupId, searchParams, setSearchParams]);

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

	const handleSendGroupMessage = () => {
		if (groupChatMessage.trim()) {
			console.log("Sending group message:", groupChatMessage);
			setGroupChatMessage("");
		}
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
				bgcolor: "background.default",
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
							src={group.image}
							alt={group.name}
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
							{group.name.charAt(0)}
						</Avatar>

						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
								{group.name}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{group.memberCount} members • {group.tags?.join(", ")}
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
				<GroupTabs tabValue={tabValue} onTabChange={handleTabChange} />

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
							posts={posts}
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

				{tabValue === 1 && (
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

				{tabValue === 2 && <GroupDocs />}
			</Box>

			{/* Invite Form */}
			{group && (
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
			)}
		</Box>
	);
};

export default GroupDetailPage;
