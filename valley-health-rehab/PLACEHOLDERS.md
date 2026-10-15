# Valley Health and Rehab: placeholders to swap before launch

Every placeholder is tagged on the page with a yellow `class="ph"` label. Search index.html for `class="ph"` to find them all.

## Verified facts already used (public CMS / Medicare Care Compare data, CCN 275135)
- Name: The Valley Health and Rehab (legal name Discovery Care Centre, LLC)
- Address: 601 N 10th St, Hamilton, MT 59840 (Ravalli County)
- Phone: (406) 363-2273
- 58 certified beds; Medicare and Medicaid certified; first certified 1990
- Part of The Goodman Group
- Deliberately NOT used: CMS star ratings, awards, occupancy, staffing hours

## Need from the facility
- Photos: img/caregiver.jpg (hero, stock), img/valley.jpg (About), img/therapy.jpg (Rehab, stock), img/river.jpg (Rehab background), img/mountains.jpg + img/og.jpg (hero / social share). Replace with real building, rooms, therapy gym, staff (with consent)
- Logo: current mountain mark is a design placeholder (header, favicon.svg, apple-touch-icon.png)
- About paragraph 2 (mission copy)
- Values: "C.A.R.E. - Compassion, Attention, Respect, Excellence" wording
- Full service list (respite, hospice support, specialty programs, etc.)
- Therapy disciplines offered on site (PT / OT / speech)
- Accepted payers beyond Medicare/Medicaid: VA, long-term care insurance, private insurance, private pay
- Admissions steps (3-step section)
- Careers: current openings, benefits, and hiring inbox (or link to Goodman Group careers portal)
- Testimonials: 3 sample quotes, replace with real approved quotes or remove section
- Tour/visiting hours (Contact panel)
- Admissions email address and an optional fax
- Website domain: update canonical, og:url, og:image and the JSON-LD "url"/"image"

## Launch checklist
- Remove `<meta name="robots" content="noindex, nofollow">`
- Remove the top preview banner and all `class="ph"` tags
- Connect both forms (`#tour-form`, `#apply-form`) to a form backend (e.g. Formspree/Netlify) going to the facility inbox; resume upload needs a backend that supports files
- Do not collect medical details on the form (HIPAA); keep the "don't include medical details" note
