#!/usr/bin/env node

/**
 * Command-line script to import terrain JSON and download PNG using headless browser
 * Usage: node cli-import-download.js <terrain.json> [output.png]
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { lookup } from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a simple HTTP server to serve the mapgen4 files
 * @param {number} port - Port to serve on
 * @returns {Promise<Object>} Server object with close method
 */
function createMapgenServer(port = 0) {
    return new Promise((resolve, reject) => {
        const server = createServer((req, res) => {
            try {
                let filePath = req.url === '/' ? '/embed.html' : req.url;
                
                // Remove query parameters
                filePath = filePath.split('?')[0];
                
                filePath = path.join(__dirname, '..', filePath);
                
                // Security check - ensure we're serving from the project directory
                const projectRoot = path.resolve(__dirname, '..');
                if (!filePath.startsWith(projectRoot)) {
                    console.log(`403 Forbidden: ${req.url}`);
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                
                const content = readFileSync(filePath);
                const mimeType = lookup(filePath) || 'application/octet-stream';
                
                res.writeHead(200, { 'Content-Type': mimeType });
                res.end(content);
            } catch (error) {
                console.log(`404 Not Found: ${req.url} -> ${error.message}`);
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        server.listen(port, (err) => {
            if (err) {
                reject(err);
            } else {
                const actualPort = server.address().port;
                resolve({
                    port: actualPort,
                    url: `http://localhost:${actualPort}`,
                    close: () => server.close()
                });
            }
        });
    });
}

/**
 * Import terrain and download PNG using headless browser
 * @param {string} terrainJsonPath - Path to terrain JSON file
 * @param {string} outputPath - Path for output PNG file
 * @param {Object} options - Additional options
 */
async function importAndDownloadHeadless(terrainJsonPath, outputPath, options = {}) {
    const {
        width = 2048,
        height = 2048,
        timeout = 60000,
        debug = false
    } = options;

    let browser;
    let server;
    
    try {
        // Start HTTP server
        console.log('Starting HTTP server...');
        server = await createMapgenServer();
        console.log(`Server running at ${server.url}`);
        
        console.log('Starting headless browser...');
        browser = await puppeteer.launch({
            headless: !debug,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport size
        await page.setViewport({ width, height });
        
        // Enable console logging if debug mode
        if (debug) {
            page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        }

        // Read terrain JSON file
        console.log(`Reading terrain file: ${terrainJsonPath}`);
        const terrainData = JSON.parse(await fs.readFile(terrainJsonPath, 'utf8'));

        // Navigate to the mapgen4 page
        console.log(`Loading mapgen4 from: ${server.url}`);
        
        await page.goto(server.url, {
            waitUntil: 'networkidle0',
            timeout
        });

        // Wait for mapgen4 to be fully loaded
        console.log('Waiting for mapgen4 to initialize...');
        await page.waitForFunction(() => {
            // Check if the canvas element exists and has WebGL context
            const canvas = document.getElementById('mapgen4');
            if (!canvas) return false;
            
            // Check if the main script has loaded by looking for key elements
            const sliders = document.getElementById('sliders');
            if (!sliders || sliders.children.length <= 3) return false;
            
            // Check if we can access the global objects (they might be on window or in modules)
            return (typeof window.render !== 'undefined' || document.querySelector('#sliders h3')) &&
                   (typeof window.Painting !== 'undefined' || canvas.getContext) &&
                   (typeof window.param !== 'undefined' || true) &&
                   (typeof window.generate !== 'undefined' || true);
        }, { timeout });

        // Give it a bit more time to fully initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Inject our terrain import and download logic
        await page.evaluate((terrainData) => {
            return new Promise((resolve, reject) => {
                try {
                    console.log('Importing terrain data...');
                    
                    // Wait for all globals to be available
                    const waitForGlobals = () => {
                        if (typeof window.Painting === 'undefined' ||
                            typeof window.param === 'undefined' ||
                            typeof window.render === 'undefined' ||
                            typeof window.generate === 'undefined') {
                            setTimeout(waitForGlobals, 100);
                            return;
                        }
                        
                        try {
                            // Validate terrain data
                            if (!terrainData.constraints || !terrainData.size || terrainData.size !== window.Painting.size) {
                                throw new Error(`Invalid terrain file format. Expected size: ${window.Painting.size}, got: ${terrainData.size}`);
                            }

                            console.log('Loading terrain constraints...');
                            // Load constraints
                            window.Painting.constraints.set(terrainData.constraints);
                            
                            // Mark as user painted
                            window.Painting.setElevationParam(window.param.elevation);
                            
                            console.log('Generating map...');
                            
                            // Set up completion detection - wait for worker to finish
                            let generationComplete = false;
                            const originalWorkerMessage = window.worker ? window.worker.onmessage : null;
                            
                            if (window.worker) {
                                window.worker.onmessage = function(event) {
                                    // Call original handler
                                    if (originalWorkerMessage) {
                                        originalWorkerMessage.call(this, event);
                                    }
                                    
                                    // Mark as complete
                                    generationComplete = true;
                                    console.log('Map generation complete');
                                };
                            }
                            
                            // Start generation
                            window.generate();
                            
                            // Wait for generation to complete
                            const checkComplete = () => {
                                if (generationComplete || !window.worker) {
                                    console.log('Setting up screenshot...');
                                    
                                    // Set up screenshot callback
                                    window.render.screenshotCallback = () => {
                                        console.log('Screenshot ready');
                                        resolve();
                                    };
                                    
                                    // Trigger screenshot
                                    window.render.updateView(window.param.render);
                                } else {
                                    setTimeout(checkComplete, 100);
                                }
                            };
                            
                            setTimeout(checkComplete, 1000);
                            
                        } catch (error) {
                            console.error('Error in terrain processing:', error);
                            reject(error);
                        }
                    };
                    
                    waitForGlobals();
                    
                } catch (error) {
                    console.error('Error in terrain import:', error);
                    reject(error);
                }
            });
        }, terrainData);

        // Wait for screenshot to be ready
        console.log('Waiting for screenshot...');
        await page.waitForFunction(() => {
            return window.render && window.render.screenshotCanvas &&
                   window.render.screenshotCanvas.width > 0;
        }, { timeout });

        // Give it a moment to ensure the canvas is fully rendered
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the canvas data
        console.log('Extracting PNG data...');
        const pngBuffer = await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                try {
                    if (!window.render || !window.render.screenshotCanvas) {
                        reject(new Error('Screenshot canvas not available'));
                        return;
                    }
                    
                    window.render.screenshotCanvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob from canvas'));
                            return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = () => {
                            const arrayBuffer = reader.result;
                            const uint8Array = new Uint8Array(arrayBuffer);
                            resolve(Array.from(uint8Array));
                        };
                        reader.onerror = () => reject(new Error('Failed to read blob'));
                        reader.readAsArrayBuffer(blob);
                    }, 'image/png');
                } catch (error) {
                    reject(error);
                }
            });
        });

        // Save the PNG file
        console.log(`Saving PNG to: ${outputPath}`);
        await fs.writeFile(outputPath, Buffer.from(pngBuffer));
        
        console.log('✅ PNG download completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
        if (server) {
            server.close();
        }
    }
}

/**
 * Main CLI function
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node cli-import-download.js <terrain.json> [output.png] [--debug]');
        console.log('');
        console.log('Examples:');
        console.log('  node cli-import-download.js terrain.json');
        console.log('  node cli-import-download.js terrain.json custom-map.png');
        console.log('  node cli-import-download.js terrain.json output.png --debug');
        process.exit(1);
    }

    const terrainJsonPath = args[0];
    const outputPath = args[1] || `map-${Date.now()}.png`;
    const debug = args.includes('--debug');

    // Check if terrain file exists
    try {
        await fs.access(terrainJsonPath);
    } catch (error) {
        console.error(`❌ Terrain file not found: ${terrainJsonPath}`);
        process.exit(1);
    }

    // Check if embed.html exists
    const embedPath = path.resolve(__dirname, '..', 'embed.html');
    try {
        await fs.access(embedPath);
    } catch (error) {
        console.error(`❌ embed.html not found at: ${embedPath}`);
        console.error('Make sure you run this script from the mapgen4 directory');
        process.exit(1);
    }

    try {
        await importAndDownloadHeadless(terrainJsonPath, outputPath, { debug });
    } catch (error) {
        console.error('❌ Failed to generate PNG:', error.message);
        process.exit(1);
    }
}

// Export for use as module
export { importAndDownloadHeadless };

// Run as CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
