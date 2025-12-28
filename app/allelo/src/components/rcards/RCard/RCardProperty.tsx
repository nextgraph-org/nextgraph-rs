import {useCallback, useMemo} from "react";
import {Box, IconButton, Link, Tooltip, Typography} from "@mui/material";
import {ContentItem} from "@/models/rcards";
import {ZoneContent} from "@/hooks/rCards/useRCards.ts";
import {
  UilPlusCircle as AddCircleOutline,
  UilMinusCircle as RemoveCircleOutline,
  UilExclamationTriangle as MissingIcon,
} from "@iconscout/react-unicons";
import {Avatar} from "@/components/ui";
import {typeIconMapper} from "@/utils/typeIconMapper.ts";
import {AccountRegistry} from "@/utils/accountRegistry.tsx";
import {renderTemplate} from "@/utils/templateRenderer.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {RCardPermissionShapeType} from "@/.orm/shapes/rcard.shapeTypes.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {useShape} from "@ng-org/orm/react";

interface RCardPropertyProps {
  item: ContentItem;
  zone: keyof ZoneContent;
  isEditing?: boolean;
}

export const RCardProperty = ({
                                item,
                                zone,
                                isEditing = false
                              }: RCardPropertyProps) => {
  const nuri = item.permission["@graph"];
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const sessionId = session?.sessionId;

  const permissionsSet = useShape(
    RCardPermissionShapeType,
    sessionId && nuri ? nuri : undefined
  );
  const permission = [...permissionsSet ?? []][0] as RCardPermission;

  const isPermissionGiven = useMemo(() => permission?.isPermissionGiven ?? false, [permission?.isPermissionGiven]);

  const togglePermission = useCallback(() => {
    if (!permission) return;
    permission.isPermissionGiven = !permission.isPermissionGiven;

  }, [permission]);

  const variant = useMemo(() => {
    switch (zone) {
      case "top":
        return "h6";
      case "middle":
        return "body2";
      case "bottom":
        return "body1";
    }
  }, [zone]);

  const missingTooltip = useMemo(() => {
    const label = item.labelToShow ?? item.label ?? "this information";
    return `Currently "${label}" is missing. Once it is filled, it will be shared via this card.`;
  }, [item.labelToShow, item.label]);

  const getIcon = useCallback(() => {
    if (item.propertyConfig.type) {
      return typeIconMapper[item.propertyConfig.type];
    } else if (item.label === "account" && item.propertyConfig.filterParams?.protocol) {
      return AccountRegistry.getIcon(item.propertyConfig.filterParams.protocol)
        ?? item.propertyConfig.filterParams?.protocol;
    }
  }, [item]);

  const getActionButton = useCallback(() => {
    return (
      <IconButton size={"small"} sx={{p: 0}} onClick={() => {
        togglePermission!();
      }}>
        {isPermissionGiven ? <RemoveCircleOutline size="20"/> :
          <AddCircleOutline size="20" style={{color: '#C4C4C4'}}/>}
      </IconButton>
    );
  }, [isPermissionGiven, togglePermission]);

  const getPropertyLink = useCallback((value: string, href?: string, targetBlank: boolean = true) => (
    <Link
      target={targetBlank ? "_blank" : ""}
      href={href ?? value}
      sx={{
        textDecoration: 'none',
        '&:hover': {textDecoration: 'underline'},
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        minWidth: 0,
        pr: 2,
        color: isPermissionGiven ? '#000000' : '#C4C4C4',
      }}
      title={value}
    >
      {value}
    </Link>
  ), [isPermissionGiven]);

  const getPropertyImage = useCallback((value: string) => (
    <Avatar
      profileImage={value}
      size={"small"}
      name={""}
      sx={{
        opacity: isPermissionGiven ? 1 : 0.5,
        backgroundSize: "100%",
      }}
    />
  ), [isPermissionGiven]);

  const getPropertyTypography = useCallback((value: string) => (
    <Typography
      variant={variant}
      sx={{
        color: isPermissionGiven ? '#000000' : '#C4C4C4',
        display: 'block',
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        minWidth: 0,
      }}
      title={value}
    >
      {value}
    </Typography>
  ), [isPermissionGiven, variant]);

  const getAccount = useCallback((value: string) => {
    const href = AccountRegistry.getLink(item.propertyConfig.filterParams?.protocol, value);
    return href ? getPropertyLink(value, href) : getPropertyTypography(value);
  }, [getPropertyLink, getPropertyTypography, item]);

  const getProperty = useCallback((value?: string) => {
    const propertyValue = value ?? item.value;

    let content;
    switch (item.label) {
      case 'account':
        content = getAccount(propertyValue);
        break;
      case 'url':
        content = getPropertyLink(propertyValue);
        break;
      case 'email':
        content = getPropertyLink(propertyValue, "mailto:" + propertyValue, false);
        break;
      case 'photo':
        content = getPropertyImage(propertyValue);
        break;
      default:
        content = getPropertyTypography(propertyValue);
    }

    if (!item.isValueMissing) {
      return content;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <Tooltip
          title={missingTooltip}
          placement="top"
          enterTouchDelay={100}
          leaveTouchDelay={4000}
          arrow
        >
          <Box
            component="span"
            tabIndex={0}
            aria-label={missingTooltip}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              color: 'warning.main',
              cursor: 'pointer',
            }}
          >
            <MissingIcon size="18"/>
          </Box>
        </Tooltip>
      </Box>
    );
  }, [item.value, item.label, item.isValueMissing, getAccount, getPropertyLink, getPropertyImage, getPropertyTypography, missingTooltip]);

  const getLabel = useCallback(() => {
    let label = item.labelToShow!;
    if (item.propertyConfig.shareAll && item.propertyConfig.separator) {
      label += "s";
    }
    if (item.value || item.valueList.length) {
      label = `${label}`;
    }
    return <Typography
      variant={"subtitle2"}
      sx={{
        color: isPermissionGiven ? '#000000' : '#C4C4C4',
      }}
      title={label}
    >
      {label}
    </Typography>
  }, [isPermissionGiven, item]);

  const getPropertyRow = useCallback((value?: string) => {
    if (item.template) {
      value = renderTemplate(item.template, item.templateData);
    }
    return <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 2,
        width: "100%",
        px: 2,
        flex: 1,
        maxWidth: "100%",
        minWidth: 0,
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "start",
        minHeight: "40px",
      }}
      key={item.id + value}
    >
      <Box sx={{
        display: "flex",
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        position: 'relative',
        alignItems: "start",
        justifyContent: "start",

      }}>
        {getIcon()}
        {getProperty(value)}
      </Box>
      {isEditing && getLabel()}
    </Box>

  }, [getIcon, getProperty, item, isEditing, getLabel]);

  const getMultiProperty = useCallback(() => {
    if (item.propertyConfig.separator) {
      return getPropertyRow(item.valueList.join(item.propertyConfig.separator));
    } else if (item.isValueMissing) {
      return getPropertyRow(item.value);
    } else {
      return <Box sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1
      }}>
        {item.valueList.map(getPropertyRow)}
      </Box>;
    }
  }, [item, getPropertyRow]);

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "row",
      alignItems: "start",
      width: "100%",
      justifyContent: "space-between",
      px: 2,
    }}>
      {isEditing ? getActionButton() : <Box/>}
      {item.propertyConfig.shareAll ? getMultiProperty() : getPropertyRow()}
      <Box/>
    </Box>
  )
}
