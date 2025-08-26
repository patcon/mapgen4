import * as fs from 'fs';  
  
// Read the exported terrain JSON file  
function loadTerrainExport(filename) {  
    const data = fs.readFileSync(filename, 'utf8');  
    return JSON.parse(data);  
}  
  
function createRoguelikeVisualization(terrainData) {  
    const { size, constraints } = terrainData;  
      
    console.log('=== MAPGEN4 TERRAIN VISUALIZATION ===');  
    console.log(`Grid size: ${size}x${size}`);  
    console.log(`Total constraint values: ${constraints.length}`);  
    console.log('Legend: ~ = Deep water, - = Shallow water, . = Coast, + = Land, ^ = High land\n');  
      
    // Create the grid visualization  
    for (let y = 0; y < size; y++) {  
        let row = '';  
        for (let x = 0; x < size; x++) {  
            // Calculate array index using row-major order: p = y * size + x  
            const index = y * size + x;  
            const elevation = constraints[index];  
              
            // Map elevation values to ASCII characters  
            let symbol;  
            if (elevation < -0.5) {  
                symbol = '~';  // Deep water  
            } else if (elevation < -0.1) {  
                symbol = '-';  // Shallow water    
            } else if (elevation < 0.1) {  
                symbol = '.';  // Coast/beach  
            } else if (elevation < 0.5) {  
                symbol = '+';  // Land  
            } else {  
                symbol = '^';  // High land/mountains  
            }  
              
            row += symbol;  
        }  
        console.log(row);  
    }  
      
    // Show statistics  
    console.log('\n=== ELEVATION STATISTICS ===');  
    const minElevation = Math.min(...constraints);  
    const maxElevation = Math.max(...constraints);  
    const avgElevation = constraints.reduce((sum, val) => sum + val, 0) / constraints.length;  
      
    console.log(`Min elevation: ${minElevation.toFixed(3)}`);  
    console.log(`Max elevation: ${maxElevation.toFixed(3)}`);  
    console.log(`Average elevation: ${avgElevation.toFixed(3)}`);  
      
    // Count terrain types  
    const counts = { water: 0, shallow: 0, coast: 0, land: 0, mountains: 0 };  
    constraints.forEach(e => {  
        if (e < -0.5) counts.water++;  
        else if (e < -0.1) counts.shallow++;  
        else if (e < 0.1) counts.coast++;  
        else if (e < 0.5) counts.land++;  
        else counts.mountains++;  
    });  
      
    console.log('\n=== TERRAIN DISTRIBUTION ===');  
    console.log(`Deep water (~): ${counts.water} cells (${(counts.water/constraints.length*100).toFixed(1)}%)`);  
    console.log(`Shallow water (-): ${counts.shallow} cells (${(counts.shallow/constraints.length*100).toFixed(1)}%)`);  
    console.log(`Coast (.): ${counts.coast} cells (${(counts.coast/constraints.length*100).toFixed(1)}%)`);  
    console.log(`Land (+): ${counts.land} cells (${(counts.land/constraints.length*100).toFixed(1)}%)`);  
    console.log(`Mountains (^): ${counts.mountains} cells (${(counts.mountains/constraints.length*100).toFixed(1)}%)`);  
}  
  
// Usage  
if (process.argv.length < 3) {  
    console.log('Usage: node terrain-visualizer.js <terrain-export.json>');  
    process.exit(1);  
}  
  
const filename = process.argv[2];  
try {  
    const terrainData = loadTerrainExport(filename);  
    createRoguelikeVisualization(terrainData);  
} catch (error) {  
    console.error('Error reading terrain file:', error.message);  
    process.exit(1);  
}
