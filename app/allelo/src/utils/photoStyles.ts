export interface PhotoStyles {
  backgroundSize: string;
  backgroundPosition: string;
}

/**
 * Get custom photo positioning and zoom levels for contact profile images.
 * These settings ensure optimal cropping and positioning for each person's photo.
 */
export const getContactPhotoStyles = (contactName: string): PhotoStyles => {
  let backgroundSize = '180%'; // default
  let backgroundPosition = 'center center'; // default
  
  switch (contactName) {
    case 'Tree Willard':
      backgroundSize = '120%';
      break;
    case 'Niko Bonnieure':
      backgroundSize = '100%';
      break;
    case 'Tim Bansemer':
      backgroundSize = '220%';
      break;
    case 'Duke Dorje':
      backgroundSize = '200%';
      backgroundPosition = '60% 65%';
      break;
    case 'Kevin Triplett':
      backgroundSize = '220%';
      backgroundPosition = '40% 60%';
      break;
    case 'Kristina Lillieneke':
      backgroundSize = '220%';
      backgroundPosition = 'center 60%';
      break;
    case 'Oliver Sylvester-Bradley':
      backgroundSize = '220%';
      backgroundPosition = 'center 55%';
      break;
    case 'David Thomson':
      backgroundSize = '220%';
      break;
    case 'Samuel Gbafa':
      backgroundSize = '280%';
      backgroundPosition = '60% 60%';
      break;
    case 'Meena Seshamani':
      backgroundSize = '280%';
      backgroundPosition = '60% 60%';
      break;
    case 'Alex Lion Yes!':
      backgroundPosition = '70% 70%';
      break;
    case 'Aza Mafi':
      backgroundPosition = 'center 80%';
      break;
    case 'Day Waterbury':
      backgroundPosition = 'center 60%';
      break;
    case 'Frederic Boyer':
      backgroundPosition = 'center 60%';
      break;
    case 'Joscha Raue':
      backgroundPosition = '60% 65%';
      break;
    case 'Margeigh Novotny':
      backgroundPosition = 'center 70%';
      break;
  }
  
  return { backgroundSize, backgroundPosition };
};