import {forwardRef} from 'react';
import {Box, BoxProps} from '@mui/material';

export interface AvatarProps extends BoxProps {
  name: string;
  profileImage?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  small: {width: 74, height: 74, fontSize: '2rem'},
  medium: {width: 74, height: 74, fontSize: '2rem'},
  large: {width: 80, height: 80, fontSize: '2rem'}
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({name, profileImage, size = 'medium', className, onClick, sx, ...boxProps}, ref) => {
    const dimensions = sizeMap[size];
    sx = {
      ...{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: '50%',
        backgroundImage: profileImage ? `url(${profileImage})` : 'none',
        backgroundSize: '180%',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: profileImage ? 'transparent' : 'primary.main',
        color: 'white',
        fontSize: dimensions.fontSize,
        fontWeight: 600,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        mr: {xs: 0, md: 2}
      },
      ...sx
    };

    return (
      <Box
        ref={ref}
        className={className}
        onClick={onClick}
        sx={sx}
        {...boxProps}
      >
        {!profileImage && name?.charAt(0)}
      </Box>
    );
  }
);

Avatar.displayName = 'Avatar';