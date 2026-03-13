import type { ShapeType } from "@ng-org/shex-orm";
import { videoSchema } from "./video.schema";
import type {
  MiruVideoDocument,
  MiruVideoEffectAsset,
  MiruMediaAsset,
  MiruMediaAssetAudio,
  MiruMediaAssetVideo,
} from "./video.typings";

// ShapeTypes for video
export const MiruVideoDocumentShapeType: ShapeType<MiruVideoDocument> = {
  schema: videoSchema,
  shape: "did:ng:z:MiruVideoDocumentShape",
};
export const MiruVideoEffectAssetShapeType: ShapeType<MiruVideoEffectAsset> = {
  schema: videoSchema,
  shape: "did:ng:z:MiruVideoEffectAssetShape",
};
export const MiruMediaAssetShapeType: ShapeType<MiruMediaAsset> = {
  schema: videoSchema,
  shape: "did:ng:z:MiruMediaAssetShape",
};
export const MiruMediaAssetAudioShapeType: ShapeType<MiruMediaAssetAudio> = {
  schema: videoSchema,
  shape: "did:ng:z:MiruMediaAssetAudioShape",
};
export const MiruMediaAssetVideoShapeType: ShapeType<MiruMediaAssetVideo> = {
  schema: videoSchema,
  shape: "did:ng:z:MiruMediaAssetVideoShape",
};
