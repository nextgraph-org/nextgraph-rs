import { default as ng } from "../.auth-react/api";

export class ImageService {
  private static instance: ImageService;

  private constructor() {
  }

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  cached: Record<string, any> = {};

  async getBlob(doc_nuri: string, file_nuri: string, only_img: boolean, sessionId: string) {
    if (!file_nuri) return false;
    const cached = this.cached[file_nuri];
    if (cached && (((await cached) !== true) || only_img)) {
      return cached;
    }
    const prom = new Promise((resolve) => {
      try {
        let final_blob: Blob;
        let content_type: string;
        ng.file_get(sessionId, file_nuri, doc_nuri, async (blob: any) => {
          //console.log("GOT APP RESPONSE", blob);
          if (blob.V0.FileMeta) {
            content_type = blob.V0.FileMeta.content_type;
            if (only_img && !content_type.startsWith("image/")) {
              resolve(true);
              return true;// to cancel
            }
            final_blob = new Blob([], {type: content_type});
          } else if (blob.V0.FileBinary) {
            if (blob.V0.FileBinary.byteLength > 0) {
              final_blob = new Blob([final_blob, blob.V0.FileBinary], {
                type: content_type,
              });
            }
          } else if (blob.V0 == "EndOfStream") {
            const imageUrl = URL.createObjectURL(final_blob);
            resolve(imageUrl);
          }
        });
      } catch (e) {
        console.error(e);
        resolve(false);
      }
    });
    this.cached[file_nuri] = prom;
    return prom;
  }

  async uploadFile(file: File | undefined, nuri: string, sessionId: string, progress_callback: (prog: { total: number, current: number }) => void) {

    if (!file) return;

    const upload_id = await ng.upload_start(sessionId, nuri, file.type);
    console.log("upload_id", upload_id)
    await this.do_upload_file(upload_id, nuri, file, sessionId, progress_callback);

    const res = await ng.upload_done(upload_id, sessionId, nuri, file.name);
    console.log(res);
    return res.nuri;
  }

  do_upload_file(upload_id: string, nuri: string, file: File, sessionId: string, progress: (prog: { total: number, current: number }) => void) {
    //console.log(nuri);
    const chunkSize = 1_048_564;
    const fileSize = file.size;
    let offset = 0;
    let readBlock: ((offset: number, length: number, file: File) => void) | null = null;
    progress({ total: fileSize, current: offset });

    return new Promise((resolve, reject) => {

      const onLoadHandler = async function (event: any) {
        const result = event.target.result;

        if (event.target.error == null) {
          offset += result.byteLength;
          progress({ total: fileSize, current: offset });

          // console.log("chunk", result);

          await ng.upload_chunk(
            sessionId,
            upload_id,
            result,
            nuri
          );
          //console.log("chunk upload res", res);
          // if (onChunkRead) {
          //   onChunkRead(result);
          // }
        } else {
          // if (onChunkError) {
          //   onChunkError(event.target.error);
          // }
          progress({ total: fileSize, current: offset/*, error: event.target.error*/ });
          reject(event.target.error);
          return;
        }

        // If finished:
        if (offset >= fileSize) {
          progress({ total: fileSize, current: fileSize });
          resolve(undefined);
          return;
        }

        if (readBlock) {
          readBlock(offset, chunkSize, file);
        }
      };

      readBlock = function (offset: number, length: number, file: File) {
        const fileReader = new FileReader();
        const blob = file.slice(offset, length + offset);
        fileReader.onload = onLoadHandler;
        fileReader.readAsArrayBuffer(blob);
      };

      readBlock(offset, chunkSize, file);

    });

  }
}

export const imageService = ImageService.getInstance();