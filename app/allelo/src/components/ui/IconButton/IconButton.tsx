import React from 'react';
import {Box, alpha, useTheme, Theme, Typography} from '@mui/material';

export type IconButtonVariant = 
  | 'category' 
  | 'vouches' 
  | 'praise' 
  | 'nao-status' 
  | 'source' 
  | 'neutral';

export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  children: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  backgroundColor?: string;
  color?: string;
  count?: number;
  info?: string;
  onClick?: () => void;
  sx?: object;
}

const getVariantStyles = (variant: IconButtonVariant, theme: Theme) => {
  switch (variant) {
    case 'vouches':
      return {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        color: theme.palette.primary.main,
      };
    case 'praise':
      return {
        backgroundColor: alpha('#f8bbd9', 0.3),
        border: `1px solid ${alpha('#d81b60', 0.3)}`,
        color: '#d81b60',
      };
    case 'nao-status':
      return {
        backgroundColor: alpha('#2196f3', 0.1),
        border: `1px solid ${alpha('#2196f3', 0.2)}`,
        color: '#2196f3',
      };
    case 'source':
      return {
        backgroundColor: alpha('#757575', 0.1),
        border: `1px solid ${alpha('#757575', 0.2)}`,
        color: '#757575',
      };
    case 'category':
      // Category icons use dynamic colors passed via props
      return {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'inherit',
      };
    case 'neutral':
    default:
      return {
        backgroundColor: alpha('#666', 0.1),
        border: `1px solid ${alpha('#666', 0.2)}`,
        color: '#666',
      };
  }
};

const getSizeStyles = (size: IconButtonSize) => {
  switch (size) {
    case 'small':
      return {
        width: 18,
        height: 18,
        iconSize: 8,
        countSize: 10,
      };
    case 'large':
      return {
        width: 25,
        height: 25,
        iconSize: 25,
        countSize: 16,
      };
    case 'medium':
    default:
      return {
        width: 20,
        height: 20,
        iconSize: 14,
        countSize: 12,
      };
  }
};

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = 'neutral',
  size = 'medium',
  backgroundColor,
  color,
  count,
  info,
  onClick,
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const variantStyles = getVariantStyles(variant, theme);
  const sizeStyles = getSizeStyles(size);

  const finalStyles = {
    width: sizeStyles.width,
    height: sizeStyles.height,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
    ...variantStyles,
    // Override with custom colors if provided
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(color ? { color } : {}),
    '& svg': {
      fontSize: sizeStyles.iconSize,
      display: 'block'
    },
    ...sx
  };

  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      event.stopPropagation(); // Prevent event bubbling to parent elements
      onClick();
    }
  };

  return (
    <Box 
      sx={{
        ...finalStyles,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          transform: 'scale(1.05)',
          transition: 'transform 0.1s ease-in-out'
        } : {},
        "&:hover .hoverText": {
          opacity: 1,
          zindex: 99999,
          transitionDelay: "1s"
        },
      }}
      onClick={handleClick}
      {...props}
    >
      {children}
      {count !== undefined && count > 0 && (
        <Box sx={{
          position: 'absolute',
          top: -5,
          right: -5,
          backgroundColor: variant === 'praise' ? '#d81b60' :
                          variant === 'vouches' ? theme.palette.primary.main :
                          '#666',
          color: 'white',
          border: `1px solid ${alpha('#f5f3f3', 0.8)}`,
          borderRadius: '50%',
          width: sizeStyles.countSize,
          height: sizeStyles.countSize,
          fontSize: '0.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600
        }}>
          {count}
        </Box>
      )}
      {!children && info && <Typography sx={{
        fontSize: sizeStyles.iconSize,
        fontWeight: 550,
        textTransform: 'uppercase',
        lineHeight: 1
      }}>
        {info.charAt(0)}
      </Typography>}
      {info && <Typography
        className="hoverText"
        sx={{
          position: "absolute",
          bottom: 18,
          left: -8,
          bgcolor: "rgba(80,73,73,0.6)",
          color: "white",
          px: 1,
          borderRadius: 1,
          fontSize: 12,
          opacity: 0,
          transition: "opacity 0.2s",
        }}
      >
        {info}
      </Typography>}
    </Box>
  );
};