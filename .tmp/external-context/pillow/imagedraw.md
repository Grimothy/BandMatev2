---
source: Pillow Official Docs
library: Pillow
package: PIL.ImageDraw
topic: drawing-shapes-text
fetched: 2026-01-30T10:05:00Z
official_docs: https://pillow.readthedocs.io/en/stable/reference/ImageDraw.html
---

# Pillow ImageDraw Module

The `ImageDraw` module provides simple 2D graphics for Image objects.

## Initialization

### `PIL.ImageDraw.Draw(im, mode=None)`
Creates an object that can be used to draw in the given image.
**Parameters:**
- **im** – The image to draw in. The image will be modified in place.
- **mode** – Optional mode to use for color values.

**Returns:**
An `ImageDraw` object.

## Drawing Methods

### `ImageDraw.rectangle(xy, fill=None, outline=None, width=1)`
Draws a rectangle.
**Parameters:**
- **xy** – Two points to define the bounding box. Sequence of `[(x0, y0), (x1, y1)]` or `[x0, y0, x1, y1]`. The bounding box is inclusive of both endpoints.
- **fill** – Color to use for the fill.
- **outline** – Color to use for the outline.
- **width** – The line width, in pixels.

### `ImageDraw.ellipse(xy, fill=None, outline=None, width=1)`
Draws an ellipse inside the given bounding box.
**Parameters:**
- **xy** – Two points to define the bounding box. Sequence of `[(x0, y0), (x1, y1)]` or `[x0, y0, x1, y1]`.
- **fill** – Color to use for the fill.
- **outline** – Color to use for the outline.
- **width** – The line width, in pixels.

### `ImageDraw.line(xy, fill=None, width=0, joint=None)`
Draws a line between the coordinates in the `xy` list.
**Parameters:**
- **xy** – Sequence of either 2-tuples like `[(x, y), (x, y), ...]` or numeric values like `[x, y, x, y, ...]`.
- **fill** – Color to use for the line.
- **width** – The line width, in pixels.
- **joint** – Joint type between a sequence of lines. It can be `"curve"` or `None`.

### `ImageDraw.text(xy, text, fill=None, font=None, anchor=None, spacing=4, align='left', ...)`
Draws the string at the given position.
**Parameters:**
- **xy** – The anchor coordinates of the text.
- **text** – String to be drawn.
- **fill** – Color to use for the text.
- **font** – An `ImageFont` instance.
- **anchor** – The text anchor alignment (e.g., 'la', 'lt', 'mm'). Defaults to top-left.
- **font_size** - If font is not provided, size to use for default font.
