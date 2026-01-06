import L from 'leaflet';
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {resolveContactName} from "@/utils/socialContact/contactUtilsOrm.ts";

export const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
export const DEFAULT_ZOOM = 4;

export const createCustomIcon = (contact: SocialContact, displayUrl: string | undefined): L.DivIcon => {
  const displayName = resolveContactName(contact);
  const initials = (displayName || 'Unknown')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return L.divIcon({
    html: `
      <div style="
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${
      displayUrl
            ? `url('${displayUrl}') center/cover, linear-gradient(135deg, #1976d2, #42a5f5)`
            : 'linear-gradient(135deg, #1976d2, #42a5f5)'
        };
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: ${displayUrl ? '12px' : '16px'};
        font-family: 'Roboto', sans-serif;
        cursor: pointer;
        transition: transform 0.2s ease;
        position: relative;
        overflow: visible;
      " 
      onmouseover="this.style.transform='scale(1.1)'"
      onmouseout="this.style.transform='scale(1)'"
      onerror="this.style.background='linear-gradient(135deg, #1976d2, #42a5f5)';"
      >
        ${
            displayUrl
            ? `<span style="
            position: absolute;
            top: -8px;
            left: -8px;
            z-index: 10;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 5px;
            border-radius: 8px;
            font-size: 8px;
            font-weight: 700;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            text-shadow: none;
          ">${initials}</span>`
            : initials
        }
      </div>
    `,
    className: 'custom-contact-marker',
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
  });
};

export const initializeLeafletIcons = (): void => {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};