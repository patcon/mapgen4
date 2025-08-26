
# Command Line PNG Export

This tool allows you to programmatically import terrain JSON files and export them as PNG images from the command line, perfect for edge functions and server-side processing.

## Installation

First, install the required dependency:

```bash
npm install
```

This will install Puppeteer, which provides the headless browser needed to run the WebGL rendering.

## Usage

### Basic Usage

```bash
node cli-import-download.js <terrain.json> [output.png]
```

### Examples

```bash
# Use default output filename (map-{timestamp}.png)
node cli-import-download.js my-terrain.json

# Specify custom output filename
node cli-import-download.js my-terrain.json custom-map.png

# Enable debug mode (shows browser window and console logs)
node cli-import-download.js my-terrain.json output.png --debug
```

### Using npm script

You can also use the npm script:

```bash
npm run import-png my-terrain.json output.png
```

## Input Format

The script expects terrain JSON files in the same format as exported by the [`exportTerrain()`](mapgen4.ts:292) function:

```json
{
  "size": 16384,
  "constraints": [/* Float32Array data as regular array */],
  "seed": 12345,
  "island": 0.5,
  "userHasPainted": true
}
```

## Output

- **Format**: PNG
- **Resolution**: 2048x2048 pixels (high quality)
- **Location**: Current directory (or specified path)

## Edge Function Usage

For edge functions, you can import and use the function directly:

```javascript
import { importAndDownloadHeadless } from './cli-import-download.js';

export default async function handler(request) {
  const terrainData = await request.json();
  
  // Save terrain to temp file
  const tempPath = '/tmp/terrain.json';
  const outputPath = '/tmp/output.png';
  
  await fs.writeFile(tempPath, JSON.stringify(terrainData));
  
  // Generate PNG
  await importAndDownloadHeadless(tempPath, outputPath);
  
  // Return PNG as response
  const pngBuffer = await fs.readFile(outputPath);
  return new Response(pngBuffer, {
    headers: { 'Content-Type': 'image/png' }
  });
}
```

## Requirements

- Node.js (ES modules support)
- The mapgen4 project must be built (`npm run start` builds it)
- `embed.html` must be present in the project directory

## Troubleshooting

### "embed.html not found"
Make sure you're running the script from the mapgen4 project directory and that the project has been built.

### Puppeteer issues
If you encounter Puppeteer issues in production environments, you may need additional system dependencies. For Docker/Linux environments:

```dockerfile
RUN apt-get update && apt-get install -y \
    chromium-browser \
    --no-install-recommends
```

### Memory issues
For large-scale processing, consider setting Puppeteer memory limits:

```javascript
const browser = await puppeteer.launch({
  args: ['--max-old-space-size=4096']
});