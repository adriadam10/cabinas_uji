import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

export interface Cabin {
    id: string;
    floor: string;
    link: string;
}

export async function parseCabins(): Promise<Cabin[]> {
    const filePath = path.join(process.cwd(), 'data/ejemplo.pdf');
    const dataBuffer = fs.readFileSync(filePath);

    interface PDFLink {
        url: string;
        rect: number[];
    }

    interface PDFTextItem {
        str: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }

    const options = {
        pagerender: async (pageData: any) => {
            const annotations = await pageData.getAnnotations();
            const links: PDFLink[] = [];

            for (const item of annotations) {
                if (item.subtype === 'Link' && item.url) {
                    links.push({
                        url: item.url,
                        rect: item.rect
                    });
                }
            }

            const textContent = await pageData.getTextContent();
            const textItems: PDFTextItem[] = [];

            for (const item of textContent.items) {
                textItems.push({
                    str: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    w: item.width,
                    h: item.height
                });
            }

            return JSON.stringify({ links, textItems }) + '|||'; // Separator
        }
    }

    try {
        const data = await pdf(dataBuffer, options);
        // Split by separator (we might have multiple pages)
        const pages = data.text.split('|||').filter((p: string) => p.trim());

        let allCabins: Cabin[] = [];

        for (const pageJson of pages) {
            if (!pageJson.trim()) continue;
            try {
                const { links, textItems } = JSON.parse(pageJson) as { links: PDFLink[], textItems: PDFTextItem[] };

                // Group text by Y (row) with tolerance
                const rows: { [y: number]: PDFTextItem[] } = {};
                for (const item of textItems) {
                    // Round Y to nearest integer covers minor misalignments
                    const y = Math.round(item.y);
                    if (!rows[y]) rows[y] = [];
                    rows[y].push(item);
                }

                // Process rows
                // Find "Number" + "Consultar disponibilitat" in the same row

                // First pass: identify row structure
                // We assume there are multiple rows.

                for (const yStr in rows) {
                    const rowItems = rows[yStr].sort((a, b) => a.x - b.x);

                    for (let i = 0; i < rowItems.length; i++) {
                        const item = rowItems[i];
                        // If item is a number (Cabin ID)
                        if (/^\d+$/.test(item.str.trim())) {
                            // Look ahead for "Consultar disponibilitat"
                            const nextItem = rowItems[i + 1];
                            if (nextItem && nextItem.str.includes('Consultar')) {
                                // Match!
                                const cabinId = item.str.trim();
                                const floor = cabinId.charAt(0);

                                // Find link overlapping nextItem (or just in the row close to it)
                                // Link rect Y should be close to item.y
                                // Link rect X should overlap nextItem.x

                                const link = links.find(l => {
                                    // Rect is [x1, y1, x2, y2]
                                    // Check if link Y range includes item.y (approx)
                                    // Link y is usually bottom-up or top-down? PDF coords are bottom-left usually.
                                    // pdf-parse/pdf.js uses bottom-left origin usually.
                                    // item.y is also consistent.
                                    // Check vertical overlap
                                    const yOverlap = l.rect[1] <= item.y + 10 && l.rect[3] >= item.y - 10;
                                    // Check horizontal overlap with "Consultar disponibilitat" text (nextItem)
                                    // nextItem.x to nextItem.x + nextItem.w
                                    const xOverlap = l.rect[0] <= nextItem.x + nextItem.w + 10 && l.rect[2] >= nextItem.x - 10;
                                    return yOverlap && xOverlap;
                                });

                                if (link) {
                                    allCabins.push({
                                        id: cabinId,
                                        floor: floor,
                                        link: link.url
                                    });
                                }
                            }
                        }
                    }
                }

            } catch (e) {
                console.error("Error parsing page JSON", e);
            }
        }

        return allCabins.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    } catch (e) {
        console.error("PDF Parse Error", e);
        return [];
    }
}
