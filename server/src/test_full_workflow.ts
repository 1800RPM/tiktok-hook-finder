const API_URL = "http://localhost:3001/generate-full";

async function testFullWorkflow() {
    console.log("🚀 Testing Full Carousel Workflow...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferred_topic: "Splitting" })
        });

        const rawText = await response.text();

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error("❌ FAILED TO PARSE JSON. RAW TEXT:");
            console.log(rawText);
            return;
        }

        console.log("\n✅ WORKFLOW SUCCESSFUL");
        console.log("-----------------------------------");
        console.log(`📌 TOPIC: ${data.topic}`);
        console.log(`📐 ANGLE: ${data.angle}`);

        console.log("\n📄 SLIDES (2-6):");
        if (Array.isArray(data.slides)) {
            data.slides.forEach((s: string, i: number) => console.log(`Slide ${i + 2}: ${s}`));
        } else {
            console.log("Invalid slides format:", data.slides);
        }

        console.log("\n🪝 VIRAL HOOKS (Slide 1):");
        if (Array.isArray(data.hooks)) {
            data.hooks.forEach((h: string, i: number) => console.log(`${i + 1}. ${h}`));
        } else {
            console.log("Invalid hooks format:", data.hooks);
        }
        console.log("-----------------------------------");

    } catch (err) {
        console.error("❌ Network/Request Failed:", err);
    }
}

testFullWorkflow();
