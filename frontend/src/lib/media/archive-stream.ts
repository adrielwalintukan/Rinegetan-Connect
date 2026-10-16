import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";

export interface ArchiveFileEntry {
  name: string;
  buffer: Buffer;
}

export function createArchiveStream(
  entries: ArchiveFileEntry[],
  readmeContent?: string
): { stream: PassThrough; finalizePromise: Promise<number> } {
  const archive = new ZipArchive({
    zlib: { level: 6 },
  });

  const stream = new PassThrough();

  archive.pipe(stream);

  const finalizePromise = new Promise<number>((resolve, reject) => {
    archive.on("end", () => {
      resolve(archive.pointer());
    });
    archive.on("error", (err) => {
      stream.destroy(err);
      reject(err);
    });
  });

  if (readmeContent) {
    archive.append(readmeContent, { name: "README.txt" });
  }

  for (const entry of entries) {
    archive.append(entry.buffer, { name: entry.name });
  }

  archive.finalize();

  return { stream, finalizePromise };
}
