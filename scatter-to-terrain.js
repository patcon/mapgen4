import * as fs from 'fs';  
  
function createConstraintGrid(scatterData, gridSize = 128) {  
    // Extract only the coordinates, ignoring the ID  
    const points = scatterData.map(([id, [x, y]]) => [x, y]);  
      
    // Find data bounds  
    const xExtent = [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0]))];  
    const yExtent = [Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1]))];  
      
    // Create constraint grid based on point density  
    const constraints = new Float32Array(gridSize * gridSize);  
      
    // Calculate density at each grid cell  
    for (let y = 0; y < gridSize; y++) {  
        for (let x = 0; x < gridSize; x++) {  
            const index = y * gridSize + x;  
              
            // Map grid coordinates to data space  
            const worldX = xExtent[0] + (x / (gridSize - 1)) * (xExtent[1] - xExtent[0]);  
            const worldY = yExtent[0] + (y / (gridSize - 1)) * (yExtent[1] - yExtent[0]);  
              
            // Calculate density using distance-weighted influence  
            let density = 0;  
            const influenceRadius = Math.max(  
                (xExtent[1] - xExtent[0]) / gridSize * 3,  
                (yExtent[1] - yExtent[0]) / gridSize * 3  
            );  
              
            for (let point of points) {  
                const dx = worldX - point[0];  
                const dy = worldY - point[1];  
                const distance = Math.sqrt(dx * dx + dy * dy);  
                  
                if (distance < influenceRadius) {  
                    // Gaussian-like falloff for smooth islands  
                    const influence = Math.exp(-(distance * distance) / (influenceRadius * influenceRadius * 0.5));  
                    density += influence;  
                }  
            }  
              
            // Convert density to elevation (-0.25 to 1 range)  
            // Higher density = land (positive), lower density = water (negative)  
            const maxDensity = 5.0; // Adjust this to control island size  
            let elevation = (density / maxDensity) * 2 - 1;  
              
            // Clamp to valid range  
            elevation = Math.max(-0.25, Math.min(1, elevation));  
              
            constraints[index] = elevation;  
        }  
    }  
      
    return constraints;  
}  
  
function exportTerrainData(constraints, seed = 12345, island = 0.5) {  
    return {  
        size: 128,  
        constraints: Array.from(constraints),  
        seed: seed,  
        island: island,  
        userHasPainted: true  
    };  
}  
  
// Main function  
function processScatterData(inputFile, outputFile) {  
    try {  
        // Read input scatter data  
        const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));  
          
        console.log(`Processing ${inputData.length} points...`);  
          
        // Generate constraint grid from point density  
        const constraints = createConstraintGrid(inputData);  
          
        // Create MapGen4 export format  
        const terrainData = exportTerrainData(constraints);  
          
        // Write output  
        fs.writeFileSync(outputFile, JSON.stringify(terrainData, null, 2));  
          
        console.log(`Successfully converted ${inputData.length} points to 128x128 grid`);  
        console.log(`Output written to ${outputFile}`);  
          
        // Show some statistics  
        const landCells = constraints.filter(c => c > 0).length;  
        const waterCells = constraints.filter(c => c <= 0).length;  
        console.log(`Land cells: ${landCells} (${(landCells/constraints.length*100).toFixed(1)}%)`);  
        console.log(`Water cells: ${waterCells} (${(waterCells/constraints.length*100).toFixed(1)}%)`);  
          
    } catch (error) {  
        console.error('Error processing data:', error.message);  
        process.exit(1);  
    }  
}  
  
// Usage  
if (process.argv.length < 4) {  
    console.log('Usage: node scatter-to-terrain.js <input.json> <output.json>');  
    console.log('Input format: [[id, [x, y]], [id, [x, y]], ...]');  
    process.exit(1);  
}  
  
const inputFile = process.argv[2];  
const outputFile = process.argv[3];  
processScatterData(inputFile, outputFile);
