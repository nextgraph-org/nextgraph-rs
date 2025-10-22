import {forwardRef} from 'react';
import {Box} from '@mui/material';
import {getContactPhotoStyles} from '@/utils/photoStyles';

export interface AvatarProps {
  name: string;
  profileImage?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  small: {width: 32, height: 32, fontSize: '0.875rem'},
  medium: {width: 44, height: 44, fontSize: '1.25rem'},
  large: {width: 80, height: 80, fontSize: '2rem'}
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({name, profileImage, size = 'medium', className, onClick}, ref) => {
    const dimensions = sizeMap[size];
    const photoStyles = profileImage ? getContactPhotoStyles(name) : null;

    return (
      <Box
        ref={ref}
        className={className}
        onClick={onClick}
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: '50%',
          backgroundImage: profileImage ? `url(${profileImage})` : 'none',
          backgroundSize: photoStyles?.backgroundSize || 'cover',
          backgroundPosition: photoStyles?.backgroundPosition || 'center center',
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
          mr: {sx: 0, md: 2}
        }}
      >
        {!profileImage && name?.charAt(0)}
      </Box>
    );
  }
);

Avatar.displayName = 'Avatar';