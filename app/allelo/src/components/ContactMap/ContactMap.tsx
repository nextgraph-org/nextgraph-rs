import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { GlobalStyles } from '@mui/material';
import L from 'leaflet';
import { DEFAULT_CENTER, DEFAULT_ZOOM, initializeLeafletIcons } from './mapUtils';
import { MapController } from './MapController';
import { ContactMarker } from './ContactMarker';
import { EmptyState } from './EmptyState';
import type { ContactMapProps } from './types';
import 'leaflet/dist/leaflet.css';

export const ContactMap = ({ contactNuris, onContactClick }: ContactMapProps) => {
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    initializeLeafletIcons();
  }, []);

  if (contactNuris.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <GlobalStyles
        styles={{
          '.leaflet-popup-content-wrapper': {
            padding: '0 !important',
            borderRadius: '4px !important',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12) !important',
            border: '1px solid rgba(0,0,0,0.08) !important',
          },
          '.leaflet-popup-content': {
            margin: '0 !important',
            padding: '0 !important',
            width: 'min(360px, calc(100vw - 40px)) !important',
            maxWidth: '360px !important',
          },
          '.leaflet-popup-tip': {
            background: 'white !important',
            boxShadow: 'none !important',
            border: '1px solid rgba(0,0,0,0.08) !important',
          }
        }}
      />
      <MapContainer
        ref={mapRef}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        maxZoom={18}
        minZoom={2}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController contactNuris={contactNuris} />

        {contactNuris.map((nuri) => (
          <ContactMarker
            key={nuri}
            nuri={nuri}
            onContactClick={onContactClick}
          />
        ))}
      </MapContainer>
    </>
  );
};