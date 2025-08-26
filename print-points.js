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
  
console.log('Points loaded:', points.length);  
console.log('Exterior boundary points:', numExteriorBoundaryPoints);  
console.log('Interior boundary points:', numInteriorBoundaryPoints);  
console.log('Mountain points:', numMountainPoints);
