const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('public/data/ejemplo.pdf');

function render_page(pageData) {
    // Check for annotations (links)
    return pageData.getAnnotations().then(function (annotations) {
        let links = [];
        annotations.forEach(function (item) {
            if (item.subtype === 'Link' && item.url) {
                links.push({
                    url: item.url,
                    rect: item.rect // [x1, y1, x2, y2]
                });
            }
        });

        // Also get text content to map position
        return pageData.getTextContent().then(function (textContent) {
            let textItems = [];
            let lastY, text = '';
            for (let item of textContent.items) {
                // item.transform is [scaleX, skewY, skewX, scaleY, x, y]
                // item.str is the text
                textItems.push({
                    str: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    w: item.width,
                    h: item.height
                });
            }

            // Return a JSON string we can parse in the main callback
            return JSON.stringify({
                links: links,
                textItems: textItems
            });
        });
    });
}

let options = {
    pagerender: render_page
}

pdf(dataBuffer, options).then(function (data) {
    // data.text will be the result of render_page for each page (concatenated? or just the last one?)
    // Actually pdf-parse concatenates the result of render_page.

    // Since we return JSON, we might get "JSON... \n\n JSON..."
    // We'll try to split and parse.
    console.log("Raw Output Length:", data.text.length);

    // We can just log the raw output to a file to inspect since it might be huge
    fs.writeFileSync('scripts/pdf-debug.json', data.text);
    console.log("Dumped content to scripts/pdf-debug.json");

}).catch(function (error) {
    console.error("Error parsing PDF", error);
})
