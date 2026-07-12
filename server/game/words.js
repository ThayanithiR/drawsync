// List of words for drawing challenges
const words = [
  "apple",
  "car",
  "dog",
  "house",
  "phone",
  "tree",
  "book",
  "cat",
  "sun",
  "moon",
  "star",
  "guitar",
  "pizza",
  "beach",
  "mountain",
  "flower",
  "bird",
  "fish",
  "rainbow",
  "cloud"
];

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

module.exports = { words, getRandomWord };
