/** WordPress accepts at most 100 media records per collection request. */
const MEDIA_BATCH_SIZE = 100;
type GalleryVehicle = { meta: { gallery_anh?: number[] } };
type GalleryMedia = { id: number; source_url: string };

/** Read shared IDs once, then restore each vehicle's gallery order and duplicates. */
export async function readVehicleGalleries(
  vehicles: GalleryVehicle[],
  readMedia: (path: string) => Promise<GalleryMedia[] | null>,
): Promise<string[][]> {
  const galleries = vehicles.map((vehicle) => (vehicle.meta.gallery_anh ?? []).filter((id) => Number.isFinite(id) && id > 0));
  const ids = [...new Set(galleries.flat())];
  const requests: Promise<GalleryMedia[] | null>[] = [];
  for (let start = 0; start < ids.length; start += MEDIA_BATCH_SIZE) {
    const batch = ids.slice(start, start + MEDIA_BATCH_SIZE);
    requests.push(readMedia(`/media?include=${batch.join(",")}&_fields=id,source_url&per_page=${batch.length}`));
  }
  const media = (await Promise.all(requests)).flatMap((batch) => batch ?? []);
  const urlById = new Map(media.map((item) => [item.id, item.source_url]));
  return galleries.map((gallery) => gallery.map((id) => urlById.get(id)).filter((url): url is string => Boolean(url)));
}
