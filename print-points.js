import * as fs from 'fs';  
  
// Read the binary file  
let pointsData = fs.readFileSync('build/points-5.5.data');  
let data = new Uint16Array(pointsData.buffer);  
  
// Parse the header (first 3 uint16 values)  
let numExteriorBoundaryPoints = data[0];  
let numInteriorBoundaryPoints = data[1];   
let numMountainPoints = data[2];  
  
// Parse the points (remaining data as x,y pairs)  
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
  
// Output detailed information  
console.log('=== POINT FILE ANALYSIS ===');  
console.log(`Total points: ${points.length}`);  
console.log(`Exterior boundary points: ${numExteriorBoundaryPoints}`);  
console.log(`Interior boundary points: ${numInteriorBoundaryPoints}`);  
console.log(`Mountain points: ${numMountainPoints}`);  
console.log(`Other interior points: ${points.length - numExteriorBoundaryPoints - numInteriorBoundaryPoints - numMountainPoints}`);  
  
// Show sample points from each category  
console.log('\n=== EXTERIOR BOUNDARY POINTS (first 10) ===');  
for (let i = 0; i < Math.min(10, numExteriorBoundaryPoints); i++) {  
    console.log(`Point ${i}: [${points[i][0].toFixed(2)}, ${points[i][1].toFixed(2)}]`);  
}  
  
console.log('\n=== INTERIOR BOUNDARY POINTS (first 10) ===');  
let interiorStart = numExteriorBoundaryPoints;  
for (let i = 0; i < Math.min(10, numInteriorBoundaryPoints); i++) {  
    let idx = interiorStart + i;  
    console.log(`Point ${idx}: [${points[idx][0].toFixed(2)}, ${points[idx][1].toFixed(2)}]`);  
}  
  
console.log('\n=== MOUNTAIN POINTS (first 10) ===');  
let mountainStart = numExteriorBoundaryPoints + numInteriorBoundaryPoints;  
for (let i = 0; i < Math.min(10, numMountainPoints); i++) {  
    let idx = mountainStart + i;  
    console.log(`Point ${idx}: [${points[idx][0].toFixed(2)}, ${points[idx][1].toFixed(2)}]`);  
}  
  
console.log('\n=== OTHER INTERIOR POINTS (first 10) ===');  
let otherStart = numExteriorBoundaryPoints + numInteriorBoundaryPoints + numMountainPoints;  
let numOtherPoints = points.length - otherStart;  
for (let i = 0; i < Math.min(10, numOtherPoints); i++) {  
    let idx = otherStart + i;  
    console.log(`Point ${idx}: [${points[idx][0].toFixed(2)}, ${points[idx][1].toFixed(2)}]`);  
}  
  
// Show coordinate ranges  
console.log('\n=== COORDINATE RANGES ===');  
let minX = Math.min(...points.map(p => p[0]));  
let maxX = Math.max(...points.map(p => p[0]));  
let minY = Math.min(...points.map(p => p[1]));  
let maxY = Math.max(...points.map(p => p[1]));  
console.log(`X range: ${minX.toFixed(2)} to ${maxX.toFixed(2)}`);  
console.log(`Y range: ${minY.toFixed(2)} to ${maxY.toFixed(2)}`);
