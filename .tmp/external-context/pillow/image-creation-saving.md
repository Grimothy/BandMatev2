---
source: Pillow Official Docs
library: Pillow
package: PIL.Image
topic: image-creation-saving
fetched: 2026-01-30T10:00:00Z
official_docs: https://pillow.readthedocs.io/en/stable/reference/Image.html
---

# Pillow Image Module

## Constructing images

### `PIL.Image.new(mode, size, color=0)`
Creates a new image with the given mode and size.

**Parameters:**
- **mode** – The mode to use for the new image (e.g., "RGB", "RGBA", "L").
- **size** – A 2-tuple, containing (width, height) in pixels.
- **color** – What color to use for the image. Default is black. If given, this should be a single integer or floating point value for single-band modes, and a tuple for multi-band modes (one value per band). When creating RGB or HSV images, you can also use color strings.

**Returns:**
An `Image` object.

## Saving images

### `Image.save(fp, format=None, **params)`
Saves this image under the given filename. If no format is specified, the format to use is determined from the filename extension, if possible.

**Parameters:**
- **fp** – A filename (string), os.PathLike object or file object.
- **format** – Optional format override. If omitted, the format to use is determined from the filename extension.
- **params** – Extra parameters to the image writer (e.g. `quality`, `optimize`).

**Returns:**
None

**Raises:**
- **ValueError** – If the output format could not be determined from the file name.
- **OSError** – If the file could not be written.
