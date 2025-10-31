// utils/colors.js
export function getUserColor(userId) {
  const colors = [
    "bg-blue-400 text-white",
    "bg-green-400 text-white",
    "bg-purple-400 text-white",
    "bg-pink-400 text-white",
    "bg-yellow-400 text-gray-800",
    "bg-teal-400 text-white",
    "bg-indigo-400 text-white",
  ];
  const index = userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}
