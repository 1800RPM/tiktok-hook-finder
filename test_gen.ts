
const response = await fetch('http://localhost:3001/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        topic: "BPD truth",
        archetype: "The Emotional Vent"
    })
});
const data = await response.json();
console.log(JSON.stringify(data, null, 2));
