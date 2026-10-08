declare module "mp4box" {
  export interface Sample {
    cts: number;
    duration: number;
    timescale: number;
    is_sync: boolean;
    data: Uint8Array;
  }
  export interface Track {
    id: number;
    codec: string;
    duration: number;
    timescale: number;
    nb_samples: number;
    video: { width: number; height: number };
  }
  interface ConfigurationBox {
    write(stream: DataStream): void;
  }
  interface SampleEntry {
    avcC?: ConfigurationBox;
    hvcC?: ConfigurationBox;
    vpcC?: ConfigurationBox;
    av1C?: ConfigurationBox;
  }
  export class DataStream {
    static BIG_ENDIAN: boolean;
    constructor(buffer?: ArrayBuffer, offset?: number, endian?: boolean);
    buffer: ArrayBuffer;
  }
  export function createFile(): {
    onReady: (info: { videoTracks: Track[] }) => void;
    onError: (message: string) => void;
    onSamples: (id: number, user: unknown, samples: Sample[]) => void;
    getTrackById(id: number): {
      mdia: { minf: { stbl: { stsd: { entries: SampleEntry[] } } } };
    };
    setExtractionOptions(
      id: number,
      user: unknown,
      options: { nbSamples: number },
    ): void;
    appendBuffer(buffer: ArrayBuffer & { fileStart: number }): void;
    start(): void;
    stop(): void;
    flush(): void;
  };
}
