#!/usr/bin/env python3
"""Build preview.html from frontend/index.html with baked-in catalog data.

The live frontend expects a Node/Express API at localhost:5000. The preview
instead injects the catalog as JS constants and boots from them, so the page
renders fully offline. Fails loudly if any injection anchor is missing.
"""
import json
import re
import sys

SPORTS = [
    ("s1", "Football", "⚽"), ("s2", "Cricket", "🏏"), ("s3", "Basketball", "🏀"),
    ("s4", "Tennis", "🎾"), ("s5", "Swimming", "🏊"), ("s6", "Athletics", "🏃"),
    ("s7", "Badminton", "🏸"), ("s8", "Volleyball", "🏐"),
    ("s9", "Table Tennis", "🏓"), ("s10", "Boxing", "🥊"),
]
GYMS = [
    ("g1", "Skykings Football Academy", "Bowenpally", "186/A, HP Petrol Pump, Plassy Lines, Bowenpally, Hyderabad 500011", 17.4639, 78.4678, "+91 9704299881", ""),
    ("g2", "GMC Balayogi Athletic Stadium", "Gachibowli", "Gachibowli, Hyderabad", 17.4419, 78.3456, "", ""),
    ("g3", "Arshad Ayub Cricket Academy", "Masab Tank", "Raj Janakiprasad Road, Potti Sriramulu Nagar, Masab Tank, Hyderabad 500028", 17.4126, 78.4482, "+91 9440011743", "arshad@arshadayubcricketacademy.com"),
    ("g4", "Sarojini Cricket & Fitness Academy", "Bagh Lingampally", "Street No 1, Bagh Lingampally, Hyderabad", 17.41, 78.492, "", ""),
    ("g5", "GMC Balayogi Indoor Stadium", "Gachibowli", "Gachibowli, Hyderabad", 17.4425, 78.346, "", ""),
    ("g6", "Kotla Vijay Bhaskar Reddy Indoor Stadium", "Yousufguda", "Yousufguda, Hyderabad", 17.428, 78.44, "", ""),
    ("g7", "Sania Mirza Tennis Academy", "Film Nagar", "61A, Rd Number 9, Film Nagar, Hyderabad 500033", 17.42, 78.38, "+91 9966964371", "tournamentssmta@gmail.com"),
    ("g8", "SAAP Tennis Complex", "Fateh Maidan", "Fateh Maidan, Hyderabad", 17.4, 78.474, "", ""),
    ("g9", "Gachibowli Aquatics Complex", "Gachibowli", "Gachibowli, Hyderabad", 17.44, 78.35, "", ""),
    ("g10", "Pioneer Swimming Academy", "Yapral", "Near Rajha Convention, Yapral, Secunderabad", 17.48, 78.49, "+91 9963192193", ""),
    ("g11", "LB Stadium", "Fateh Maidan", "Fateh Maidan, Hyderabad", 17.398, 78.476, "", ""),
    ("g12", "RG Battledore Badminton Academy", "Kondapur", "Rajarajeshwari Colony, Kondapur, Hyderabad", 17.465, 78.36, "", ""),
    ("g13", "Saroornagar Indoor Arena", "Saroornagar", "Saroornagar, Hyderabad", 17.36, 78.53, "", ""),
    ("g14", "Inspire Table Tennis Academy", "Kapra", "Plot No. 87, Ashok Manipuri, Kapra, Hyderabad 500062", 17.49, 78.57, "+91 9000111594", ""),
    ("g15", "Habeeb Mustafa Boxing Academy", "Falaknuma", "18-4-42/6, RBR Complex, Shamsheer Gunj, Engine Bowli, Aliabad, Hyderabad 500053", 17.33, 78.47, "+91 9652924694", ""),
    ("g16", "Iskimos Kick Boxing Academy", "Somajiguda", "6-3-550, LB Bhavan, Somajiguda, Hyderabad 500082", 17.43, 78.45, "+91 9885346824", "info@iskimos.com"),
    ("g17", "Gold's Gym Banjara Hills", "Banjara Hills", "Plot No. 8-2-701/12, Road No. 12, Banjara Hills, Hyderabad 500034", 17.4156, 78.4347, "040-23377999", "banjarahills.hyd@goldsgym.in"),
    ("g18", "Gold's Gym Himayat Nagar", "Himayat Nagar", "3-6-289, 3rd Floor, Hyderguda Main Road, Himayathnagar, Hyderabad 500029", 17.3953, 78.4867, "9000026767", "himayatnagar.hyderabad@goldsgym.in"),
    ("g19", "F45 Training Basheer Bagh", "Basheer Bagh", "1st Floor, Skyline & Sterling Residency, Shaheed Yar Jung Rd, Basheer Bagh, Hyderabad 500029", 17.393, 78.476, "+91 9052924545", ""),
    ("g20", "F45 Training Madhapur", "Madhapur", "2nd Floor, Xenospace Building, Opp. Karachi Bakery, Madhapur, Hyderabad 500081", 17.4483, 78.3915, "+91 9160540545", ""),
    ("g21", "Snap Fitness Madhapur", "Madhapur", "Sun Towers, 3rd Floor, Plot No. 22, HUDA Techno Enclave, Madhapur, Hyderabad 500081", 17.446, 78.394, "040-64648833", ""),
    ("g22", "Anytime Fitness Jubilee Hills", "Jubilee Hills", "Plot No. 71, Road No. 1 & 9, Jubilee Hills, Hyderabad 500033", 17.4325, 78.407, "040-40207365", ""),
]
PROGRAMS = [
    ("Football Training", "s1", "g1", "Skykings Football Academy, Bowenpally", "Monday", "18:00", "20:00", 30, "Arjun Reddy", "intermediate", 2500, "/month"),
    ("Football Fitness", "s1", "g2", "GMC Balayogi Athletic Stadium, Gachibowli", "Wednesday", "06:00", "07:30", 25, "Arjun Reddy", "beginner", 2500, "/month"),
    ("Cricket Academy", "s2", "g3", "Arshad Ayub Cricket Academy, Masab Tank", "Tuesday", "17:00", "19:30", 40, "Vikram Rao", "advanced", 2500, "/month"),
    ("Cricket Fitness", "s2", "g4", "Sarojini Cricket & Fitness Academy, Bagh Lingampally", "Thursday", "06:00", "07:30", 30, "Vikram Rao", "beginner", 2500, "/month"),
    ("Basketball Training", "s3", "g5", "GMC Balayogi Indoor Stadium, Gachibowli", "Monday", "17:00", "19:00", 25, "Sameer Khan", "intermediate", 1800, "/month"),
    ("Basketball Fitness", "s3", "g6", "Kotla Vijay Bhaskar Reddy Indoor Stadium, Yousufguda", "Friday", "06:00", "07:30", 25, "Sameer Khan", "beginner", 1800, "/month"),
    ("Tennis Academy", "s4", "g7", "Sania Mirza Tennis Academy, Film Nagar", "Saturday", "07:00", "09:00", 20, "Ananya Iyer", "advanced", 3000, "/month"),
    ("Tennis Fitness", "s4", "g8", "SAAP Tennis Complex, Fateh Maidan", "Wednesday", "06:00", "07:30", 20, "Ananya Iyer", "beginner", 3000, "/month"),
    ("Swimming Training", "s5", "g9", "Gachibowli Aquatics Complex", "Tuesday", "06:30", "08:00", 20, "Rohan Mehta", "intermediate", 4000, "/month"),
    ("Swimming Fitness", "s5", "g10", "Pioneer Swimming Academy, Yapral", "Saturday", "07:00", "08:30", 20, "Rohan Mehta", "beginner", 4000, "/month"),
    ("Athletics Training", "s6", "g2", "GMC Balayogi Athletic Stadium, Gachibowli", "Monday", "06:00", "08:00", 30, "Kavya Nair", "advanced", 2000, "/month"),
    ("Athletics Fitness", "s6", "g11", "LB Stadium, Fateh Maidan", "Friday", "06:30", "08:00", 25, "Kavya Nair", "beginner", 2000, "/month"),
    ("Badminton Academy", "s7", "g12", "RG Battledore Badminton Academy, Kondapur", "Wednesday", "18:00", "20:00", 20, "Aditya Rao", "intermediate", 2500, "/month"),
    ("Badminton Fitness", "s7", "g13", "Saroornagar Indoor Arena", "Saturday", "16:00", "17:30", 20, "Aditya Rao", "beginner", 2500, "/month"),
    ("Volleyball Training", "s8", "g6", "Kotla Vijay Bhaskar Reddy Indoor Stadium, Yousufguda", "Thursday", "18:00", "20:00", 30, "Sneha Kulkarni", "intermediate", 2500, "/month"),
    ("Volleyball Fitness", "s8", "g5", "GMC Balayogi Indoor Stadium, Gachibowli", "Saturday", "08:00", "09:30", 25, "Sneha Kulkarni", "beginner", 2500, "/month"),
    ("Table Tennis Academy", "s9", "g14", "Inspire Table Tennis Academy, Kapra", "Tuesday", "18:00", "20:00", 20, "Nikhil Verma", "advanced", 2000, "/month"),
    ("Table Tennis Fitness", "s9", "g13", "Saroornagar Indoor Arena", "Friday", "18:00", "19:30", 20, "Nikhil Verma", "beginner", 2000, "/month"),
    ("Boxing Academy", "s10", "g15", "Habeeb Mustafa Boxing Academy, Falaknuma", "Wednesday", "18:00", "20:00", 20, "Imran Sheikh", "intermediate", 2500, "/month"),
    ("Boxing Fitness", "s10", "g16", "Iskimos Kick Boxing Academy, Somajiguda", "Sunday", "08:00", "09:30", 25, "Imran Sheikh", "beginner", 2500, "/month"),
]
GYM_PROGRAMS = [
    ("Annual Membership", None, "g17", "Gold's Gym, Banjara Hills", "Monday", "05:00", "23:00", 500, "", "beginner", 30450, "/year"),
    ("Annual Membership", None, "g18", "Gold's Gym, Himayat Nagar", "Monday", "05:00", "23:00", 500, "", "beginner", 26775, "/year"),
    ("Functional Training", None, "g19", "F45 Training, Basheer Bagh", "Monday", "06:00", "21:00", 27, "", "intermediate", 6999, "/month"),
    ("Functional Training", None, "g20", "F45 Training, Madhapur", "Monday", "06:00", "21:00", 27, "", "intermediate", 6174, "/month"),
    ("Gym Membership", None, "g21", "Snap Fitness, Madhapur", "Monday", "05:00", "23:00", 300, "", "beginner", 4000, "/month"),
    ("Gym Membership", None, "g22", "Anytime Fitness, Jubilee Hills", "Monday", "00:00", "23:59", 300, "", "beginner", 8000, "/month"),
]
PLANS = [
    ("pl1", "All-Access", "monthly", 20000, "Every sport, every arena, every program. One membership for the whole city."),
]


def build():
    smap = {s[0]: {"_id": s[0], "name": s[1], "icon": s[2]} for s in SPORTS}
    gmap = {g[0]: {"_id": g[0], "name": g[1], "area": g[2], "address": g[3],
                   "lat": g[4], "lng": g[5], "phone": g[6], "email": g[7]} for g in GYMS}
    programs = []
    for i, r in enumerate(PROGRAMS + GYM_PROGRAMS, 1):
        programs.append({
            "_id": f"p{i}", "name": r[0], "sportId": (smap[r[1]] if r[1] else None),
            "gymId": {"_id": r[2], "name": gmap[r[2]]["name"], "area": gmap[r[2]]["area"]},
            "location": r[3], "day": r[4], "startTime": r[5], "endTime": r[6],
            "capacity": r[7], "coach": r[8], "level": r[9],
            "priceInr": r[10], "pricePer": r[11],
        })
    counts = {}
    for p in programs:
        gid = p["gymId"]["_id"]
        counts[gid] = counts.get(gid, 0) + 1
    gym_list = [{**gmap[g[0]], "programCount": counts.get(g[0], 0)} for g in GYMS]
    plans = [{"_id": p[0], "name": p[1], "billingCycle": p[2], "priceInr": p[3], "description": p[4]}
             for p in PLANS]

    src = open('frontend/index.html').read()

    # 1. preview badge
    badge_anchor = '<div id="toast"></div>'
    assert badge_anchor in src, "badge anchor missing"
    badge = ('<div id="toast"></div>\n<div style="position:fixed;top:76px;right:16px;z-index:50;'
             'font-size:11px;background:#d8ff3f;color:#0a0a0b;padding:6px 12px;'
             'border-radius:99px;font-weight:700">preview · backend not connected</div>')
    src = src.replace(badge_anchor, badge, 1)

    # 2. inject baked-in catalog constants right before the state declarations
    state_anchor = "let jwt = localStorage.getItem('ss_jwt')"
    assert state_anchor in src, "state anchor missing"
    consts = ("const PREVIEW_SPORTS = %s;\nconst PREVIEW_PROGRAMS = %s;\n"
              "const PREVIEW_PLANS = %s;\nconst PREVIEW_GYMS = %s;\n"
              % (json.dumps(list(smap.values())), json.dumps(programs),
                 json.dumps(plans), json.dumps(gym_list)))
    assert "const PREVIEW_SPORTS" not in src, "constants already injected?"
    src = src.replace(state_anchor, consts + state_anchor, 1)

    # 3. swap the live boot for the offline boot
    old_boot = """window.addEventListener('DOMContentLoaded', async () => {
  try { await loadCatalog(); }
  catch (e) { console.warn('api not reachable yet:', e.message); catalogFailed(); }
  await restoreSession();
});"""
    new_boot = """window.addEventListener('DOMContentLoaded', async () => {
  sportsData = PREVIEW_SPORTS; programsData = PREVIEW_PROGRAMS;
  plansData = PREVIEW_PLANS; gymsData = PREVIEW_GYMS;
  renderSports(); filterPrograms(); renderPlans(); buildFilter(); renderExplore();
  const counts = document.querySelectorAll('.metrics div b');
  if (counts[1]) counts[1].textContent = sportsData.length;
  if (counts[2]) counts[2].textContent = programsData.length;
});"""
    assert old_boot in src, "boot block not found"
    src = src.replace(old_boot, new_boot, 1)

    open('preview.html', 'w').write(src)

    # 4. sanity: every render target the boot touches must exist
    for rid in ["sportGrid", "programGrid", "sportDropdown", "gymList", "sportList", "exMap", "exDir", "exBook"]:
        assert f'id="{rid}"' in src, f"missing element #{rid}"

    scripts = re.findall(r'<script>(.*?)</script>', src, re.S)
    open('/tmp/preview_js.js', 'w').write('\n'.join(scripts))
    print("preview.html written OK")


if __name__ == '__main__':
    build()
