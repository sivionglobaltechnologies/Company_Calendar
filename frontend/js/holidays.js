// holidays.js
// Preloaded Indian MNC Holidays based on Google Calendar conventions

// Floating holidays (like Diwali, Holi) change each year.
// Below is a lookup mapping to support typical dates from 2024 to 2028.
// For years outside this range, it will fallback to a generic approximation.
const floatingHolidays = {
    "2024": { "mahashivaratri": "03-08", "holi": "03-25", "goodfriday": "03-29", "eid-al-fitr": "04-11", "ganesh": "09-07", "dussehra": "10-12", "diwali": "11-01" },
    "2025": { "mahashivaratri": "02-26", "holi": "03-14", "goodfriday": "04-18", "eid-al-fitr": "03-31", "ganesh": "08-27", "dussehra": "10-02", "diwali": "10-20" },
    "2026": { "mahashivaratri-1": "02-15", "mahashivaratri-2": "02-17", "holi": "03-04", "goodfriday": "04-03", "eid-al-fitr": "03-20", "ganesh": "09-14", "dussehra": "10-20", "diwali": "11-08" },
    "2027": { "mahashivaratri": "03-06", "holi": "03-22", "goodfriday": "03-26", "eid-al-fitr": "03-10", "ganesh": "09-04", "dussehra": "10-09", "diwali": "10-29" },
    "2028": { "mahashivaratri": "02-24", "holi": "03-11", "goodfriday": "04-14", "eid-al-fitr": "02-28", "ganesh": "08-23", "dussehra": "09-28", "diwali": "10-17" }
};

export const getGovernmentHolidays = (year) => {
    // 1. Fixed National/Public Holidays
    const holidays = [
        { title: "New Year's Day", date: `${year}-01-01`, description: "New Year's Day" },
        { title: "Makar Sankranti / Pongal", date: `${year}-01-14`, description: "Harvest Festival" },
        { title: "Republic Day", date: `${year}-01-26`, description: "Indian Republic Day" },
        { title: "May Day", date: `${year}-05-01`, description: "May Day / Labour Day" },
        { title: "Independence Day", date: `${year}-08-15`, description: "Indian Independence Day" },
        { title: "Gandhi Jayanti", date: `${year}-10-02`, description: "Mahatma Gandhi's Birthday" },
        { title: "Christmas", date: `${year}-12-25`, description: "Christmas Day" }
    ];

    // 2. Add Floating Holidays Lookups
    const fDates = floatingHolidays[year] || {
        // Generic fallback dates for unmapped years
        "mahashivaratri": "02-20",
        "holi": "03-15",
        "goodfriday": "04-05",
        "eid-al-fitr": "04-10",
        "ganesh": "09-05",
        "dussehra": "10-15",
        "diwali": "11-01"
    };

    if (fDates["mahashivaratri-1"]) {
        holidays.push({ title: "Maha Shivaratri", date: `${year}-${fDates["mahashivaratri-1"]}`, description: "Maha Shivaratri" });
        holidays.push({ title: "Maha Shivaratri", date: `${year}-${fDates["mahashivaratri-2"]}`, description: "Maha Shivaratri" });
    } else if (fDates["mahashivaratri"]) {
        holidays.push({ title: "Maha Shivaratri", date: `${year}-${fDates["mahashivaratri"]}`, description: "Maha Shivaratri" });
    }

    if (fDates["holi"]) holidays.push({ title: "Holi", date: `${year}-${fDates["holi"]}`, description: "Festival of Colors" });
    if (fDates["goodfriday"]) holidays.push({ title: "Good Friday", date: `${year}-${fDates["goodfriday"]}`, description: "Good Friday" });
    if (fDates["eid-al-fitr"]) holidays.push({ title: "Eid al-Fitr", date: `${year}-${fDates["eid-al-fitr"]}`, description: "Eid al-Fitr" });
    if (fDates["ganesh"]) holidays.push({ title: "Ganesh Chaturthi", date: `${year}-${fDates["ganesh"]}`, description: "Ganesh Chaturthi" });
    if (fDates["dussehra"]) holidays.push({ title: "Dussehra", date: `${year}-${fDates["dussehra"]}`, description: "Vijayadashami / Dussehra" });
    if (fDates["diwali"]) holidays.push({ title: "Diwali (Deepavali)", date: `${year}-${fDates["diwali"]}`, description: "Festival of Lights" });

    // 3. Transform and return in the proper schema
    return holidays.map((h, i) => ({
        id: `gov-${year}-${i}`,
        title: h.title,
        date: h.date,
        type: "gov",
        isReadOnly: true,
        description: h.description
    }));
};
