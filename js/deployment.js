/* ==========================================================================
   Civic Sentinel - Deployments & Officers Directory (deployment.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the deployments page
    const deploymentTable = document.getElementById('deployment-table-body');
    if (!deploymentTable) return;

    // Simulated State Database
    let officers = [
        { id: 'NP-1024', name: 'Inspector Sanjay Patil', sector: 'Sitabuldi', unit: 'Squad Alpha', status: 'Active', battery: '95%', contact: '+91 98765 00010' },
        { id: 'NP-1085', name: 'SI Anjali Deshmukh', sector: 'Zero Mile', unit: 'Squad Beta', status: 'Active', battery: '82%', contact: '+91 98765 00011' },
        { id: 'NP-2041', name: 'Officer Rajesh Thapar', sector: 'Wardha Road', unit: 'Squad Gamma', status: 'Standby', battery: '44%', contact: '+91 98765 00012' },
        { id: 'NP-3052', name: 'Officer Vinod Kamble', sector: 'Sadar Junction', unit: 'Squad Alpha', status: 'Active', battery: '99%', contact: '+91 98765 00013' },
        { id: 'NP-1102', name: 'SI Priyesh Shah', sector: 'Sitabuldi', unit: 'Squad Beta', status: 'Off-Duty', battery: '0%', contact: '+91 98765 00014' },
        { id: 'NP-2289', name: 'Officer Meera Bai', sector: 'Zero Mile', unit: 'Squad Gamma', status: 'Active', battery: '68%', contact: '+91 98765 00015' }
    ];

    // DOM Elements
    const searchInput = document.getElementById('officer-search');
    const sectorFilter = document.getElementById('sector-filter');
    const statusFilter = document.getElementById('status-filter');
    const reassignModal = document.getElementById('reassign-modal');
    const reassignForm = document.getElementById('reassign-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');

    let currentEditingOfficerId = null;

    // Initial table render
    renderTable();

    // Event Listeners
    if (searchInput) searchInput.addEventListener('input', renderTable);
    if (sectorFilter) sectorFilter.addEventListener('change', renderTable);
    if (statusFilter) statusFilter.addEventListener('change', renderTable);
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

    if (reassignForm) {
        reassignForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveReassignment();
        });
    }

    // Render Officer Table rows
    function renderTable() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const sectorVal = sectorFilter ? sectorFilter.value : 'all';
        const statusVal = statusFilter ? statusFilter.value : 'all';

        deploymentTable.innerHTML = '';

        const filtered = officers.filter(officer => {
            const matchesQuery = officer.name.toLowerCase().includes(query) || officer.id.toLowerCase().includes(query);
            const matchesSector = sectorVal === 'all' || officer.sector === sectorVal;
            const matchesStatus = statusVal === 'all' || officer.status === statusVal;
            return matchesQuery && matchesSector && matchesStatus;
        });

        if (filtered.length === 0) {
            deploymentTable.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--color-outline); padding: var(--spacing-gutter);">No officers matching filter criteria found.</td>
                </tr>
            `;
            return;
        }

        filtered.forEach(officer => {
            const tr = document.createElement('tr');
            
            // Badge design
            let badgeClass = 'badge-system';
            if (officer.status === 'Active') badgeClass = 'badge-success';
            else if (officer.status === 'Standby') badgeClass = 'badge-elevated';
            else badgeClass = 'badge-system';

            // Battery level check
            let batteryColor = 'inherit';
            const batteryInt = parseInt(officer.battery);
            if (batteryInt > 70) batteryColor = 'var(--color-secondary)';
            else if (batteryInt > 30) batteryColor = 'var(--color-tertiary-container)';
            else if (batteryInt > 0) batteryColor = 'var(--color-error)';

            tr.innerHTML = `
                <td style="font-weight: 700;">${officer.id}</td>
                <td>
                    <div style="font-weight: 600;">${officer.name}</div>
                    <div style="font-size: 11px; color: var(--color-on-surface-variant);">${officer.contact}</div>
                </td>
                <td><strong style="color: var(--color-primary);">${officer.sector}</strong></td>
                <td>${officer.unit}</td>
                <td><span class="badge ${badgeClass}">${officer.status}</span></td>
                <td style="font-weight: 600; color: ${batteryColor};">
                    <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">battery_profile</span>
                    ${officer.battery}
                </td>
                <td>
                    <button class="btn btn-ghost reassign-btn" data-id="${officer.id}" style="padding: 4px 8px; font-size: 11px;">
                        Reassign
                    </button>
                </td>
            `;

            // Assign listener to button
            tr.querySelector('.reassign-btn').addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                showReassignModal(id);
            });

            deploymentTable.appendChild(tr);
        });

        // Update active stats totals on the side
        updateStatsSummary();
    }

    function showReassignModal(officerId) {
        const officer = officers.find(o => o.id === officerId);
        if (!officer) return;

        currentEditingOfficerId = officerId;
        
        // Fill form fields
        document.getElementById('reassign-officer-name').textContent = officer.name;
        document.getElementById('reassign-sector').value = officer.sector;
        document.getElementById('reassign-unit').value = officer.unit;
        document.getElementById('reassign-status').value = officer.status;

        reassignModal.classList.add('active');
    }

    function hideModal() {
        reassignModal.classList.remove('active');
        currentEditingOfficerId = null;
    }

    function saveReassignment() {
        const officer = officers.find(o => o.id === currentEditingOfficerId);
        if (!officer) return;

        // Extract values
        const newSector = document.getElementById('reassign-sector').value;
        const newUnit = document.getElementById('reassign-unit').value;
        const newStatus = document.getElementById('reassign-status').value;

        // Apply state changes
        const oldSector = officer.sector;
        officer.sector = newSector;
        officer.unit = newUnit;
        officer.status = newStatus;
        if (newStatus === 'Off-Duty') {
            officer.battery = '0%';
        } else if (officer.battery === '0%') {
            officer.battery = '100%';
        }

        renderTable();
        hideModal();

        // Dispatch alert system
        window.dispatchSystemAlert(
            'Deployment Updated',
            `${officer.name} reassigned from ${oldSector} to ${newSector} (${newUnit})`,
            'info'
        );
    }

    function updateStatsSummary() {
        const activeCount = officers.filter(o => o.status === 'Active').length;
        const standbyCount = officers.filter(o => o.status === 'Standby').length;
        
        const countSpan = document.getElementById('active-officers-count');
        if (countSpan) {
            countSpan.textContent = activeCount;
        }

        const percentageSpan = document.getElementById('active-deployment-pct');
        if (percentageSpan) {
            const pct = Math.round((activeCount / (officers.length - officers.filter(o => o.status === 'Off-Duty').length)) * 100);
            percentageSpan.textContent = `${pct}% Deployment`;
        }
    }
});
