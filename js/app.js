(function () {
  "use strict";

  var map = L.map("map", { zoomControl: false }).setView([51.665, -3.47], 12);
  L.control.zoom({ position: "topright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var detailsEl = document.getElementById("details");
  var sidebar = document.getElementById("sidebar");

  var DEFAULT_DETAILS =
    "<p class=\"hint\">Click a route, marker, or trail on the map for more information.</p>";

  var walkPickerEl = document.getElementById("walk-picker");
  var walkListEl = document.getElementById("walk-list");
  var onboardingEl = document.getElementById("onboarding");
  var onboardingListEl = document.getElementById("onboarding-list");

  var topbarTitleEl = document.getElementById("topbarTitle");
  var topbarProgressEl = document.getElementById("topbarProgress");
  var topbarProgressFillEl = document.getElementById("topbarProgressFill");
  var DEFAULT_TITLE = topbarTitleEl.textContent;

  function resetTopbar() {
    topbarTitleEl.textContent = DEFAULT_TITLE;
    topbarProgressEl.classList.remove("active");
    topbarProgressFillEl.style.width = "0%";
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  var routeLayer = L.layerGroup().addTo(map);
  var pointsLayer = L.layerGroup().addTo(map);
  var walksLayer = L.layerGroup().addTo(map);

  var pointColors = {
    start: "#2f8f4e",
    finish: "#c8102e",
    kom: "#e0a000",
    town: "#1d2024",
    "feature-town": "#8c0a20"
  };

  // ---- Walking-route slideshow state ----
  var walkGroups = {};   // routeId -> { routeId, name, distanceKm, difficulty, points: [...], markers: [...] }
  var currentWalk = null; // { routeId, index }

  function poiIcon(number, active) {
    return L.divIcon({
      className: "",
      html: '<div class="poi-icon' + (active ? " poi-icon-active" : "") + '">' + number + "</div>",
      iconSize: [active ? 26 : 22, active ? 26 : 22],
      iconAnchor: [active ? 13 : 11, active ? 13 : 11]
    });
  }

  function updateMarkerIcons() {
    Object.keys(walkGroups).forEach(function (id) {
      var g = walkGroups[id];
      g.markers.forEach(function (m, idx) {
        var active = !!(currentWalk && currentWalk.routeId === id && currentWalk.index === idx);
        m.setIcon(poiIcon(idx + 1, active));
      });
    });
  }

  function openSidebarOnMobile() {
    if (isMobileLayout()) {
      sidebar.classList.remove("collapsed");
      document.getElementById("toggleSidebar").setAttribute("aria-expanded", "true");
    }
  }

  // Centers the map on a point, but on mobile shifts the center up so the
  // point lands in the strip of map still visible above the floating sidebar.
  function flyToPoint(lat, lng, minZoom) {
    var targetZoom = Math.max(map.getZoom(), minZoom);
    var latlng = L.latLng(lat, lng);

    if (isMobileLayout()) {
      var mapSize = map.getSize();
      var sidebarHeight = sidebar.offsetHeight + 12; // + bottom margin
      var visibleHeight = Math.max(mapSize.y - sidebarHeight, 80);
      var desiredY = visibleHeight / 2;
      var shiftDown = (mapSize.y / 2) - desiredY;
      var targetPoint = map.project(latlng, targetZoom).add(L.point(0, shiftDown));
      latlng = map.unproject(targetPoint, targetZoom);
    }

    map.flyTo(latlng, targetZoom, { duration: 0.5 });
  }

  function openWalk(routeId, index) {
    currentWalk = { routeId: routeId, index: index };
    updateMarkerIcons();
    onboardingEl.classList.add("hidden");
    openSidebarOnMobile();
    walkPickerEl.classList.add("hidden");
    renderWalkStep();
  }

  function exitWalk() {
    currentWalk = null;
    updateMarkerIcons();
    walkPickerEl.classList.remove("hidden");
    resetTopbar();
    detailsEl.innerHTML = DEFAULT_DETAILS;
  }

  function stepWalk(delta) {
    if (!currentWalk) { return; }
    var g = walkGroups[currentWalk.routeId];
    var next = currentWalk.index + delta;
    if (next < 0 || next >= g.points.length) { return; }
    currentWalk.index = next;
    updateMarkerIcons();
    renderWalkStep();
  }

  function renderWalkStep() {
    var g = walkGroups[currentWalk.routeId];
    var pt = g.points[currentWalk.index];
    var n = g.points.length;
    var atStart = currentWalk.index === 0;
    var atEnd = currentWalk.index === n - 1;

    var pct = n > 1 ? Math.round((currentWalk.index / (n - 1)) * 100) : 100;

    topbarTitleEl.textContent = g.name;
    topbarProgressEl.classList.add("active");
    topbarProgressFillEl.style.width = pct + "%";

    detailsEl.innerHTML =
      '<div class="walk-slideshow">' +
        '<div class="walk-slideshow-head">' +
          '<p class="walk-progress">Point ' + (currentWalk.index + 1) + " of " + n + "</p>" +
          '<button id="walk-exit" type="button" class="icon-btn" aria-label="Exit walk" title="Exit walk">&times;</button>' +
        "</div>" +
        "<h3>" + pt.title + "</h3>" +
        '<div class="video-placeholder" aria-label="Video placeholder for ' + pt.title + '">' +
          '<span class="play-icon" aria-hidden="true">&#9654;</span>' +
          '<span class="video-placeholder-label">Video coming soon</span>' +
        "</div>" +
        '<p class="desc">' + (pt.description || "") + "</p>" +
        '<div class="walk-controls">' +
          '<button id="walk-prev" type="button"' + (atStart ? " disabled" : "") + '>&larr; Prev</button>' +
          '<button id="walk-next" type="button"' + (atEnd ? " disabled" : "") + '>Next &rarr;</button>' +
        "</div>" +
        '<p class="meta walk-meta-footer">' + g.distanceKm + " km &middot; " + g.difficulty + "</p>" +
      "</div>";

    document.getElementById("walk-prev").addEventListener("click", function () { stepWalk(-1); });
    document.getElementById("walk-next").addEventListener("click", function () { stepWalk(1); });
    document.getElementById("walk-exit").addEventListener("click", exitWalk);

    flyToPoint(pt.lat, pt.lng, 14);
  }

  document.addEventListener("keydown", function (e) {
    if (!currentWalk) { return; }
    if (e.key === "ArrowRight") { stepWalk(1); }
    if (e.key === "ArrowLeft") { stepWalk(-1); }
  });

  function showDetails(title, meta, desc) {
    currentWalk = null;
    updateMarkerIcons();
    walkPickerEl.classList.remove("hidden");
    resetTopbar();
    detailsEl.innerHTML =
      "<h3>" + title + "</h3>" +
      (meta ? '<p class="meta">' + meta + "</p>" : "") +
      (desc ? '<p class="desc">' + desc + "</p>" : "");
  }

  function routeButtonsHtml(ids) {
    return ids.map(function (id) {
      var g = walkGroups[id];
      return '<li><button type="button" class="route-btn" data-route="' + id + '">' +
        '<span class="route-btn-name">' + g.name + "</span>" +
        '<span class="meta">' + g.distanceKm + " km &middot; " + g.difficulty + "</span>" +
        "</button></li>";
    }).join("");
  }

  function bindRouteButtons(container, ids) {
    ids.forEach(function (id) {
      var btn = container.querySelector('.route-btn[data-route="' + id + '"]');
      btn.addEventListener("click", function () { openWalk(id, 0); });
    });
  }

  function renderWalkList() {
    var ids = Object.keys(walkGroups);
    if (!ids.length) { return; }
    walkListEl.innerHTML = routeButtonsHtml(ids);
    bindRouteButtons(walkListEl, ids);
  }

  function renderOnboarding() {
    var ids = Object.keys(walkGroups);
    if (!ids.length) { return; }
    onboardingListEl.innerHTML = routeButtonsHtml(ids);
    bindRouteButtons(onboardingListEl, ids);
  }

  fetch("data/tdf-route.geojson")
    .then(function (r) { return r.json(); })
    .then(function (geojson) {
      L.geoJSON(geojson, {
        style: { color: "#c8102e", weight: 5, opacity: 0.85 },
        onEachFeature: function (feature, layer) {
          var p = feature.properties || {};
          layer.on("click", function () {
            showDetails(p.name || "Stage route", "", p.description || "");
          });
          layer.bindTooltip(p.name || "Stage route");
        }
      }).addTo(routeLayer);
    })
    .catch(function (err) { console.error("Failed to load route:", err); });

  fetch("data/stage-points.geojson")
    .then(function (r) { return r.json(); })
    .then(function (geojson) {
      L.geoJSON(geojson, {
        pointToLayer: function (feature, latlng) {
          var p = feature.properties || {};
          var color = pointColors[p.type] || "#1d2024";
          var radius = (p.type === "start" || p.type === "finish" || p.type === "kom") ? 9 : 6;
          return L.circleMarker(latlng, {
            radius: radius,
            fillColor: color,
            color: "#fff",
            weight: 2,
            fillOpacity: 1
          });
        },
        onEachFeature: function (feature, layer) {
          var p = feature.properties || {};
          var metaLabel = {
            start: "Start",
            finish: "Finish",
            kom: "Mountain pass",
            town: "On route",
            "feature-town": "On route"
          }[p.type] || "";
          layer.bindPopup("<h3>" + p.name + "</h3>" + (p.description ? "<p>" + p.description + "</p>" : ""));
          layer.on("click", function () {
            showDetails(p.name, metaLabel, p.description || "");
          });
        }
      }).addTo(pointsLayer);
    })
    .catch(function (err) { console.error("Failed to load stage points:", err); });

  fetch("data/walking-routes.geojson")
    .then(function (r) { return r.json(); })
    .then(function (geojson) {
      var byRoute = {};
      geojson.features.forEach(function (f) {
        var p = f.properties || {};
        var coords = f.geometry.coordinates;
        if (!byRoute[p.routeId]) {
          byRoute[p.routeId] = {
            routeId: p.routeId,
            name: p.routeName,
            distanceKm: p.distanceKm,
            difficulty: p.difficulty,
            points: []
          };
        }
        byRoute[p.routeId].points.push({
          order: p.order,
          title: p.title,
          description: p.description,
          lat: coords[1],
          lng: coords[0]
        });
      });

      Object.keys(byRoute).forEach(function (routeId) {
        var group = byRoute[routeId];
        group.points.sort(function (a, b) { return a.order - b.order; });

        var latlngs = group.points.map(function (pt) { return [pt.lat, pt.lng]; });
        var line = L.polyline(latlngs, { color: "#2f8f4e", weight: 4, opacity: 0.85, dashArray: "6 6" });
        line.bindTooltip(group.name);
        line.on("click", function () { openWalk(routeId, 0); });
        line.addTo(walksLayer);

        var markers = group.points.map(function (pt, idx) {
          var marker = L.marker([pt.lat, pt.lng], { icon: poiIcon(idx + 1, false) });
          marker.on("click", function () { openWalk(routeId, idx); });
          marker.addTo(walksLayer);
          return marker;
        });

        group.markers = markers;
        walkGroups[routeId] = group;
      });

      renderWalkList();
      renderOnboarding();
    })
    .catch(function (err) { console.error("Failed to load walking routes:", err); });

  // Mobile sidebar toggle
  var toggleBtn = document.getElementById("toggleSidebar");
  toggleBtn.addEventListener("click", function () {
    var collapsed = sidebar.classList.toggle("collapsed");
    toggleBtn.setAttribute("aria-expanded", String(!collapsed));
  });
  if (isMobileLayout()) {
    sidebar.classList.add("collapsed");
    toggleBtn.setAttribute("aria-expanded", "false");
  }
})();
