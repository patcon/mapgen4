import * as fs from 'fs';  
  
// Read and parse the binary file (same as before)  
let pointsData = fs.readFileSync('build/points-5.5.data');  
let data = new Uint16Array(pointsData.buffer);  
  
let numExteriorBoundaryPoints = data[0];  
let numInteriorBoundaryPoints = data[1];   
let numMountainPoints = data[2];  
  
let points = [];  
const MAP_FLOAT_RANGE = [-100, 1100];  
const UINT_RANGE = [0, 65535];  
  
function rescale(value, before, after) {  
    return (value - before[0]) / (before[1] - before[0]) * (after[1] - after[0]) + after[0];  
}  
  
for (let i = 3; i < data.length; i += 2) {  
    let x = rescale(data[i], UINT_RANGE, MAP_FLOAT_RANGE);  
    let y = rescale(data[i+1], UINT_RANGE, MAP_FLOAT_RANGE);  
    points.push([x, y]);  
}  
  
// Create ASCII grid visualization  
const GRID_WIDTH = 80;  
const GRID_HEIGHT = 40;  
  
// Initialize grid with spaces  
let grid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(' '));  
  
// Find coordinate bounds for scaling to terminal  
let minX = Math.min(...points.map(p => p[0]));  
let maxX = Math.max(...points.map(p => p[0]));  
let minY = Math.min(...points.map(p => p[1]));  
let maxY = Math.max(...points.map(p => p[1]));  
  
// Map points to grid positions and assign symbols  
for (let i = 0; i < points.length; i++) {  
    let [x, y] = points[i];  
      
    // Scale coordinates to grid size  
    let gridX = Math.floor((x - minX) / (maxX - minX) * (GRID_WIDTH - 1));  
    let gridY = Math.floor((y - minY) / (maxY - minY) * (GRID_HEIGHT - 1));  
      
    // Determine point type and symbol  
    let symbol;  
    if (i < numExteriorBoundaryPoints) {  
        symbol = '#';  // Exterior boundary  
    } else if (i < numExteriorBoundaryPoints + numInteriorBoundaryPoints) {  
        symbol = '+';  // Interior boundary  
    } else if (i < numExteriorBoundaryPoints + numInteriorBoundaryPoints + numMountainPoints) {  
        symbol = '^';  // Mountain points  
    } else {  
        symbol = '.';  // Other interior points  
    }  
      
    // Place symbol on grid (handle overlaps by priority)  
    if (grid[gridY][gridX] === ' ' ||   
        (symbol === '^' && grid[gridY][gridX] !== '^') ||  
        (symbol === '+' && grid[gridY][gridX] === '.') ||  
        (symbol === '#' && grid[gridY][gridX] === '.')) {  
        grid[gridY][gridX] = symbol;  
    }  
}  
  
// Print the grid  
console.log('\n=== ROGUELIKE POINT VISUALIZATION ===');  
console.log('Legend: # = Exterior boundary, + = Interior boundary, ^ = Mountains, . = Interior');  
console.log('Map bounds:', `X: ${minX.toFixed(1)} to ${maxX.toFixed(1)}, Y: ${minY.toFixed(1)} to ${maxY.toFixed(1)}`);  
console.log();  
  
for (let y = 0; y < GRID_HEIGHT; y++) {  
    console.log(grid[y].join(''));  
}
