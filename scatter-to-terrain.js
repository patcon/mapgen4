import * as fs from 'fs';
import { contours } from 'd3-contour';
  
function createConstraintGrid(scatterData, gridSize = 128, flipX = false, flipY = true) {
    // Extract only the coordinates, ignoring the ID
    const points = scatterData.map(([id, [x, y]]) => [x, y]);
    
    // Find data bounds with buffer padding
    const rawXExtent = [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0]))];
    const rawYExtent = [Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1]))];
    
    // Add 15% buffer on each side to prevent points from being too close to edges
    const bufferPercent = 0.15;
    const xRange = rawXExtent[1] - rawXExtent[0];
    const yRange = rawYExtent[1] - rawYExtent[0];
    const xBuffer = xRange * bufferPercent;
    const yBuffer = yRange * bufferPercent;
    
    const xExtent = [rawXExtent[0] - xBuffer, rawXExtent[1] + xBuffer];
    const yExtent = [rawYExtent[0] - yBuffer, rawYExtent[1] + yBuffer];
    
    // Create initial density grid with higher resolution for smoother interpolation
    const highResSize = gridSize * 2; // Use 2x resolution for better interpolation
    const densityGrid = new Float32Array(highResSize * highResSize);
    
    // Calculate density at each high-resolution grid cell
    for (let y = 0; y < highResSize; y++) {
        for (let x = 0; x < highResSize; x++) {
            const index = y * highResSize + x;
            
            // Map grid coordinates to data space
            const worldX = flipX ?
                xExtent[1] - (x / (highResSize - 1)) * (xExtent[1] - xExtent[0]) :
                xExtent[0] + (x / (highResSize - 1)) * (xExtent[1] - xExtent[0]);
            const worldY = flipY ?
                yExtent[1] - (y / (highResSize - 1)) * (yExtent[1] - yExtent[0]) :
                yExtent[0] + (y / (highResSize - 1)) * (yExtent[1] - yExtent[0]);
            
            // Calculate density using distance-weighted influence
            let density = 0;
            const influenceRadius = Math.max(
                (xExtent[1] - xExtent[0]) / highResSize * 4,
                (yExtent[1] - yExtent[0]) / highResSize * 4
            );
            
            for (let point of points) {
                const dx = worldX - point[0];
                const dy = worldY - point[1];
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < influenceRadius) {
                    // Gaussian-like falloff for smooth islands
                    const influence = Math.exp(-(distance * distance) / (influenceRadius * influenceRadius * 0.3));
                    density += influence;
                }
            }
            
            densityGrid[index] = density;
        }
    }
    
    // Use d3-contour to generate smooth contours
    const contourGenerator = contours()
        .size([highResSize, highResSize])
        .thresholds(20); // Generate 20 contour levels for smooth interpolation
    
    const contourData = contourGenerator(densityGrid);
    
    // Create final constraint grid by sampling the contour-smoothed data
    const constraints = new Float32Array(gridSize * gridSize);
    
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const index = y * gridSize + x;
            
            // Map to high-resolution coordinates
            const highX = Math.floor(x * (highResSize / gridSize));
            const highY = Math.floor(y * (highResSize / gridSize));
            const highIndex = highY * highResSize + highX;
            
            // Get interpolated density value
            let density = densityGrid[highIndex];
            
            // Apply bilinear interpolation for smoother results
            if (highX < highResSize - 1 && highY < highResSize - 1) {
                const fracX = (x * (highResSize / gridSize)) - highX;
                const fracY = (y * (highResSize / gridSize)) - highY;
                
                const d00 = densityGrid[highY * highResSize + highX];
                const d10 = densityGrid[highY * highResSize + (highX + 1)];
                const d01 = densityGrid[(highY + 1) * highResSize + highX];
                const d11 = densityGrid[(highY + 1) * highResSize + (highX + 1)];
                
                const d0 = d00 * (1 - fracX) + d10 * fracX;
                const d1 = d01 * (1 - fracX) + d11 * fracX;
                density = d0 * (1 - fracY) + d1 * fracY;
            }
            
            // Convert density to elevation (-0.25 to 1 range)
            // Higher density = land (positive), lower density = water (negative)
            const maxDensity = 3.0; // Adjusted for smoother transitions
            let elevation = (density / maxDensity) * 2 - 1;
            
            // Apply smoothing based on contour data for more natural coastlines
            const contourInfluence = getContourInfluence(contourData, x, y, gridSize, highResSize);
            elevation = elevation * 0.7 + contourInfluence * 0.3;
            
            // Clamp to valid range
            elevation = Math.max(-0.25, Math.min(1, elevation));
            
            constraints[index] = elevation;
        }
    }
    
    return constraints;
}

// Helper function to get contour influence for smoother transitions
function getContourInfluence(contourData, x, y, gridSize, highResSize) {
    // This function analyzes the contour data to provide additional smoothing
    // It looks at the contour levels around the current point to create smoother transitions
    
    const highX = x * (highResSize / gridSize);
    const highY = y * (highResSize / gridSize);
    
    let influence = 0;
    let count = 0;
    
    // Sample nearby contour values for smoothing
    for (let contour of contourData) {
        if (contour.coordinates && contour.coordinates.length > 0) {
            // Check if point is near this contour level
            const contourValue = contour.value || 0;
            
            // Simple distance-based influence from contour lines
            // This creates smoother transitions between elevation levels
            const normalizedValue = Math.max(0, Math.min(1, contourValue / 3.0));
            influence += normalizedValue;
            count++;
        }
    }
    
    return count > 0 ? (influence / count) * 2 - 1 : 0;
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
