/**
 * Test script for semantic search integration
 */

const API_URL = "http://localhost:3001";

async function testSemanticSearch() {
    console.log("🧪 Testing Semantic Hook Search\n");
    console.log("================================\n");

    // Test 1: Simple topic-based hook generation
    console.log("📝 Test 1: Generating hooks for 'emotional manipulation signs'...\n");

    try {
        const response = await fetch(`${API_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: "signs of emotional manipulation in relationships",
                archetype: "The Warning / Signs"
            })
        });

        const result = await response.json();

        if (result.error) {
            console.log("❌ Error:", result.error);
            console.log("   Details:", result.details);
        } else {
            console.log("✅ Generated Hooks:");
            result.hooks?.forEach((hook: string, i: number) => {
                console.log(`   ${i + 1}. "${hook}"`);
            });
        }
    } catch (e) {
        console.error("❌ Request failed:", e);
    }

    console.log("\n================================\n");

    // Test 2: Slide-context based generation
    console.log("📝 Test 2: Generating hooks with slide context...\n");

    try {
        const response = await fetch(`${API_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic_hint: "BPD and relationships",
                slides: [
                    "People with BPD often struggle with intense fear of abandonment",
                    "Small triggers can cause emotional dysregulation",
                    "DBT skills can help manage these intense emotions",
                    "Healing is possible with the right support"
                ]
            })
        });

        const result = await response.json();

        if (result.error) {
            console.log("❌ Error:", result.error);
            console.log("   Details:", result.details);
        } else {
            console.log("✅ Generated Hooks:");
            result.hooks?.forEach((hook: string, i: number) => {
                console.log(`   ${i + 1}. "${hook}"`);
            });
        }
    } catch (e) {
        console.error("❌ Request failed:", e);
    }
}

testSemanticSearch();
