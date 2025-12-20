import type {Contact} from "@/types/contact.ts";
import {Address} from "@/.ldo/contact.typings.ts";
import {GEO_API_URL} from "@/config/importers.ts";
import {mapBoxSearchService} from "@/services/mapBoxSearchService.ts";

interface GeoCode {
  "lat": number,
  "lng": number,
  "timezone"?: string
}


class GeoApiService {
  private static instance: GeoApiService;
  private readonly apiKey: string;
  private readonly apiUrl = GEO_API_URL;

  private constructor() {
    this.apiKey = import.meta.env.VITE_GEO_API_KEY;
  }

  public static getInstance(): GeoApiService {
    if (!GeoApiService.instance) {
      GeoApiService.instance = new GeoApiService();
    }
    return GeoApiService.instance;
  }

  private async getGeoCode(address: Address): Promise<GeoCode | undefined> {
    if (!address.city || !address.country) {
      return;
    }
    const url = `${this.apiUrl}/api/geocode?` +
      new URLSearchParams({
        city: address.city ?? "",
        country: address.country ?? ""
      });

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + this.apiKey,
        }
      });

      return await response.json();// { lat: 48.85341, lng: 2.3488, timezone: "Europe/Paris" }
    } catch (error) {
      console.log(error);
    }
  }

  public async initContactGeoCodes(contact: Contact) {
    if (!contact.address)
      return;

    for (const address of contact.address) {
      if (address.coordLat && address.coordLng) {
        continue;
      }
      let geoCode = await this.getGeoCode(address);
      if (!geoCode) {
        //TODO: this is fallback for coordinates via paid API
        geoCode = await mapBoxSearchService.getGeoCode(address);
        if (!geoCode) {
          continue;
        }
      }

      address.coordLat = geoCode?.lat;
      address.coordLng = geoCode?.lng;
    }
  }
}

export const geoApiService = GeoApiService.getInstance();