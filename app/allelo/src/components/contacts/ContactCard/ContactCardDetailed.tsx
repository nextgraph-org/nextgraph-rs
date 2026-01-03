import React, {forwardRef, useCallback} from "react";
import {Box, Typography, Chip} from "@mui/material";
import {alpha, useTheme} from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {UilHeart, UilShieldCheck} from "@iconscout/react-unicons";
import {IconButton} from "@/components/ui";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {Theme} from "@mui/material/styles";
import {iconFilter} from "@/hooks/contacts/useContacts";
import {AccountRegistry} from "@/utils/accountRegistry";
import {formatPhone} from "@/utils/phoneHelper";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {ContactCardAvatarOrm} from "@/components/contacts/ContactCardAvatar";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {
  resolveContactEmail,
  resolveContactName,
  resolveContactOrganization,
  resolveContactPhone
} from "@/utils/socialContact/contactUtilsOrm.ts";

const renderIsMerged = (isMerged: boolean, theme: Theme) => (
  isMerged ? <Chip
    label="Merged"
    size="small"
    variant="outlined"
    sx={{
      height: {xs: 16, md: 18},
      fontSize: {xs: "0.55rem", md: "0.6rem"},
      backgroundColor: alpha(theme.palette.success.main, 0.08),
      borderColor: alpha(theme.palette.success.main, 0.2),
      color: "success.main",
      mr: 0.5,
      "& .MuiChip-label": {
        px: 0.5,
      },
    }}
  /> : null
);

const renderEmail = (email?: string) => (
  <Typography
    variant="body2"
    color="text.secondary"
    sx={{
      fontSize: {xs: "0.65rem", md: "0.8rem"},
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      lineHeight: {md: "1.25rem"},
    }}
  >
    {email}
  </Typography>
);

const renderPhoneNumber = (phoneNumber?: string) => (
  phoneNumber && (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{
        fontSize: "0.75rem",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: "1.1rem",
      }}
    >
      {formatPhone(phoneNumber)}
    </Typography>
  )
);

const renderEmailAndPhone = (email?: string, phoneNumber?: string) => (
  <Box
    sx={{
      display: "flex",
      width: 160,
      flexShrink: 0,
      mr: 2,
      minWidth: 0,
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "flex-start",
      height: 44,
      pt: "2px",
      pb: "2px",
    }}
  >
    {renderEmail(email)}
    {renderPhoneNumber(phoneNumber)}
  </Box>
);

export interface ContactCardDetailedProps {
  contact: SocialContact | undefined;
  getNaoStatusIcon: (naoStatus?: string) => React.ReactNode;
  onSetIconFilter: (key: iconFilter, value: string) => void;
}

export const ContactCardDetailed = forwardRef<
  HTMLDivElement,
  ContactCardDetailedProps
>(
  (
    {
      contact,
      getNaoStatusIcon,
      onSetIconFilter,
    },
    ref,
  ) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {getCategoryIcon, getCategoryColor} = useRCardsConfigs();
    const {getRCardById} = useGetRCards();

    const displayName = resolveContactName(contact);

    const email = resolveContactEmail(contact);
    const phoneNumber = resolveContactPhone(contact);
    const organization = resolveContactOrganization(contact);

    //TODO: change when there are actual data
    const vouches = 0;
    const praises = 0;

    const renderVouchesButton = useCallback(() => (
      vouches > 0 ?
        <IconButton
          variant="vouches"
          size={isMobile ? "medium" : "large"}
          count={vouches}
          onClick={() => onSetIconFilter("vouchFilter", "has_vouches")}
        >
          <UilShieldCheck/>
        </IconButton> : null
    ), [isMobile, onSetIconFilter]);

    const renderPraisesButton = useCallback(() => (
      praises > 0 ?
        <IconButton
          variant="praise"
          size={isMobile ? "medium" : "large"}
          count={praises}
          onClick={() => onSetIconFilter("praiseFilter", "has_praises")}
        >
          <UilHeart/>
        </IconButton> : null
    ), [isMobile, onSetIconFilter]);

    const renderAccountButtons = useCallback(() => {
      let accountProtocols = [...contact?.account ?? []]?.map(account => account.protocol!).filter(p => p !== undefined) ?? [];
      accountProtocols = [...new Set(accountProtocols)];
      return accountProtocols.map((protocol) => <IconButton
          key={protocol}
          variant="source"
          size={isMobile ? "medium" : "large"}
          onClick={() => onSetIconFilter("accountFilter", protocol || "all")}
          info={protocol}
        >
          {AccountRegistry.getIcon(protocol ?? "", {fontSize: 16, color: '#0077b5'})}
        </IconButton>
      )
    }, [contact?.account, isMobile, onSetIconFilter]);

    const rCardId = contact?.rcard;
    const rCard = getRCardById(rCardId ?? "");

    const categoryId = rCard?.cardId;

    const renderCategoryButton = useCallback(() => (
      <IconButton
        variant="category"
        size={isMobile ? "medium" : "large"}
        backgroundColor={getCategoryColor(categoryId)}
        color="white"
        onClick={() =>
          onSetIconFilter(
            "relationshipFilter",
            rCardId ?? "all",
          )
        }
      >
        {getCategoryIcon(categoryId, 16)}
      </IconButton>
    ), [categoryId, getCategoryColor, getCategoryIcon, isMobile, onSetIconFilter, rCardId]);

    const renderNaoStatusButton = useCallback(() => (
      <IconButton
        variant="nao-status"
        size={isMobile ? "medium" : "large"}
        onClick={() =>
          onSetIconFilter(
            "naoStatusFilter",
            contact?.naoStatus || "not_invited",
          )
        }
      >
        {getNaoStatusIcon(contact?.naoStatus)}
      </IconButton>
    ), [contact?.naoStatus, getNaoStatusIcon, isMobile, onSetIconFilter]);

    const renderAccountFilers = useCallback(() => (
      <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
        {renderVouchesButton()}
        {renderPraisesButton()}
        {renderAccountButtons()}
        {renderCategoryButton()}
        {renderNaoStatusButton()}
      </Box>
    ), [renderAccountButtons, renderCategoryButton, renderNaoStatusButton, renderPraisesButton, renderVouchesButton]);

    return (
      <Box
        ref={ref}
        sx={{
          display: "flex",
          alignItems: {xs: "center", md: "flex-start"},
          gap: {xs: 1, md: 0},
          width: "100%",
        }}
      >
        {/* Avatar */}
        <ContactCardAvatarOrm initial={displayName} size={{xs: 74, sm: 74}} contact={contact}/>
        {/* First Column - Name & Company */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            flex: {xs: '1 1 0%', md: '0 0 320px'}, // xs fluid, md fixed 320px
            mr: {xs: 0, md: 3},
            gap: 1
          }}
        >
          <Box sx={{display: "flex", alignItems: "center", gap: {xs: 0.5, md: 1}, mb: 0.5}}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: {xs: "0.85rem", md: "0.95rem"},
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {displayName}
            </Typography>
            {renderIsMerged((contact?.mergedFrom?.size ?? 0) > 0, theme)}
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: {xs: "0.7rem", md: "0.75rem"},
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {organization}
          </Typography>
          {isMobile && renderEmail(email)}
          {isMobile && renderAccountFilers()}
        </Box>

        {/* Second Column - Email & Phone */}
        {!isMobile && renderEmailAndPhone(email, phoneNumber)}

        {/* Right Column - Icons */}
        {!isMobile && <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              height: 44,
              flexShrink: 0,
              ml: "auto",
            }}
        >
          {renderAccountFilers()}
        </Box>}
      </Box>
    );
  },
);

ContactCardDetailed.displayName = "ContactCardDetailed";
