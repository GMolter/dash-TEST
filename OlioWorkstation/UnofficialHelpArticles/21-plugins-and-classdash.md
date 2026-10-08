########
Title: Plugins and ClassDash
Slug: plugins-and-classdash
Summary: Filter your week, edit classes, import a schedule, and set campus locations.
Sort Order: 21
########

## Install and open ClassDash

Open **Utilities → Plugins & Dashboard** and choose **Install** on ClassDash. Use **Open & configure** to return later. Your saved schedule and map locations belong to your account.

ClassDash has three sections: **Weekly schedule**, **Import classes**, and **Home base**. Use **Add class** for manual entry or **Import schedule** to start from a file.

## Set your home base

1. Open **Home base**.
2. Enter your **Dorm or home name**.
3. Search for the building or address, select a result, and check the pin. You can also click the map or use **Use my location** and allow browser location access.
4. Choose **Save home**.

Use **Edit Home Location** to update a saved home. Saving recalculates leave estimates. Location search sends your search text to the configured map search service; do not put private information into it.

## Browse your week

**Weekly schedule** shows a next-class countdown and your saved class cards. Choose **All classes** or a day to filter the cards. Classes are sorted by start time, and the number beside a day counts the saved classes that meet that day. These filters describe the recurring week; semester dates determine whether a class appears in the upcoming countdown.

## Add or edit a class

1. Choose **Add class**, or the pencil on a saved class.
2. Under **Class details**, enter a course code. Course name and section are optional.
3. Under **Weekly routine**, enter start and end times, choose every meeting day, and optionally set semester dates.
4. Under **Campus location**, enter the building or room and search or click the map to place its pin. Choose an existing classroom button to reuse its name and coordinates, then adjust the room name if needed.
5. Choose **Add to schedule** or **Save changes**.

The details and location appear side by side on wider screens and stack on smaller screens. A location name alone is not enough: every class needs a map pin. Choose at least one day; the end time must be later than the start time, and the semester end cannot precede its start.

Use separate entries when a course's lecture and lab have different times or locations. **Back to schedule** or the close button leaves the editor without saving. The trash button on a class asks for confirmation before removing it.

## Import a calendar or syllabus

1. Open **Import classes**, or choose **Import schedule**.
2. Choose an ICS calendar or syllabus file up to 3 MB.
3. Choose **Import calendar** for ICS, or **Extract classes** for a syllabus.
4. Choose **Review class** beside a result. Check its code, days, times, semester dates, and location.
5. Place a classroom pin or reuse a saved location, then choose **Add to schedule**.
6. Continue from the import results. Successfully saved rows say **Saved to schedule**, and the progress count shows how many remain.

Importing creates review drafts; it does not add everything automatically. A failed save leaves the draft open and does not mark it saved. **Back to import results** returns without saving that draft. Keep ClassDash open while reviewing: pending results and their progress are not saved across a page reload. Choosing another file or extracting again starts a fresh set of results; previously saved classes stay on your schedule.

Supported syllabus formats are PDF, DOC, DOCX, TXT, MD, RTF, and ODT. Syllabus documents are sent to OpenAI for analysis and are not added to your project files. ICS calendars are parsed on your device. Imported files are snapshots, not a live calendar subscription.

## Check imported details

If no classes are found, use a calendar with named events and explicit start and end times, or enter classes manually. All-day entries are not imported as classes. Review times carefully when the file uses another time zone. ClassDash stores weekly meeting days and date bounds; calendar exceptions, holiday cancellations, and unusual recurrence patterns need manual review.

If extraction fails, check the file type and 3 MB limit. For a syllabus, check your connection and sign in again if requested. Avoid saving the same class again from a second import.

## Read the countdown

Before class, the countdown runs to its start time; during class, it runs to the end. Use the separate **Leave by** time to decide when to set off. Walking estimates include a five-minute buffer. The first trip starts from home; gaps of 45 minutes or less use the previous classroom, while longer gaps start from home again.

These are estimates based on map-pin distance and walking pace, not live route or traffic directions. Check both home and classroom pins if the estimate looks wrong. **You're clear** means there are no upcoming classes in the next week; check days, times, and semester dates if that is unexpected.

## Show, hide, or uninstall

On Home, choose **Customize dashboard → Elements** to show or hide ClassDash. Drag and resize its card on a wide screen.

To uninstall, open **Plugins & Dashboard**, choose **Uninstall**, and confirm. Your saved schedule is kept for reinstalling. See [Home Dashboard](olio://help/home-dashboard) for layout controls.
