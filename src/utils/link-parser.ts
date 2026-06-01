import * as path from 'path';

export class LinkParser {
  private static readonly WIKILINK_RE = /(?<!!)\[\[([^#|\]]+)(?:#[^|]*)?(?:\|[^\]]*)?\]\]/g;
  private static readonly EMBED_RE = /!\[\[([^\]]+)\]\]/g;
  private static readonly MD_IMAGE_RE = /!\[.*?\]\((.+?)\)/g;

  private static readonly IMAGE_EXTS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.bmp',
    '.ico',
  ]);
  private static readonly AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);
  private static readonly VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']);

  static parse(content: string): {
    links: { outgoing: number };
    embeds: {
      images: number;
      audio: number;
      video: number;
      other: number;
      total: number;
      broken: number;
    };
  } {
    const wikilinks = [...content.matchAll(this.WIKILINK_RE)];
    const embeds = [...content.matchAll(this.EMBED_RE)];
    const mdImages = [...content.matchAll(this.MD_IMAGE_RE)];

    let images = 0,
      audio = 0,
      video = 0,
      other = 0;

    for (const m of embeds) {
      const fileName = m[1].trim();
      const ext = path.extname(fileName).toLowerCase();
      if (this.IMAGE_EXTS.has(ext)) images++;
      else if (this.AUDIO_EXTS.has(ext)) audio++;
      else if (this.VIDEO_EXTS.has(ext)) video++;
      else other++;
    }

    return {
      links: { outgoing: wikilinks.length },
      embeds: {
        images: images + mdImages.length,
        audio,
        video,
        other,
        total: embeds.length + mdImages.length,
        broken: 0,
      },
    };
  }

  static extractLinks(content: string): string[] {
    return [...content.matchAll(this.WIKILINK_RE)].map((m) => m[1].trim());
  }

  static extractEmbeds(content: string): string[] {
    return [...content.matchAll(this.EMBED_RE)].map((m) => m[1].trim());
  }
}
