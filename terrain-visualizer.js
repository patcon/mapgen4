import * as fs from 'fs';  
  
// Read the exported terrain JSON file  
function loadTerrainExport(filename) {  
    const data = fs.readFileSync(filename, 'utf8');  
    return JSON.parse(data);  
}  
  
function createRoguelikeVisualization(terrainData, compressed = true) {  
    const { size, constraints } = terrainData;  
      
    console.log('=== MAPGEN4 TERRAIN VISUALIZATION ===');  
    console.log(`Grid size: ${size}x${size}${compressed ? ' (compressed 2:1)' : ''}`);  
    console.log(`Total constraint values: ${constraints.length}`);  
    console.log('Legend: ~ = Deep water, - = Shallow water, . = Coast, + = Land, ^ = High land\n');  
      
    const displayHeight = compressed ? Math.floor(size / 2) : size;  
      
    // Create the grid visualization  
    for (let displayY = 0; displayY < displayHeight; displayY++) {  
        let row = '';  
        for (let x = 0; x < size; x++) {  
            let elevation;  
              
            if (compressed) {  
                // Average two rows together  
                const y1 = displayY * 2;  
                const y2 = Math.min(displayY * 2 + 1, size - 1);  
                const index1 = y1 * size + x;  
                const index2 = y2 * size + x;  
                elevation = (constraints[index1] + constraints[index2]) / 2;  
            } else {  
                // Use single row  
                const index = displayY * size + x;  
                elevation = constraints[index];  
            }  
              
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
      
    // Show statistics (unchanged)  
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
  
// Parse command line arguments  
function parseArgs() {  
    const args = process.argv.slice(2);  
    let filename = null;  
    let compressed = true; // Default to compressed  
      
    for (let i = 0; i < args.length; i++) {  
        if (args[i] === '--no-compress' || args[i] === '-n') {  
            compressed = false;  
        } else if (args[i] === '--compress' || args[i] === '-c') {  
            compressed = true;  
        } else if (!filename) {  
            filename = args[i];  
        }  
    }  
      
    return { filename, compressed };  
}  
  
// Usage  
const { filename, compressed } = parseArgs();  
  
if (!filename) {  
    console.log('Usage: node terrain-visualizer.js <terrain-export.json> [--no-compress|-n] [--compress|-c]');  
    console.log('  --compress, -c     Compress 2 rows into 1 (default)');  
    console.log('  --no-compress, -n  Show full resolution');  
    process.exit(1);  
}  
  
try {  
    const terrainData = loadTerrainExport(filename);  
    createRoguelikeVisualization(terrainData, compressed);  
} catch (error) {  
    console.error('Error reading terrain file:', error.message);  
    process.exit(1);  
}
