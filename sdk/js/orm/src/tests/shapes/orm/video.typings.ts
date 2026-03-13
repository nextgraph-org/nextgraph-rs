export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for video
 * =============================================================================
 */

/**
 * MiruVideoDocument Type
 */
export interface MiruVideoDocument {
  /**
   * The graph NURI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:z:MiruVideoDocument";
  /**
   * Original IRI: did:ng:z:name
   */
  name: string;
  /**
   * Original IRI: did:ng:z:description
   */
  description?: string;
  /**
   * Original IRI: did:ng:z:createdAt
   */
  createdAt: string;
  /**
   * Original IRI: did:ng:z:assets
   */
  assets?: Set<MiruMediaAsset | MiruVideoEffectAsset>;
}

/**
 * MiruVideoEffectAsset Type
 */
export interface MiruVideoEffectAsset {
  /**
   * The graph NURI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:z:MiruVideoEffectAsset" | (IRI & {})>;
  /**
   * Original IRI: did:ng:z:id
   */
  id: string;
  /**
   * Original IRI: did:ng:z:type
   */
  type: "asset:effect:video";
  /**
   * Original IRI: did:ng:z:name
   */
  name: string;
  /**
   * Original IRI: did:ng:z:ops
   */
  ops: string;
}

/**
 * MiruMediaAsset Type
 */
export interface MiruMediaAsset {
  /**
   * The graph NURI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:z:MiruMediaAsset" | (IRI & {})>;
  /**
   * Original IRI: did:ng:z:id
   */
  id: string;
  /**
   * Original IRI: did:ng:z:type
   */
  type: "asset:media:av";
  /**
   * Original IRI: did:ng:z:name
   */
  name: string;
  /**
   * Original IRI: did:ng:z:mimeType
   */
  mimeType: string;
  /**
   * Original IRI: did:ng:z:duration
   */
  duration: number;
  /**
   * Original IRI: did:ng:z:size
   */
  size: number;
  /**
   * Original IRI: did:ng:z:audio
   */
  audio?: MiruMediaAssetAudio;
  /**
   * Original IRI: did:ng:z:video
   */
  video?: MiruMediaAssetVideo;
  /**
   * Original IRI: did:ng:z:uri
   */
  uri: string | IRI;
}

/**
 * MiruMediaAssetAudio Type
 */
export interface MiruMediaAssetAudio {
  /**
   * The graph NURI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:z:MiruMediaAssetAudio" | (IRI & {})>;
  /**
   * Original IRI: did:ng:z:codec
   */
  codec: string;
  /**
   * Original IRI: did:ng:z:duration
   */
  duration: number;
  /**
   * Original IRI: did:ng:z:numberOfChannels
   */
  numberOfChannels: number;
  /**
   * Original IRI: did:ng:z:sampleRate
   */
  sampleRate: number;
  /**
   * Original IRI: did:ng:z:firstTimestamp
   */
  firstTimestamp: number;
}

/**
 * MiruMediaAssetVideo Type
 */
export interface MiruMediaAssetVideo {
  /**
   * The graph NURI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:z:MiruMediaAssetVideo" | (IRI & {})>;
  /**
   * Original IRI: did:ng:z:codec
   */
  codec: string;
  /**
   * Original IRI: did:ng:z:duration
   */
  duration: number;
  /**
   * Original IRI: did:ng:z:rotation
   */
  rotation: number;
  /**
   * Original IRI: did:ng:z:width
   */
  width: number;
  /**
   * Original IRI: did:ng:z:height
   */
  height: number;
  /**
   * Original IRI: did:ng:z:frameRate
   */
  frameRate: number;
  /**
   * Original IRI: did:ng:z:firstTimestamp
   */
  firstTimestamp: number;
}
