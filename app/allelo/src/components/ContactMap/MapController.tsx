import {useCallback, useEffect, useMemo, useState} from "react";
import {useMap} from "react-leaflet";
import L from "leaflet";
import {DEFAULT_CENTER, DEFAULT_ZOOM} from "./mapUtils";
import {ContactProbe} from "@/components/contacts/ContactProbe";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {resolveFrom} from "@/utils/socialContact/contactUtilsOrm.ts";

export const MapController = ({contactNuris}: { contactNuris: string[] }) => {
  const map = useMap();
  const [byNuri, setByNuri] = useState<Record<string, SocialContact>>({});

  const upsert = useCallback((nuri: string, contact: SocialContact | undefined) => {
    if (!contact) return;
    setByNuri(s => (s[nuri] === contact ? s : {...s, [nuri]: contact}));
  }, []);

  const points = useMemo(() => {
    return Object.values(byNuri)
      .map(c => resolveFrom(c, "address"))
      .filter(a => a?.coordLat != null && a?.coordLng != null)
      .map(a => [a!.coordLat, a!.coordLng] as [number, number]);
  }, [byNuri]);

  // Fix map size on mount and when window resizes
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    // Invalidate size on mount to fix mobile rendering
    setTimeout(() => map.invalidateSize(), 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  useEffect(() => {
    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 10);
      return;
    }
    map.fitBounds(L.latLngBounds(points), {padding: [20, 20]});
  }, [map, points]);

  return (
    <>
      {contactNuris.map(nuri => (
        <ContactProbe key={nuri} nuri={nuri} onContact={upsert}/>
      ))}
    </>
  );
};
