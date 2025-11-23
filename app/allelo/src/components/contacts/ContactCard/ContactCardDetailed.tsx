import React, {forwardRef} from "react";
import {Box, Typography, Chip, Skeleton} from "@mui/material";
import {alpha, useTheme} from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {UilHeart, UilShieldCheck} from "@iconscout/react-unicons";
import {Avatar, IconButton} from "@/components/ui";
import type {Contact} from "@/types/contact";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {Theme} from "@mui/material/styles";
import {Email, Name, Organization, PhoneNumber} from "@/.ldo/contact.typings";
import {iconFilter} from "@/hooks/contacts/useContacts";
import {AccountRegistry} from "@/utils/accountRegistry";
import {formatPhone} from "@/utils/phoneHelper";
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";

const renderContactName = (name?: Name, isLoading?: boolean) => (
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
    {isLoading ? (
      <Skeleton variant="text" width="60%"/>
    ) : (
      name?.value || renderTemplate(defaultTemplates.contactName, name)
    )}
  </Typography>
);

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

const renderJobTitleAndCompany = (organization?: Organization) => (
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
    {organization?.position || ''}
    {organization?.value && ` at ${organization.value}`}
  </Typography>
);

const renderEmail = (email?: Email) => (
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
    {email?.value || ''}
  </Typography>
);

const renderPhoneNumber = (phoneNumber?: PhoneNumber) => (
  phoneNumber?.value && (
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
      {formatPhone(phoneNumber?.value)}
    </Typography>
  )
);

const renderEmailAndPhone = (email?: Email, phoneNumber?: PhoneNumber) => (
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
  contact: Contact | undefined;
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

    const name = resolveFrom(contact, 'name');
    const email = resolveFrom(contact, 'email');
    const phoneNumber = resolveFrom(contact, 'phoneNumber');
    const photo = resolveFrom(contact, 'photo');
    const organization = resolveFrom(contact, 'organization');

    const vouches = (contact?.vouchesSent || 0) + (contact?.vouchesReceived || 0);
    const praises = (contact?.praisesSent || 0) + (contact?.praisesReceived || 0);

    const renderVouchesButton = () => (
      vouches > 0 ?
        <IconButton
          variant="vouches"
          size={isMobile ? "medium" : "large"}
          count={vouches}
          onClick={() => onSetIconFilter("vouchFilter", "has_vouches")}
        >
          <UilShieldCheck/>
        </IconButton> : null
    );

    const renderPraisesButton = () => (
      praises > 0 ?
        <IconButton
          variant="praise"
          size={isMobile ? "medium" : "large"}
          count={praises}
          onClick={() => onSetIconFilter("praiseFilter", "has_praises")}
        >
          <UilHeart/>
        </IconButton> : null
    );

    const renderAccountButtons = () => {
      let accountProtocols = contact?.account?.map(account => account.protocol!).filter(p => p!==undefined) ?? [];
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
    }

    const rCardId = contact?.rcard ? contact.rcard["@id"] : undefined;
    const rCard = getRCardById(rCardId ?? "");

    const categoryId = rCard?.cardId;

    const renderCategoryButton = () => (
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
    );

    const renderNaoStatusButton = () => (
      <IconButton
        variant="nao-status"
        size={isMobile ? "medium" : "large"}
        onClick={() =>
          onSetIconFilter(
            "naoStatusFilter",
            contact?.naoStatus?.value || "not_invited",
          )
        }
      >
        {getNaoStatusIcon(contact?.naoStatus?.value)}
      </IconButton>
    );

    const renderAccountFilers = () => (
      <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
        {renderVouchesButton()}
        {renderPraisesButton()}
        {renderAccountButtons()}
        {renderCategoryButton()}
        {renderNaoStatusButton()}
      </Box>
    );

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
        <Avatar
          name={name?.value || ''}
          profileImage={photo?.value}
          size={isMobile ? "small" : "medium"}
        />

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
            {renderContactName(name)}
            {renderIsMerged((contact?.mergedFrom?.size ?? 0) > 0, theme)}
          </Box>

          {renderJobTitleAndCompany(organization)}
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
