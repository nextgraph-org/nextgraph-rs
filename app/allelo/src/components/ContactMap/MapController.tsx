import {useCallback, useEffect, useMemo, useState} from "react";
import {useMap} from "react-leaflet";
import L from "leaflet";
import {DEFAULT_CENTER, DEFAULT_ZOOM} from "./mapUtils";
import {resolveFrom} from "@/utils/socialContact/contactUtils";
import {Contact} from "@/types/contact";
import {ContactProbe} from "@/components/contacts/ContactProbe";

export const MapController = ({contactNuris}: { contactNuris: string[] }) => {
  const map = useMap();
  const [byNuri, setByNuri] = useState<Record<string, Contact>>({});

  const upsert = useCallback((nuri: string, contact: Contact | undefined) => {
    if (!contact) return;
    setByNuri(s => (s[nuri] === contact ? s : {...s, [nuri]: contact}));
  }, []);

  const points = useMemo(() => {
    return Object.values(byNuri)
      .map(c => resolveFrom(c, "address"))
      .filter(a => a?.coordLat != null && a?.coordLng != null)
      .map(a => [a!.coordLat, a!.coordLng] as [number, number]);
  }, [byNuri]);

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
