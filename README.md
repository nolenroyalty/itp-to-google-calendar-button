# itp-to-google-calendar-button
A tampermonkey script that adds a button to add ITP Camp events to your google calendar.

To install:
* Install [TamperMonkey](https://www.tampermonkey.net/). TamperMonkey is a browser extension that lets you run custom javascript on webpages.
* Open the TamperMonkey dashboard (click the extension icon, which is two circles at the bottom of a square, and select "dashboard")
* Click on the "Utilities" tab
* In the "import from URL" section, paste the following url: `https://github.com/nolenroyalty/itp-to-google-calendar-button/raw/main/script.user.js`

Other Stuff:
* i wrote this in like an hour. there are probably bugs. Also there are some problems.
* This doesn't parse zoom links
* Locations are added to events pretty late, so this will often not capture the location of an event
* The time formats for events on the site are not consistent so there might be bugs around guessing the time of an event, especially if it spans the AM-PM boundary
* i cannot emphasize enough how little testing I did (i clicked like 20 events and spot checked that they looked ok)

Pull requests very welcome!! I might add some stuff to this if I have the time.
