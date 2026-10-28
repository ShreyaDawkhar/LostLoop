/**
 * LostLoop - Campus Data Constants and Realistic Fictional Demo Dataset
 * Designed for campus life (college students, staff, campus facilities)
 * Multi-College Directory & Scalable Campus Metadata
 */

/**
 * Standard College Directory
 * Structured catalog of supported institutions and campuses.
 * Distinct IDs prevent collisions between universities sharing similar names or multi-campus systems.
 */
const COLLEGES_DIRECTORY = [
  {
    id: "col-jspm-wagholi",
    name: "JSPM University",
    shortCode: "JSPM",
    campus: "Wagholi Campus",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    address: "Pune-Nagar Road, Wagholi, Pune 412207",
    badge: "Active Campus",
    isActive: true,
    isDemo: true,
    zones: [
      "Central Library (Ground & 1st Floor)",
      "Central Library (Quiet Study / Reading Hall)",
      "Main Auditorium & Amphitheatre",
      "Engineering Block A (Computer Labs)",
      "Engineering Block B (Mechanical & Civil)",
      "Student Canteen & Food Court",
      "Sports Complex & Gymnasium",
      "Hostel Quad (Boys/Girls Hostels)",
      "Campus Bus Terminal & Gate 1 Parking",
      "Administrative Building & Admissions Desk"
    ]
  },
  {
    id: "col-jspm-tathawade",
    name: "JSPM Rajarshi Shahu College of Engineering",
    shortCode: "JSPM RSCOE",
    campus: "Tathawade Campus",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    address: "Tathawade, Pimpri-Chinchwad, Pune 411033",
    badge: "Active Campus",
    isActive: true,
    isDemo: true,
    zones: [
      "Main Library",
      "Computer Science Department",
      "Central Canteen",
      "Workshop & Mechanical Labs",
      "Seminar Hall B",
      "Parking Lot near Gate 2"
    ]
  },
  {
    id: "col-coep-pune",
    name: "COEP Technological University",
    shortCode: "COEP",
    campus: "Shivajinagar Campus",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    address: "Wellesley Rd, Shivajinagar, Pune 411005",
    badge: "Active Campus",
    isActive: true,
    isDemo: true,
    zones: [
      "Heritage Main Building",
      "Central Library & Study Center",
      "Boat Club & Riverside Walk",
      "MindSpark Tech Arena",
      "Hostel Grounds",
      "Mechanical & Metallurgy Lab Complex"
    ]
  },
  {
    id: "col-iit-bombay",
    name: "IIT Bombay",
    shortCode: "IITB",
    campus: "Powai Campus",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    address: "Powai, Mumbai 400076",
    badge: "Active Campus",
    isActive: true,
    isDemo: true,
    zones: [
      "Central Library",
      "Student Activity Center (SAC)",
      "Hostel 12-14 Complex",
      "Gymkhana Grounds",
      "Main Building & Convocation Hall",
      "Department of Computer Science (KReSIT)"
    ]
  },
  {
    id: "col-bits-goa",
    name: "BITS Pilani — K K Birla Goa Campus",
    shortCode: "BITS Goa",
    campus: "Goa Campus",
    city: "Sancoale",
    state: "Goa",
    country: "India",
    address: "NH 17B, Bypass Road, Zuarinagar, Sancoale, Goa 403726",
    badge: "Active Campus",
    isActive: true,
    isDemo: true,
    zones: [
      "Library Complex",
      "Student Activity Centre (SAC)",
      "B-Dome Auditorium",
      "Cafeteria & Food Street",
      "Hostel Blocks (DH1 - DH4)",
      "Cricket Ground & Pavilion"
    ]
  },
  {
    id: "col-du-north",
    name: "University of Delhi",
    shortCode: "DU",
    campus: "North Campus",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    address: "University Enclave, New Delhi 110007",
    badge: "Active Campus",
    isActive: true,
    isDemo: true,
    zones: [
      "Central Arts Library",
      "Arts Faculty Quad",
      "University Stadium & Complex",
      "VC Office & Ridge Area",
      "Metro Station Transit Gate",
      "North Campus Canteen Hub"
    ]
  },
  {
    id: "col-mit-wpu",
    name: "MIT World Peace University",
    shortCode: "MIT-WPU",
    campus: "Kothrud Campus",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    address: "Paud Rd, Kothrud, Pune 411038",
    badge: "Coming Soon",
    isActive: false, // Sample inactive campus to test inactive selection safeguards
    isDemo: true,
    zones: [
      "Peace Dome",
      "Central Library",
      "Engineering Building",
      "Cafeteria"
    ]
  }
];

// College Directory Helper Functions
function getCollegesDirectory() {
  return COLLEGES_DIRECTORY;
}

function getCollegeById(collegeId) {
  if (!collegeId) return null;
  return COLLEGES_DIRECTORY.find(c => c.id === collegeId) || null;
}

function searchColleges(query = "") {
  const q = String(query).trim().toLowerCase();
  if (!q) {
    return COLLEGES_DIRECTORY.filter(c => c.isActive);
  }
  return COLLEGES_DIRECTORY.filter(c => {
    const matchName = c.name.toLowerCase().includes(q);
    const matchShort = c.shortCode && c.shortCode.toLowerCase().includes(q);
    const matchCampus = c.campus && c.campus.toLowerCase().includes(q);
    const matchCity = c.city && c.city.toLowerCase().includes(q);
    const matchState = c.state && c.state.toLowerCase().includes(q);
    return matchName || matchShort || matchCampus || matchCity || matchState;
  });
}

function addCollegeToDirectory(collegeData) {
  if (!collegeData || !collegeData.id || !collegeData.name) {
    return { success: false, error: "College must contain at least a valid 'id' and 'name'." };
  }
  if (COLLEGES_DIRECTORY.some(c => c.id === collegeData.id)) {
    return { success: false, error: `College with ID "${collegeData.id}" already exists.` };
  }
  const newCollege = {
    id: collegeData.id,
    name: collegeData.name.trim(),
    shortCode: collegeData.shortCode || "",
    campus: collegeData.campus || "Main Campus",
    city: collegeData.city || "Campus City",
    state: collegeData.state || "State",
    country: collegeData.country || "India",
    address: collegeData.address || "",
    badge: collegeData.badge || "New Campus",
    isActive: collegeData.isActive !== false,
    isDemo: true,
    zones: Array.isArray(collegeData.zones) && collegeData.zones.length > 0 
      ? collegeData.zones 
      : [...CAMPUS_LOCATIONS]
  };
  COLLEGES_DIRECTORY.push(newCollege);
  return { success: true, college: newCollege };
}

const CAMPUS_LOCATIONS = [
  "Main Library (1st/2nd Floor)",
  "Main Library (Quiet Study / 3rd Floor)",
  "Student Union / Dining Hall",
  "Science & Engineering Hall",
  "Campus Recreation Center / Gym",
  "North Quad & Campus Lawn",
  "Bus Terminal & Transit Hub",
  "University Computer Lab (B10)",
  "Arts & Humanities Building",
  "West Parking Garage"
];

const ITEM_CATEGORIES = [
  "Electronics & Tech",
  "Bottles & Tumblers",
  "IDs & Campus Cards",
  "Keys & Lanyards",
  "Backpacks & Bags",
  "Books & Notebooks",
  "Clothing & Outerwear",
  "Eyewear & Accessories"
];

const INITIAL_DEMO_ITEMS = [
  {
    id: "item-demo-1",
    reportId: "LL-LST-1001",
    type: "lost",
    title: "Sony WH-1000XM4 Noise-Cancelling Headphones",
    category: "Electronics & Tech",
    locationZone: "Main Library (Quiet Study / 3rd Floor)",
    locationDetail: "Left at the individual carrels near east window row",
    date: "2026-10-25",
    description: "Silver/gray Sony over-ear headphones inside the original gray zipper travel case. Headband has a tiny scratch on the left pivot.",
    primaryColor: "Silver / Gray",
    brand: "Sony",
    status: "active",
    trackingStatus: "searching",
    createdAt: 1761400000000,
    lastUpdated: 1761400060000,
    reporter: {
      name: "Marcus K.",
      maskedContact: "m.k***@campus.edu",
      role: "Student (Junior)"
    },
    verificationQuestion: "What small scratch is on the pivot, and what cable is inside the mesh pocket of the case?",
    timelineEvents: [
      {
        id: "evt-1-1",
        stageCode: "created",
        title: "Report Created",
        description: "Lost report registered for Sony WH-1000XM4 headphones.",
        timestamp: 1761400000000,
        actor: "Marcus K."
      },
      {
        id: "evt-1-2",
        stageCode: "searching",
        title: "Searching for Matches",
        description: "System actively cross-referencing found items across Main Library zones.",
        timestamp: 1761400060000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-2",
    reportId: "LL-FND-1002",
    type: "found",
    title: "Gray Sony Over-Ear Headphones in Zip Case",
    category: "Electronics & Tech",
    locationZone: "Main Library (Quiet Study / 3rd Floor)",
    locationDetail: "Under study desk #34 during evening facility sweep",
    date: "2026-10-26",
    description: "Light gray Sony headphones inside matching rigid zippered case. Found plugged-in audio cable inside.",
    primaryColor: "Gray",
    brand: "Sony",
    status: "active",
    trackingStatus: "published",
    createdAt: 1761486400000,
    lastUpdated: 1761486460000,
    reporter: {
      name: "Library Staff Desk",
      maskedContact: "lib-staff***@campus.edu",
      role: "Campus Staff"
    },
    verificationQuestion: "To verify ownership, describe any unique physical mark or what accessory is stored inside the case mesh pocket.",
    timelineEvents: [
      {
        id: "evt-2-1",
        stageCode: "reported",
        title: "Found Item Reported",
        description: "Gray Sony headphones logged by Library Staff Desk.",
        timestamp: 1761486400000,
        actor: "Library Staff Desk"
      },
      {
        id: "evt-2-2",
        stageCode: "published",
        title: "Report Published",
        description: "Public listing active with secret verification prompt.",
        timestamp: 1761486460000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-3",
    reportId: "LL-LST-1003",
    type: "lost",
    title: "Navy Blue 32oz Hydro Flask",
    category: "Bottles & Tumblers",
    locationZone: "Student Union / Dining Hall",
    locationDetail: "Booth seating near the pizza station, 1st floor",
    date: "2026-10-24",
    description: "Dark navy Hydro Flask with black flex cap. Noticeable small dent on base ring. Has a holographic NASA sticker and a Golden Retriever puppy sticker.",
    primaryColor: "Navy Blue",
    brand: "Hydro Flask",
    status: "active",
    trackingStatus: "searching",
    createdAt: 1761313600000,
    lastUpdated: 1761313660000,
    reporter: {
      name: "Chloe Chen",
      maskedContact: "c.ch***@campus.edu",
      role: "Student (Sophomore)"
    },
    verificationQuestion: "What specific stickers are adhered to the side?",
    timelineEvents: [
      {
        id: "evt-3-1",
        stageCode: "created",
        title: "Report Created",
        description: "Lost report registered for Navy Blue 32oz Hydro Flask.",
        timestamp: 1761313600000,
        actor: "Chloe Chen"
      },
      {
        id: "evt-3-2",
        stageCode: "searching",
        title: "Searching for Matches",
        description: "Continuous scanning of Student Union and Dining Hall found registries.",
        timestamp: 1761313660000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-4",
    reportId: "LL-FND-1004",
    type: "found",
    title: "Navy Insulated Water Bottle with Stickers",
    category: "Bottles & Tumblers",
    locationZone: "Student Union / Dining Hall",
    locationDetail: "Turned in to Union Information Desk by evening cleaning crew",
    date: "2026-10-25",
    description: "Navy blue metal insulated bottle with stickers on body and small dent near bottom edge.",
    primaryColor: "Navy Blue",
    brand: "Hydro Flask",
    status: "active",
    trackingStatus: "published",
    createdAt: 1761400000000,
    lastUpdated: 1761400060000,
    reporter: {
      name: "Union Desk Attendant",
      maskedContact: "union-front***@campus.edu",
      role: "Student Worker"
    },
    verificationQuestion: "Name at least two distinct stickers on the bottle to claim.",
    timelineEvents: [
      {
        id: "evt-4-1",
        stageCode: "reported",
        title: "Found Item Reported",
        description: "Navy insulated bottle safely logged at Union Information Desk.",
        timestamp: 1761400000000,
        actor: "Union Desk Attendant"
      },
      {
        id: "evt-4-2",
        stageCode: "published",
        title: "Report Published",
        description: "Listing published. Verification question set for ownership proof.",
        timestamp: 1761400060000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-5",
    reportId: "LL-LST-1005",
    type: "lost",
    title: "Subaru Car Key with Purple Lanyard & Cat Charm",
    category: "Keys & Lanyards",
    locationZone: "North Quad & Campus Lawn",
    locationDetail: "Somewhere along the paved path between Science Hall and Lawn picnic tables",
    date: "2026-10-26",
    description: "Single Subaru black electronic key fob attached to a purple paracord braided lanyard with an enamel black cat pin and small gym barcode tag.",
    primaryColor: "Purple / Black",
    brand: "Subaru",
    status: "active",
    trackingStatus: "searching",
    createdAt: 1761486400000,
    lastUpdated: 1761486460000,
    reporter: {
      name: "Maya Patel",
      maskedContact: "m.pat***@campus.edu",
      role: "Student (Senior)"
    },
    verificationQuestion: "What animal is the enamel pin and what color is the lanyard braid?",
    timelineEvents: [
      {
        id: "evt-5-1",
        stageCode: "created",
        title: "Report Created",
        description: "Lost report registered for Subaru electronic key fob.",
        timestamp: 1761486400000,
        actor: "Maya Patel"
      },
      {
        id: "evt-5-2",
        stageCode: "searching",
        title: "Searching for Matches",
        description: "Scanning North Quad and Science Hall found item records.",
        timestamp: 1761486460000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-6",
    reportId: "LL-FND-1006",
    type: "found",
    title: "Car Key with Purple Cord & Animal Pin",
    category: "Keys & Lanyards",
    locationZone: "North Quad & Campus Lawn",
    locationDetail: "Found on grass edge near cherry blossom trees",
    date: "2026-10-26",
    description: "Black car key fob on purple cord with small metallic animal pin and scanner tag.",
    primaryColor: "Purple",
    brand: "Subaru",
    status: "active",
    trackingStatus: "published",
    createdAt: 1761490000000,
    lastUpdated: 1761490060000,
    reporter: {
      name: "Tariq A.",
      maskedContact: "t.ab***@campus.edu",
      role: "Graduate Assistant"
    },
    verificationQuestion: "Specify the car brand and describe the keychain pin in detail.",
    timelineEvents: [
      {
        id: "evt-6-1",
        stageCode: "reported",
        title: "Found Item Reported",
        description: "Key fob on purple cord secured by Graduate Assistant Tariq A.",
        timestamp: 1761490000000,
        actor: "Tariq A."
      },
      {
        id: "evt-6-2",
        stageCode: "published",
        title: "Report Published",
        description: "Campus listing active. Awaiting claim verification.",
        timestamp: 1761490060000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-7",
    reportId: "LL-FND-1007",
    type: "found",
    title: "Student ID Card for 'Alex Rivera'",
    category: "IDs & Campus Cards",
    locationZone: "Campus Recreation Center / Gym",
    locationDetail: "Left at swipe turnstiles check-in counter",
    date: "2026-10-27",
    description: "Official Campus Student ID Card with name Alex Rivera. Turned over to Rec Center front supervisor lockbox.",
    primaryColor: "White / Red",
    brand: "University ID",
    status: "active",
    trackingStatus: "published",
    createdAt: 1761560000000,
    lastUpdated: 1761560060000,
    reporter: {
      name: "Rec Supervisor",
      maskedContact: "rec-desk***@campus.edu",
      role: "Staff"
    },
    verificationQuestion: "State your Student ID number ending digits and birth month for verification at the desk.",
    timelineEvents: [
      {
        id: "evt-7-1",
        stageCode: "reported",
        title: "Found Item Reported",
        description: "Student ID placed in Rec Center supervisor lockbox.",
        timestamp: 1761560000000,
        actor: "Rec Supervisor"
      },
      {
        id: "evt-7-2",
        stageCode: "published",
        title: "Report Published",
        description: "Published for student Alex Rivera to identify and claim.",
        timestamp: 1761560060000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-8",
    reportId: "LL-LST-1008",
    type: "lost",
    title: "Teal TI-84 Plus CE Graphing Calculator",
    category: "Electronics & Tech",
    locationZone: "Science & Engineering Hall",
    locationDetail: "Lecture Hall 101, row F right side",
    date: "2026-10-23",
    description: "Teal/mint green Texas Instruments TI-84 Plus CE calculator. Back battery cover has a small holographic atom sticker.",
    primaryColor: "Teal",
    brand: "Texas Instruments",
    status: "active",
    trackingStatus: "searching",
    createdAt: 1761227200000,
    lastUpdated: 1761227260000,
    reporter: {
      name: "David S.",
      maskedContact: "d.so***@campus.edu",
      role: "Student (Freshman)"
    },
    verificationQuestion: "What sticker is on the back slide cover or battery panel?",
    timelineEvents: [
      {
        id: "evt-8-1",
        stageCode: "created",
        title: "Report Created",
        description: "Report registered for Teal TI-84 Plus CE Graphing Calculator.",
        timestamp: 1761227200000,
        actor: "David S."
      },
      {
        id: "evt-8-2",
        stageCode: "searching",
        title: "Searching for Matches",
        description: "Scanning Science & Engineering Hall found records.",
        timestamp: 1761227260000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-9",
    reportId: "LL-LST-1009",
    type: "lost",
    title: "Black Patagonia Torrentshell Rain Jacket (Size M)",
    category: "Clothing & Outerwear",
    locationZone: "Bus Terminal & Transit Hub",
    locationDetail: "Left on bench at Bus Shelter #3 while boarding campus shuttle",
    date: "2026-10-24",
    description: "Men's medium black waterproof rain shell. Left pocket contains a pair of green wired earbuds.",
    primaryColor: "Black",
    brand: "Patagonia",
    status: "active",
    trackingStatus: "searching",
    createdAt: 1761313600000,
    lastUpdated: 1761313660000,
    reporter: {
      name: "Liam O'Connor",
      maskedContact: "l.oc***@campus.edu",
      role: "Student (Junior)"
    },
    verificationQuestion: "What specific item is inside the left zippered pocket?",
    timelineEvents: [
      {
        id: "evt-9-1",
        stageCode: "created",
        title: "Report Created",
        description: "Report registered for Black Patagonia Torrentshell Rain Jacket.",
        timestamp: 1761313600000,
        actor: "Liam O'Connor"
      },
      {
        id: "evt-9-2",
        stageCode: "searching",
        title: "Searching for Matches",
        description: "Actively scanning Transit Hub and campus buses. No strong match yet.",
        timestamp: 1761313660000,
        actor: "System"
      }
    ],
    claims: []
  },
  {
    id: "item-demo-10",
    reportId: "LL-FND-1010",
    type: "found",
    title: "Apple iPad Air (Sky Blue) with Pink Smart Folio",
    category: "Electronics & Tech",
    locationZone: "Main Library (1st/2nd Floor)",
    locationDetail: "Cafe table near atrium entrance",
    date: "2026-10-20",
    description: "Sky blue iPad with pink magnetic cover. Safely retrieved by owner Maya after verifying lock screen art.",
    primaryColor: "Blue / Pink",
    brand: "Apple",
    status: "reunited",
    trackingStatus: "reunited",
    createdAt: 1760968000000,
    lastUpdated: 1761058000000,
    reporter: {
      name: "Library Security",
      maskedContact: "lib-safety***@campus.edu",
      role: "Campus Safety"
    },
    verificationQuestion: "What lock screen image appears when pressed?",
    timelineEvents: [
      {
        id: "evt-10-1",
        stageCode: "reported",
        title: "Found Item Reported",
        description: "Found iPad turned in to Library Security Desk.",
        timestamp: 1760968000000,
        actor: "Library Security"
      },
      {
        id: "evt-10-2",
        stageCode: "published",
        title: "Report Published",
        description: "Listing published with verification prompt.",
        timestamp: 1760968060000,
        actor: "System"
      },
      {
        id: "evt-10-3",
        stageCode: "claim_received",
        title: "Potential Claim Received",
        description: "Claim submitted by m.l***@campus.edu.",
        timestamp: 1761054400000,
        actor: "Claimant"
      },
      {
        id: "evt-10-4",
        stageCode: "verification_pending",
        title: "Verification Approved",
        description: "Owner verified lock screen rabbit photo and Apple serial receipt.",
        timestamp: 1761055000000,
        actor: "Library Security"
      },
      {
        id: "evt-10-5",
        stageCode: "handover_arranged",
        title: "Handover Arranged",
        description: "Exchange confirmed at Campus Safety desk.",
        timestamp: 1761056000000,
        actor: "Library Security"
      },
      {
        id: "evt-10-6",
        stageCode: "reunited",
        title: "Returned to Owner / Reunited",
        description: "Verified in person at Campus Safety Desk. Item happily reunited!",
        timestamp: 1761058000000,
        actor: "Library Security"
      }
    ],
    claims: [
      {
        claimId: "clm-demo-resolved",
        claimantMasked: "m.l***@campus.edu",
        claimNote: "My wallpaper is a photo of my pet rabbit with a strawberry hat. Serial number matches my Apple receipt.",
        status: "approved",
        timestamp: 1761054400000,
        resolutionNote: "Verified in person at Campus Safety Desk. Item happily reunited!"
      }
    ]
  },
  // COEP Campus Demonstration Items (to demonstrate multi-college data scoping)
  {
    id: "item-demo-coep-1",
    reportId: "LL-LST-2001",
    collegeId: "col-coep-pune",
    collegeName: "COEP Technological University",
    type: "lost",
    title: "Casio FX-991CW Scientific Calculator",
    category: "Electronics & Tech",
    locationZone: "Central Library & Study Center",
    locationDetail: "Left at second floor reading desk near Metallurgy wing",
    date: "2026-10-27",
    description: "Black and white Casio natural display calculator with a tiny orange sticker on the battery cover.",
    primaryColor: "Black",
    brand: "Casio",
    status: "active",
    trackingStatus: "searching",
    createdAt: 1761500000000,
    lastUpdated: 1761500060000,
    reporter: {
      name: "Rohan D.",
      maskedContact: "r.desh***@coep.ac.in",
      role: "Student (Sophomore)"
    },
    verificationQuestion: "What color is the sticker on the back battery casing?",
    timelineEvents: [
      {
        id: "evt-coep-1",
        stageCode: "created",
        title: "Report Created",
        description: "Lost report filed at COEP Shivajinagar Campus.",
        timestamp: 1761500000000,
        actor: "Rohan D."
      }
    ],
    claims: []
  },
  {
    id: "item-demo-coep-2",
    reportId: "LL-FND-2002",
    collegeId: "col-coep-pune",
    collegeName: "COEP Technological University",
    type: "found",
    title: "Casio Advanced Scientific Calculator in Protective Slip",
    category: "Electronics & Tech",
    locationZone: "Central Library & Study Center",
    locationDetail: "Turned into Circulation Desk after evening study hours",
    date: "2026-10-27",
    description: "Casio scientific calculator inside black protective hard slide-case. Has sticker on rear.",
    primaryColor: "Black",
    brand: "Casio",
    status: "active",
    trackingStatus: "published",
    createdAt: 1761510000000,
    lastUpdated: 1761510060000,
    reporter: {
      name: "COEP Library Desk",
      maskedContact: "library***@coep.ac.in",
      role: "Campus Staff"
    },
    verificationQuestion: "To verify, state the exact sticker color or symbol on the back.",
    timelineEvents: [
      {
        id: "evt-coep-2",
        stageCode: "reported",
        title: "Found Item Reported",
        description: "Turned into COEP Central Library circulation desk.",
        timestamp: 1761510000000,
        actor: "COEP Library Staff"
      }
    ],
    claims: []
  }
];

// Ensure all default demo items have collegeId: "col-jspm-wagholi"
INITIAL_DEMO_ITEMS.forEach(item => {
  if (!item.collegeId) {
    item.collegeId = "col-jspm-wagholi";
    item.collegeName = "JSPM University (Wagholi Campus)";
  }
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COLLEGES_DIRECTORY,
    getCollegesDirectory,
    getCollegeById,
    searchColleges,
    addCollegeToDirectory,
    CAMPUS_LOCATIONS,
    ITEM_CATEGORIES,
    INITIAL_DEMO_ITEMS
  };
}
