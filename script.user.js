// ==UserScript==
// @name         ITP Camp Calendar Button
// @namespace    https://eieio.games
// @version      1.0
// @description  Add a link to the ITP Camp site that adds an event to your google calendar
// @author       Nolen Royalty
// @match        https://itp.nyu.edu/camp/2024/session/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';


    function numberifyMonth(s) {
        s = s.toLowerCase().replace(",", "").trim();
        if (s === "january") { return "01"; }
        if (s === "february") { return "02"; }
        if (s === "march") { return "03"; }
        if (s === "april") { return "04"; }
        if (s === "may") { return "05"; }
        if (s === "june") { return "06"; }
        if (s === "july") { return "07"; }
        if (s === "august") { return "08"; }
        if (s === "september") { return "09"; }
        if (s === "october") { return "10"; }
        if (s === "november") { return "11"; }
        if (s === "december") { return "12"; }
    }

    function getHoursMinutes(stripped) {
        const split = stripped.split(":");
        if (split.length === 2) {
            const hours = Number(split[0]);
            const minutes = Number(split[1]);
            return { hours, minutes }
        } else if (split.length === 1) {
            const hours = Number(split[0]);
            return { hours, minutes: 0 }
        } else {
            throw new Error(`Could not parse time: ${stripped}`);
        }
    }

    function stripAmPm(time) {
        let hours;
        let minutes;

        if (time.endsWith("am")) {
            const stripped = time.slice(0, -2);
            let { hours, minutes } = getHoursMinutes(stripped);
            return { hours, minutes, forceAmPm: "am" }
        } else if (time.endsWith("pm")) {
            const stripped = time.slice(0, -2);
            let { hours, minutes } = getHoursMinutes(stripped);
            return { hours, minutes, forceAmPm: "pm" }
        } else {
            let { hours, minutes } = getHoursMinutes(time);
            return { hours, minutes, forceAmPm: "guess" }
        }
    }

    function addPmIncrement(time) {
        if (time.forceAmPm === "pm") {
            if (time.hours !== 12) {
                time.hours += 12;
            }
        } else if (time.forceAmPm === "guess") {
            throw new Error(`Should never have a guess value: ${JSON.stringify(time)}`);
        }
        return time;
    }

    function parseTimes(times) {
        const split = times.split("-");
        if (!split || split.length !== 2) {
            console.error(`can't parse times ${times}`);
            return null;
        }
        let [first, second] = split;
        first = stripAmPm(first);
        second = stripAmPm(second);

        function incrAndReturn({ first, second }) {
            const start = addPmIncrement(first);
            const end = addPmIncrement(second);
            return { start, end };
        }

        if (first.forceAmPm !== "guess" && second.forceAmPm !== "guess") {
            return incrAndReturn({first, second});
        }

        if (first.forceAmPm === "am" && second.forceAmPm === "guess") {
            if (second.hours > first.hours || (second.hours === first.hours && second.minutes > first.minutes)) {
                // probably all AM...
                second.forceAmPm = "am";
                return incrAndReturn({ first, second });
            } else {
                // probably spans the noon boundary...
                second.forceAmPm = "pm";
                return incrAndReturn({ first, second });
            }
        } else if (first.forceAmPm === "pm" && second.forceAmPm === "guess") {
            // this works unless we have events that go past midnight?
            second.forceAmPm = "pm";
            return incrAndReturn({ first, second });
        } else if (first.forceAmPm === "guess" && second.forceAmPm === "am") {
            // this also works unless we have events that go past midnight
            first.forceAmPm = "am";
            return incrAndReturn({ first, second });
        } else if (first.forceAmPm === "guess" && second.forceAmPm === "pm") {
            if (second.hours > first.hours || (second.hours === first.hours && second.minutes > first.minutes)) {
                // Probably all PM (unless we have 12 hour events)
                first.forceAmPm = "pm";
                return incrAndReturn({ first, second });
            } else {
                first.forceAmPm = "am";
                return incrAndReturn({ first, second});
            }
        } else {
            throw new Error(`Exhausted all ideas for times ${JSON.stringify(times)}`);
        }
    }

    function toTimeString({year, month, day, time} ) {
        year = String(year).replace(",", "").padStart(4, "0");
        month = String(month).replace(",", "").padStart(2, "0");
        day = String(day).replace(",", "").padStart(2, "0");
        const hours = String(time.hours).padStart(2, "0");
        const mins = String(time.minutes).padStart(2, "0");

        return encodeURIComponent(`${year}${month}${day}T${hours}${mins}00`);
    }

    function getLocation() {
        let loc = "Check ITP website for location - it wasn't there when you added the event :(";
        function returnWarnLoc(warn) {
            console.warn(`could not find loc! ${warn}`);
            return encodeURIComponent(loc);
        }
        const si = document.querySelector(".sessionInfo");
        if (!si) {
            return returnWarnLoc("1");
        }
        const as = Array.from(si.querySelectorAll("a"));
        if (!as || as.length === 0) {
            return returnWarnLoc("2");
        }
        const locAs = as.filter((a) => a.href?.includes("location"));
        if (locAs && locAs.length > 0) {
            return encodeURIComponent(locAs[0].innerText.trim());
        } else {
            return returnWarnLoc("Could not find location...");
        }
    }

    const content = document.querySelector(".content");
    if (!content) {
        console.error("could not find .content on page!");
        return;
    }
    let sessionName = content.querySelector("h1")?.innerText;
    if (!sessionName) {
        console.warn("no session name?");
        sessionName = "ITP Camp: name unknown";
    } else {
        sessionName = `ITP Camp: ${sessionName}`.trim();
    }
    sessionName = encodeURIComponent(sessionName);

    let sessionDateTime = document.querySelector(".sessionDateTime")
    let strippedAndSplit = sessionDateTime?.innerText?.split("Date: ")[1]?.split(" ")
    if (!strippedAndSplit || strippedAndSplit.length !== 4) {
        console.error(`Could not get session date and time: ${sessionDateTime} ${JSON.stringify(strippedAndSplit)}. Bug or problem with ITP calendar??`);
        return;
    }

    const [monthString, day, year, times] = strippedAndSplit;
    const month = numberifyMonth(monthString);
    const { start, end } = parseTimes(times);
    if (!start || !end) {
        console.log(`Error parsing times ${start} ${end}`);
        return;
    }

    const body = document.querySelector(".sessionBody");
    let desc = "NO DESCRIPTION";
    if (body?.innerText) {
        desc = body.innerText;
    } else {
        console.warn("couldn't parse description?");
    }
    desc = encodeURIComponent(desc.trim());
    const loc = getLocation();

    const sidebar = document.querySelector(".rightSidebar");
    if (!sidebar) {
        console.error("could not find right sidebar?");
        return;
    }
    const outerA = document.createElement("a");
    const innerDiv = document.createElement("div");
    innerDiv.innerText = "📆 Add to Calendar";
    innerDiv.classList.add("buttonWithoutAnchor");
    const tz = encodeURIComponent("America/New_York");
    const startTime = toTimeString({ year, month, day, time: start});
    const endTime = toTimeString({ year, month, day, time: end});
    outerA.href = `https://www.google.com/calendar/render?action=TEMPLATE&text=${sessionName}&dates=${startTime}/${endTime}&details=${desc}&location=${loc}&ctz=${tz}`;
    outerA.target = '_blank';
    outerA.appendChild(innerDiv);
    sidebar.appendChild(outerA);
})();
