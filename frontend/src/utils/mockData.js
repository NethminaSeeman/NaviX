import sigiriyaImage from "@/assets/destinations/sigiriya.png";
import ellaImage from "@/assets/destinations/ella.png";
import galleImage from "@/assets/destinations/galle.png";
import kandyImage from "@/assets/destinations/kandy.png";
import nuwaraEliyaImage from "@/assets/destinations/nuwara-eliya.png";

/**
 * Flagship featured trio for the home / Journey Map (matches hero storytelling).
 * Additional entries in `destinationArchive` support detail fallbacks when the API is offline.
 */
export const featuredDestinations = [
  {
    id: "sigiriya",
    name: "Sigiriya Rock Fortress",
    district: "Matale",
    category: "Heritage",
    image: sigiriyaImage,
    duration: "2-3 hours",
    history:
      "An ancient rock fortress built by King Kashyapa in the 5th century with frescoes and landscaped gardens.",
    immersiveBlurb:
      "Climb through lion gates into a sky-palace where frescoes still glow — Sri Lanka’s most dramatic sunrise perch.",
    tips: ["Start early to avoid heat", "Wear shoes with grip", "Carry water above the staircases"],
    itinerary: [
      "Arrive at opening for golden light on the water gardens",
      "Pause at the mirror wall before the vertical climb",
      "Summit the palace plateau and loop the boulder perimeter",
      "Optional: sunset ridge at nearby Pidurangala",
    ],
    coordinates: { lat: 7.957, lng: 80.7603 },
  },
  {
    id: "ella",
    name: "Ella Scenic Highlands",
    district: "Badulla",
    category: "Nature",
    image: ellaImage,
    duration: "Full day",
    history:
      "Ella is known for tea estates, colonial-era rail heritage, and panoramic viewpoints.",
    immersiveBlurb:
      "Ride the hill-country rails through mist, tea, and tunnels — Ella feels like Sri Lanka in high definition.",
    tips: ["Carry a light jacket", "Book train seats in advance", "Walk Little Adam’s Peak near sunset"],
    itinerary: [
      "Morning: Nine Arches Bridge between mist breaks",
      "Midday: Ella town & local lunch",
      "Afternoon: Little Adam’s Peak ridge walk",
      "Late ride: iconic train leg if scheduled",
    ],
    coordinates: { lat: 6.8667, lng: 81.0466 },
  },
  {
    id: "galle",
    name: "Galle Fort",
    district: "Southern Province",
    category: "Coastal Heritage",
    image: galleImage,
    duration: "3-4 hours",
    history:
      "A UNESCO World Heritage fort city with Portuguese and Dutch-era architecture.",
    immersiveBlurb:
      "Stroll ramparts where spice ships once anchored — tropic light, cobblestones, and sea wind in one walk.",
    tips: ["Visit by sunset on the walls", "Try local seafood nearby", "Explore boutique lanes at golden hour"],
    itinerary: [
      "Rampart walk with lighthouse and ocean breezes",
      "Dutch Reformed Church & boutique lanes",
      "Sunset from the western bastion",
      "Evening seafood on the coast road",
    ],
    coordinates: { lat: 6.0329, lng: 80.2168 },
  },
];

/** Supplemental static rows for `/destination/:id` when API data is unavailable. */
export const destinationArchive = [
  ...featuredDestinations,
  {
    id: "kandy",
    name: "Temple of the Sacred Tooth Relic",
    district: "Kandy",
    category: "Cultural",
    image: kandyImage,
    duration: "2 hours",
    history:
      "One of Sri Lanka's most sacred Buddhist temples and a cornerstone of Kandyan royal history.",
    tips: ["Wear modest clothing", "Visit in the evening for rituals"],
    coordinates: { lat: 7.2936, lng: 80.6413 },
  },
  {
    id: "nuwara-eliya",
    name: "Nuwara Eliya Tea Country",
    district: "Nuwara Eliya",
    category: "Hill Country",
    image: nuwaraEliyaImage,
    duration: "Full day",
    history:
      "A cool-climate highland town shaped by tea plantations and colonial architecture.",
    tips: ["Carry a warm layer", "Start early for tea estate tours"],
    coordinates: { lat: 6.9497, lng: 80.7891 },
  },
];

export const socialLinks = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "YouTube", href: "https://youtube.com" },
];
