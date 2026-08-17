/* ==========================================================================
   Section 6.4 Personnel Allocation Visualizer (allocationVisualizer.js)
   PravahAI - Integration module for backend API + client Leaflet mapping
   ========================================================================== */

const AllocationVisualizer = (() => {
    let map = null;
    let allocationLayerGroup = null;

    // Expanded sample default officers & hotspot locations around Nagpur metropolis
    const DEFAULT_OFFICERS = [
        { id: 'OFF_01', name: 'Squad Alpha (Insp. Patil)', current_lat: 21.1458, current_lon: 79.0882, status: 'available', max_radius_km: 15.0 },
        { id: 'OFF_02', name: 'Squad Beta (SI Kulkarni)', current_lat: 21.1430, current_lon: 79.0820, status: 'available', max_radius_km: 10.0 },
        { id: 'OFF_03', name: 'Squad Gamma (Constable Deshmukh)', current_lat: 21.1550, current_lon: 79.0750, status: 'available', max_radius_km: 12.0 },
        { id: 'OFF_04', name: 'Patrol Delta (SI Bendre)', current_lat: 21.1350, current_lon: 79.0980, status: 'available', max_radius_km: 20.0 },
        { id: 'OFF_05', name: 'Tactical Echo (Insp. Joshi)', current_lat: 21.1620, current_lon: 79.0920, status: 'available', max_radius_km: 10.0 },
        { id: 'OFF_06', name: 'Reserve Foxtrot (Constable Rao)', current_lat: 21.1280, current_lon: 79.0700, status: 'busy', max_radius_km: 8.0 },
        { id: 'OFF_07', name: 'Highway Mobile 1 (SI Shinde)', current_lat: 21.1020, current_lon: 79.0480, status: 'available', max_radius_km: 25.0 },
        { id: 'OFF_08', name: 'North Sector QRT (Insp. Wagh)', current_lat: 21.1820, current_lon: 79.0850, status: 'available', max_radius_km: 15.0 },
        { id: 'OFF_09', name: 'East Precinct Squad (SI Jadhav)', current_lat: 21.1480, current_lon: 79.1250, status: 'available', max_radius_km: 12.0 },
        { id: 'OFF_10', name: 'South Patrol Unit (Constable Chavan)', current_lat: 21.0950, current_lon: 79.0620, status: 'available', max_radius_km: 18.0 },
        { id: 'OFF_11', name: 'Traffic Control Alpha (Insp. More)', current_lat: 21.1390, current_lon: 79.0550, status: 'available', max_radius_km: 10.0 },
        { id: 'OFF_12', name: 'Metro Security Unit (SI Pawar)', current_lat: 21.1500, current_lon: 79.0880, status: 'available', max_radius_km: 8.0 },
        { id: 'OFF_13', name: 'Airport Rapid Response (Insp. Sawant)', current_lat: 21.0920, current_lon: 79.0500, status: 'busy', max_radius_km: 15.0 },
        { id: 'OFF_14', name: 'West Suburb Patrol (SI Kadam)', current_lat: 21.1680, current_lon: 79.0400, status: 'available', max_radius_km: 15.0 },
        { id: 'OFF_15', name: 'Central Reserve Squad (Constable Gaikwad)', current_lat: 21.1410, current_lon: 79.0800, status: 'available', max_radius_km: 12.0 }
    ];

    const DEFAULT_HOTSPOTS = [
        { id: 'LOC_01', name: 'Zero Mile Stone Junction', lat: 21.1458, lon: 79.0882, risk_score: 95.5 },
        { id: 'LOC_02', name: 'Variety Square Interchange', lat: 21.1430, lon: 79.0820, risk_score: 88.5 },
        { id: 'LOC_03', name: 'Sitabuldi Metro Interchange', lat: 21.1480, lon: 79.0850, risk_score: 92.0 },
        { id: 'LOC_04', name: 'Wardha Road Express Corridor', lat: 21.1250, lon: 79.0680, risk_score: 76.4 },
        { id: 'LOC_05', name: 'Dharampeth Commercial Market', lat: 21.1530, lon: 79.0650, risk_score: 64.0 },
        { id: 'LOC_06', name: 'Central Railway Station West Gate', lat: 21.1520, lon: 79.0980, risk_score: 81.2 },
        { id: 'LOC_07', name: 'Sadar Bazaar Promenade', lat: 21.1650, lon: 79.0820, risk_score: 58.0 },
        { id: 'LOC_08', name: 'Mihan IT Park Flyover', lat: 21.0750, lon: 79.0350, risk_score: 89.0 },
        { id: 'LOC_09', name: 'Automotive Square Kanhan Road', lat: 21.1950, lon: 79.0950, risk_score: 84.5 },
        { id: 'LOC_10', name: 'Kalamna Grain Market Junction', lat: 21.1600, lon: 79.1350, risk_score: 71.0 },
        { id: 'LOC_11', name: 'Medical College Hospital Square', lat: 21.1310, lon: 79.0920, risk_score: 94.0 },
        { id: 'LOC_12', name: 'Nagpur International Airport Gate', lat: 21.0900, lon: 79.0480, risk_score: 68.5 },
        { id: 'LOC_13', name: 'Manewada Ring Road Square', lat: 21.1100, lon: 79.1050, risk_score: 78.0 },
        { id: 'LOC_14', name: 'Mankapur Sports Complex Crossing', lat: 21.1800, lon: 79.0700, risk_score: 55.0 },
        { id: 'LOC_15', name: 'Amravati Road Bypass Junction', lat: 21.1550, lon: 79.0300, risk_score: 82.5 },
        { id: 'LOC_16', name: 'Reshimbagh Ground Area', lat: 21.1280, lon: 79.1120, risk_score: 62.0 },
        { id: 'LOC_17', name: 'Lakadganj Industrial Corridor', lat: 21.1450, lon: 79.1200, risk_score: 49.0 },
        { id: 'LOC_18', name: 'Ramdaspeth Multi-Specialty Belt', lat: 21.1380, lon: 79.0750, risk_score: 73.5 },
        { id: 'LOC_19', name: 'VNIT Engineering Campus Gate', lat: 21.1220, lon: 79.0520, risk_score: 42.0 },
        { id: 'LOC_20', name: 'Koradi Temple Pilgrimage Route', lat: 21.2200, lon: 79.0900, risk_score: 87.0 }
    ];

    /**
     * Haversine distance helper in JS
     */
    function haversineDist(lat1, lon1, lat2, lon2) {
        const R = 6371.0;
        const dlat = (lat2 - lat1) * Math.PI / 180;
        const dlon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dlat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dlon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Local JavaScript fallback algorithm implementation
     */
    function runLocalAllocation(officers, locations, strategy, alpha, defaultMaxRadius) {
        const availableOfficers = officers.filter(o => o.status === 'available');
        const assignments = [];
        const assignedOfficerIds = new Set();
        const coveredLocationIds = new Set();

        if (strategy === 'dynamic_priority_6_5') {
            const locMap = {};
            locations.forEach(l => { locMap[l.id] = l; });

            // 1. Lock officers assigned to high-risk zones (risk >= 70)
            for (const off of availableOfficers) {
                if (off.assigned_location_id && locMap[off.assigned_location_id]) {
                    const loc = locMap[off.assigned_location_id];
                    if (loc.risk_score >= 70.0) {
                        const dist = haversineDist(off.current_lat, off.current_lon, loc.lat, loc.lon);
                        assignedOfficerIds.add(off.id);
                        coveredLocationIds.add(loc.id);
                        assignments.push({
                            officer_id: off.id,
                            officer_name: off.name,
                            officer_start: [off.current_lat, off.current_lon],
                            location_id: loc.id,
                            location_name: loc.name,
                            location_coords: [loc.lat, loc.lon],
                            risk_score: loc.risk_score,
                            distance_km: Math.round(dist * 100) / 100,
                            protection_status: 'locked_high_risk_post'
                        });
                    }
                }
            }

            // 2. Uncovered locations sorted by 6.5 risk score
            const uncoveredLocs = locations.filter(l => !coveredLocationIds.has(l.id))
                                           .sort((a, b) => b.risk_score - a.risk_score);

            // 3. Dispatch remaining officers prioritizing Distance over Risk Score
            for (const loc of uncoveredLocs) {
                const candidates = availableOfficers.filter(o => !assignedOfficerIds.has(o.id));
                if (candidates.length === 0) break;

                let bestOff = null;
                let minD = Infinity;
                for (const off of candidates) {
                    const rLimit = off.max_radius_km || defaultMaxRadius;
                    const d = haversineDist(off.current_lat, off.current_lon, loc.lat, loc.lon);
                    if (d <= rLimit && d < minD) {
                        minD = d;
                        bestOff = off;
                    }
                }
                if (bestOff) {
                    assignedOfficerIds.add(bestOff.id);
                    coveredLocationIds.add(loc.id);
                    assignments.push({
                        officer_id: bestOff.id,
                        officer_name: bestOff.name,
                        officer_start: [bestOff.current_lat, bestOff.current_lon],
                        location_id: loc.id,
                        location_name: loc.name,
                        location_coords: [loc.lat, loc.lon],
                        risk_score: loc.risk_score,
                        distance_km: Math.round(minD * 100) / 100,
                        protection_status: 'dynamically_dispatched'
                    });
                }
            }
        } else if (strategy === 'greedy') {
            const sortedLocs = [...locations].sort((a, b) => b.risk_score - a.risk_score);
            for (const loc of sortedLocs) {
                let bestOff = null;
                let minD = Infinity;
                for (const off of availableOfficers) {
                    if (assignedOfficerIds.has(off.id)) continue;
                    const rLimit = off.max_radius_km || defaultMaxRadius;
                    const d = haversineDist(off.current_lat, off.current_lon, loc.lat, loc.lon);
                    if (d <= rLimit && d < minD) {
                        minD = d;
                        bestOff = off;
                    }
                }
                if (bestOff) {
                    assignedOfficerIds.add(bestOff.id);
                    coveredLocationIds.add(loc.id);
                    assignments.push({
                        officer_id: bestOff.id,
                        officer_name: bestOff.name,
                        officer_start: [bestOff.current_lat, bestOff.current_lon],
                        location_id: loc.id,
                        location_name: loc.name,
                        location_coords: [loc.lat, loc.lon],
                        risk_score: loc.risk_score,
                        distance_km: Math.round(minD * 100) / 100
                    });
                }
            }
        } else {
            // SciPy matching fallback
            const pairs = [];
            const risks = locations.map(l => l.risk_score);
            const minR = Math.min(...risks), maxR = Math.max(...risks);
            
            for (const off of availableOfficers) {
                const rLimit = off.max_radius_km || defaultMaxRadius;
                for (const loc of locations) {
                    const dist = haversineDist(off.current_lat, off.current_lon, loc.lat, loc.lon);
                    if (dist > rLimit) continue;
                    
                    const normR = maxR > minR ? (loc.risk_score - minR) / (maxR - minR) : 1.0;
                    const normD = Math.min(dist / rLimit, 1.0);
                    let cost = alpha * (1.0 - normR) + (1.0 - alpha) * normD;

                    if (off.assigned_location_id === loc.id && loc.risk_score >= 70.0) {
                        cost -= 0.5; // Lock retention bonus
                    }

                    pairs.push({ off, loc, dist, cost });
                }
            }

            pairs.sort((a, b) => a.cost - b.cost);

            for (const p of pairs) {
                if (assignedOfficerIds.has(p.off.id) || coveredLocationIds.has(p.loc.id)) continue;
                assignedOfficerIds.add(p.off.id);
                coveredLocationIds.add(p.loc.id);
                assignments.push({
                    officer_id: p.off.id,
                    officer_name: p.off.name,
                    officer_start: [p.off.current_lat, p.off.current_lon],
                    location_id: p.loc.id,
                    location_name: p.loc.name,
                    location_coords: [p.loc.lat, p.loc.lon],
                    risk_score: p.loc.risk_score,
                    distance_km: Math.round(p.dist * 100) / 100
                });
            }
        }

        const unassignedOfficers = officers.filter(o => !assignedOfficerIds.has(o.id));
        const uncoveredLocations = locations.filter(l => !coveredLocationIds.has(l.id));

        const totalRisk = assignments.reduce((acc, a) => acc + a.risk_score, 0);
        const avgDist = assignments.length ? assignments.reduce((acc, a) => acc + a.distance_km, 0) / assignments.length : 0;

        return {
            summary: {
                total_officers: officers.length,
                assigned_officers: assignments.length,
                total_locations: locations.length,
                covered_locations: assignments.length,
                total_risk_covered: Math.round(totalRisk * 10) / 10,
                average_travel_distance_km: Math.round(avgDist * 100) / 100
            },
            assignments,
            unassigned_officers: unassignedOfficers,
            uncovered_locations: uncoveredLocations
        };
    }

    /**
     * Executes allocation via Python API server or fallback
     */
    async function requestAllocation(payload) {
        try {
            const resp = await fetch('http://localhost:5000/api/allocate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(3000)
            });
            if (!resp.ok) throw new Error(`API response status ${resp.status}`);
            const data = await resp.json();
            data._backend = 'Python SciPy Server (Port 5000)';
            return data;
        } catch (err) {
            console.warn('[AllocationVisualizer] Backend API offline/unreachable. Utilizing high-precision client engine fallback.', err.message);
            const fallbackData = runLocalAllocation(
                payload.officers,
                payload.locations,
                payload.strategy,
                payload.alpha,
                payload.default_max_radius_km
            );
            fallbackData._backend = 'Client JS Fallback Engine';
            return fallbackData;
        }
    }

    /**
     * Render Leaflet map markers and vector lines
     */
    function renderMapVisualization(mapInstance, result) {
        if (!mapInstance || typeof L === 'undefined') return;
        
        if (!allocationLayerGroup) {
            allocationLayerGroup = L.layerGroup().addTo(mapInstance);
        } else {
            allocationLayerGroup.clearLayers();
        }

        // Custom Leaflet DivIcons
        const officerIcon = L.divIcon({
            className: 'custom-officer-pin',
            html: `<div style="background: var(--color-primary, #002046); color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.3);">
                     <span class="material-symbols-outlined" style="font-size: 16px;">local_police</span>
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const hotspotIcon = (risk) => {
            const color = risk > 80 ? '#ba1a1a' : (risk > 60 ? '#ff7816' : '#1b6d24');
            return L.divIcon({
                className: 'custom-hotspot-pin',
                html: `<div style="background: ${color}; color: white; border: 2px solid white; border-radius: 6px; padding: 2px 6px; font-weight: 700; font-size: 11px; box-shadow: 0 3px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">
                         <span class="material-symbols-outlined" style="font-size: 13px;">warning</span> ${Math.round(risk)}
                       </div>`,
                iconSize: [48, 24],
                iconAnchor: [24, 12]
            });
        };

        // Render Vector Lines for assignments
        const latLngs = [];

        result.assignments.forEach((asgn) => {
            const start = asgn.officer_start;
            const end = asgn.location_coords;

            latLngs.push(start, end);

            // Vector line connecting officer to hotspot
            const line = L.polyline([start, end], {
                color: '#1b365d',
                weight: 3,
                opacity: 0.85,
                dashArray: '8, 6'
            });

            line.bindPopup(`
                <div style="font-family: Inter, sans-serif; padding: 4px;">
                    <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 4px;">
                        Allocation Vector
                    </div>
                    <div><strong>Officer:</strong> ${asgn.officer_name}</div>
                    <div><strong>Target:</strong> ${asgn.location_name}</div>
                    <div><strong>Distance:</strong> ${asgn.distance_km} km</div>
                    <div><strong>Risk Score:</strong> ${asgn.risk_score}</div>
                </div>
            `);

            allocationLayerGroup.addLayer(line);

            // Officer marker
            const offMarker = L.marker(start, { icon: officerIcon });
            offMarker.bindPopup(`<strong>${asgn.officer_name}</strong><br/>Status: Assigned`);
            allocationLayerGroup.addLayer(offMarker);

            // Hotspot marker
            const locMarker = L.marker(end, { icon: hotspotIcon(asgn.risk_score) });
            locMarker.bindPopup(`<strong>${asgn.location_name}</strong><br/>Risk Score: ${asgn.risk_score}`);
            allocationLayerGroup.addLayer(locMarker);
        });

        // Add uncovered hotspots in grey/muted icon
        result.uncovered_locations.forEach((loc) => {
            const mutedIcon = L.divIcon({
                className: 'custom-uncovered-pin',
                html: `<div style="background: #74777f; color: white; border: 1px solid white; border-radius: 4px; padding: 2px 4px; font-size: 10px;">
                         ${loc.name} (${Math.round(loc.risk_score)})
                       </div>`,
                iconSize: [60, 20]
            });
            const m = L.marker([loc.lat, loc.lon], { icon: mutedIcon });
            m.bindPopup(`<strong>${loc.name}</strong><br/>Status: Uncovered<br/>Risk: ${loc.risk_score}`);
            allocationLayerGroup.addLayer(m);
        });

        if (latLngs.length > 0) {
            mapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
        }
    }

    return {
        DEFAULT_OFFICERS,
        DEFAULT_HOTSPOTS,
        requestAllocation,
        renderMapVisualization
    };
})();
