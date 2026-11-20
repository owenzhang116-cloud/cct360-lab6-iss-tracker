let updateButton = document.getElementById("update-button");
let autoButton = document.getElementById("auto-button");
let requestStatus = document.getElementById("request-status");
let issDot = document.getElementById("iss-dot");
let automaticUpdates = true;
let hasPosition = false;

async function getPosition() {
    if (updateButton.disabled) {
        return;
    }

    updateButton.disabled = true;
    updateButton.textContent = "Updating...";
    requestStatus.textContent = "Getting the latest position...";

    try {
        // Ask for this moment so a saved response is not shown as a new position.
        let now = Math.floor(Date.now() / 1000);
        let response = await fetch("https://api.wheretheiss.at/v1/satellites/25544?timestamp=" + now);

        if (!response.ok) {
            throw new Error("The position request failed.");
        }

        let data = await response.json();

        if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude) ||
            !Number.isFinite(data.altitude) || !Number.isFinite(data.velocity) ||
            !Number.isFinite(data.timestamp) ||
            data.latitude < -90 || data.latitude > 90 ||
            data.longitude < -180 || data.longitude > 180 ||
            data.altitude < 0 || data.velocity < 0 ||
            Math.abs(Date.now() / 1000 - data.timestamp) > 60) {
            throw new Error("The position data is missing or out of date.");
        }

        showPosition(data);
        hasPosition = true;
        requestStatus.textContent = "Position updated. Still moving. Still not at my desk.";
    } catch (error) {
        if (hasPosition) {
            requestStatus.textContent = "Could not update. The dot and numbers still show the last successful position. Please try again.";
        } else {
            requestStatus.textContent = "Could not load the position. Check your connection and try Update location.";
        }
    }

    // Leave a short gap between requests to respect the API limit.
    setTimeout(function () {
        updateButton.disabled = false;
        updateButton.textContent = "Update location";
    }, 1100);
}

function showPosition(data) {
    let northSouth = "N";
    let eastWest = "E";

    if (data.latitude < 0) {
        northSouth = "S";
    }
    if (data.longitude < 0) {
        eastWest = "W";
    }

    document.getElementById("latitude").textContent = Math.abs(data.latitude).toFixed(2) + "° " + northSouth;
    document.getElementById("longitude").textContent = Math.abs(data.longitude).toFixed(2) + "° " + eastWest;
    document.getElementById("altitude").textContent = data.altitude.toFixed(1) + " km";
    document.getElementById("speed").textContent = Math.round(data.velocity).toLocaleString("en-US") + " km/h";

    // The flat map runs from -180 to 180 longitude and 90 to -90 latitude.
    let leftPosition = (data.longitude + 180) / 360 * 100;
    let topPosition = (90 - data.latitude) / 180 * 100;
    issDot.style.left = leftPosition + "%";
    issDot.style.top = topPosition + "%";
    issDot.hidden = false;

    let lightStatus = document.getElementById("light-status");
    if (data.visibility === "daylight") {
        lightStatus.textContent = "The ISS is in sunlight. No curtains up there.";
        lightStatus.style.backgroundColor = "#fff2c7";
    } else if (data.visibility === "eclipsed") {
        lightStatus.textContent = "The ISS is in Earth's shadow. Still no bedtime.";
        lightStatus.style.backgroundColor = "#e4e8f6";
    } else {
        lightStatus.textContent = "Position found. The sunlight status is not available.";
        lightStatus.style.backgroundColor = "#edf0f4";
    }

    let positionTime = new Date(data.timestamp * 1000);
    document.getElementById("updated-time").textContent = "Position time (UTC): " + positionTime.toUTCString();
}

function toggleUpdates() {
    automaticUpdates = !automaticUpdates;

    if (automaticUpdates) {
        autoButton.textContent = "Pause auto update";
        document.getElementById("auto-status").textContent = "Auto update: on, every 15 seconds.";
        getPosition();
    } else {
        autoButton.textContent = "Resume auto update";
        document.getElementById("auto-status").textContent = "Auto update: paused. You can still update the location manually.";
    }
}

updateButton.addEventListener("click", getPosition);
autoButton.addEventListener("click", toggleUpdates);

getPosition();
setInterval(function () {
    if (automaticUpdates) {
        getPosition();
    }
}, 15000);
