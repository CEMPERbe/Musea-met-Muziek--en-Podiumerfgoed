
const map = L.map("map").setView([50.85, 4.35], 8);
const key = 'y8G342pYmviRQupP3DYP';

// OpenStreetMap background
const mtLayer = L.maptiler.maptilerLayer({
        apiKey: key,
        style: L.maptiler.MapStyle.DATAVIZ.LIGHT,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);


let museums = [];
let markers = [];

const sidebar = document.querySelector(".sidebar");

sidebar.innerHTML = `
    <div class="sidebar-header">
        <h2>Musea</h2>

        <input
            type="search"
            id="search"
            placeholder="Zoek museum..."
        >

        <select id="tagFilter">
            <option value="">Alle thema's</option>
        </select>
    </div>

    <div id="resultCount"></div>

    <div id="museumList"></div>
`;

const searchInput = document.getElementById("search");
const tagFilter = document.getElementById("tagFilter");
const museumList = document.getElementById("museumList");
const resultCount = document.getElementById("resultCount");

fetch("musea.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("GeoJSON could not be loaded");
        }

        return response.json();
    })
    .then(data => {

        museums = data.features;

        createTagFilter();
        createMarkers();
        
        map.invalidateSize();
        loadFiltersFromURL();

        applyFilters();

        // Automatically zoom so all museums are visible
        if (markers.length > 0) {
            const group = L.featureGroup(
                markers.map(item => item.marker)
            );

            map.fitBounds(group.getBounds(), {
                padding: [30, 30]
            });
        }

    })
    .catch(error => {
        console.error(error);

        museumList.innerHTML = `
            <p>Kon de museumgegevens niet laden.</p>
        `;
    });

function loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");
    if (tag) {
    tagFilter.value = tag;
}
}


function createMarkers() {

    museums.forEach(museum => {

        if (!museum.geometry ||
            museum.geometry.type !== "Point") {
            return;
        }

        const [longitude, latitude] =
            museum.geometry.coordinates;

        const properties = museum.properties;

        const marker = L.marker([
            latitude,
            longitude
        ]);

        marker.bindPopup(`
            <div class="museum-popup">
                <strong>${escapeHTML(properties.name)}</strong>
                <br>
                ${escapeHTML(properties.description)}
                <br>
                <a href="${escapeHTML(properties.link)}">Bezoek de website</a>
                <br><br>
                ${(properties.tags || [])
                    .map(tag => `<span class="popup-tag"><b>${escapeHTML(tag)}</b></span>`)
                    .join(" ")}
                <br><br>
                
            </div>
        `);

        markers.push({
            museum: museum,
            marker: marker
        });

    });
}


function createTagFilter() {

    const tags = new Set();

    museums.forEach(museum => {

        const museumTags =
            museum.properties.tags || [];

        museumTags.forEach(tag => {
            tags.add(tag);
        });

    });

    [...tags]
        .sort((a, b) => a.localeCompare(b))
        .forEach(tag => {

            const option =
                document.createElement("option");

            option.value = tag;
            option.textContent = tag;

            tagFilter.appendChild(option);

        });
}

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedTag =
        tagFilter.value.toLowerCase();

    const filteredMuseums =
        markers.filter(item => {

            const properties =
                item.museum.properties;

            const name =
                (properties.name || "")
                    .toLowerCase();

            const address =
                (properties.address || "")
                    .toLowerCase();

            const provincie =
                (properties.provincie || "")
                    .toLowerCase();

            const description =
                (properties.description || "")
                    .toLowerCase();

            const tags =
                (properties.tags || [])
                    .map(tag => tag.toLowerCase());

            // Search name, address, provincie AND tags
            const matchesSearch =
                search === "" ||
                name.includes(search) ||
                address.includes(search) ||
                provincie.includes(search) ||
                description.includes(search)||
                tags.some(tag =>
                    tag.includes(search)
                );

            // Tag dropdown
            const matchesTag =
                selectedTag === "" ||
                tags.includes(selectedTag);

            return matchesSearch &&
                   matchesTag;
        });


    // Update map
    updateMap(filteredMuseums);

    // Update sidebar
    updateSidebar(filteredMuseums);
}

function updateMap(filteredMuseums) {

    // Remove all existing markers
    markers.forEach(item => {
        map.removeLayer(item.marker);
    });

    // Add only filtered markers
    filteredMuseums.forEach(item => {
        item.marker.addTo(map);
    });

}

function updateSidebar(filteredMuseums) {

    museumList.innerHTML = "";

    resultCount.textContent =
        `${filteredMuseums.length} musea gevonden`;

    if (filteredMuseums.length === 0) {

        museumList.innerHTML = `
            <div class="no-results">
                Geen musea gevonden.
            </div>
        `;

        return;
    }


    filteredMuseums.forEach(item => {

        const museum = item.museum;
        const properties = museum.properties;

        const card =
            document.createElement("div");

        card.className = "museum-card";

        const tags =
            (properties.tags || [])
                .map(tag =>
                    `<span class="tag">${escapeHTML(tag)}</span>`
                )
                .join("");

        card.innerHTML = `
            <h3>${escapeHTML(properties.name)}</h3>

            <p class="address">
                ${escapeHTML(properties.address || "")}
            </p>

            <div class="tags"><b>
                ${tags}</b>
            </div>
        `;


        // Clicking a card zooms to the museum
        card.addEventListener("click", () => {
            const [longitude, latitude] =
                museum.geometry.coordinates;

            map.once("moveend", () => {
                item.marker.openPopup();
            });

            map.flyTo(
                [latitude, longitude],
                15,
                {
                    animate: true,
                    duration: 0.8
                }
            );

        });


        museumList.appendChild(card);

    });
}

searchInput.addEventListener(
    "input",
    applyFilters
);

tagFilter.addEventListener(
    "change",
    applyFilters
);


function escapeHTML(value) {

    if (value === undefined ||
        value === null) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
