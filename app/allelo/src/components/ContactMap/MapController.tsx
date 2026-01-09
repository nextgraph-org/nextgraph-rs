import {useEffect, useMemo} from "react";
import {useMap} from "react-leaflet";
import L from "leaflet";
import {DEFAULT_CENTER, DEFAULT_ZOOM} from "./mapUtils";
import {resolveFrom} from "@/utils/socialContact/contactUtilsOrm.ts";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";

export const MapController = ({contacts}: { contacts: ShortSocialContact[] }) => {
  const map = useMap();

  const points = useMemo(() => {
    return Object.values(contacts)
      .map(c => resolveFrom(c, "address"))
      .filter(a => a?.coordLat != null && a?.coordLng != null)
      .map(a => [a!.coordLat, a!.coordLng] as [number, number]);
  }, [contacts]);

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
    <></>
  );
};
