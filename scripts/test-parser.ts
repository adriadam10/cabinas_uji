import { parseCabins } from '../src/lib/pdf-parser';

async function test() {
    console.log("Starting PDF Parse Test...");
    const cabins = await parseCabins();
    console.log(`Found ${cabins.length} cabins.`);
    if (cabins.length > 0) {
        console.log("First 5 cabins:");
        console.log(cabins.slice(0, 5));
        console.log("Last 5 cabins:");
        console.log(cabins.slice(-5));
    } else {
        console.log("No cabins found. Check logic.");
    }
}

test();
