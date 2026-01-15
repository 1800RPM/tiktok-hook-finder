
const slides = [
    "The BPD truth your therapist won't say out loud",
    "You're not 'too sensitive.' You're under-regulated. Your nervous system never learned to return to baseline because it was always waiting for the next threat.",
    "That person you can't stop thinking about? You're not in love. You're in withdrawal. Your brain got addicted to the chaos and now calm feels like rejection.",
    "\"Healing\" isn't feeling less. It's feeling everything AND choosing what you do next. That gap between emotion and action? That's the whole game.",
    "I didn't get this until I started tracking my episodes on DBT-Mind. Seeing my triggers mapped out over weeks finally showed me the pattern I was too deep in to notice.",
    "You're not broken. You're just running survival software that's outdated. Time to update. 💜"
];

const response = await fetch('http://localhost:3001/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        slides: slides,
        framework_type: "Forbidden Knowledge"
    })
});
const data = await response.json();
console.log("--- TEST 1: Forbidden Knowledge + Slides ---");
console.log(JSON.stringify(data, null, 2));

const response2 = await fetch('http://localhost:3001/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        slides: slides,
        framework_type: "Pattern Interrupt"
    })
});
const data2 = await response2.json();
console.log("\n--- TEST 2: Pattern Interrupt + Slides ---");
console.log(JSON.stringify(data2, null, 2));
