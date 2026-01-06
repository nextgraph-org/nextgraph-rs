import {Address} from "@/.orm/shapes/contact.typings.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

interface GeoCode {
  "lat": number,
  "lng": number
}

interface MapBoxResponse {
  type: string,
  features: {
    geometry: {
      coordinates: number[]
    }
  }[]
}


class MapBoxSearchService {
  private static instance: MapBoxSearchService;
  private readonly apiKey: string;
  private readonly apiUrl = "https://api.mapbox.com";

  private constructor() {
    this.apiKey = import.meta.env.VITE_MAPBOX_API_KEY;
  }

  public static getInstance(): MapBoxSearchService {
    if (!MapBoxSearchService.instance) {
      MapBoxSearchService.instance = new MapBoxSearchService();
    }
    return MapBoxSearchService.instance;
  }

  async getGeoCode(address: Address): Promise<GeoCode | undefined> {
    if (!address.value) {
      return;
    }
    const url = `${this.apiUrl}/search/geocode/v6/forward?` +
      new URLSearchParams({
        q: address.value ?? "",
        limit: "1",
        access_token: this.apiKey
      });

    try {
      const response = await fetch(url);

      if (response.status !== 200) {
        // don't act
        console.warn(`GeoCode: ${response.status}`);
        return;
      }

      const data: MapBoxResponse = await response.json();
      if (data.features && data.features.length > 0) {
        const loc = data.features[0];
        if (loc.geometry && loc.geometry.coordinates) {
          const coords = loc.geometry.coordinates;
          return {
            lat: coords[1],
            lng: coords[0]
          }
        }
      }

      return;
    } catch (error) {
      console.log(error);
    }
  }

  public async initContactGeoCodes(contact: Partial<SocialContact>) {
    if (!contact.address || !this.apiKey)
      return;

    for (const address of contact.address) {
      if (address.coordLat && address.coordLng) {
        continue;
      }
      const geoCode = await this.getGeoCode(address);
      if (!geoCode) {
        continue;
      }

      address.coordLat = geoCode?.lat;
      address.coordLng = geoCode?.lng;
    }
  }
}

export const mapBoxSearchService = MapBoxSearchService.getInstance();