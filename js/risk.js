/* ==========================================================================
   Civic Sentinel - Analytics & Charts Visuals (risk.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the Risk Analysis page
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;

    // 1. Initialise and animate bar charts
    animateBarCharts();

    // 2. Initialise and animate SVG line charts
    animateLineChart();

    // 3. Initialise and animate speedometer gauges
    animateGauge();

    // 4. Animate stat score counters
    animateCounters();

    // Listen to theme change events to adjust stroke colors if needed
    window.addEventListener('themechanged', (e) => {
        const theme = e.detail;
        adjustChartColorsForTheme(theme);
    });
});

/**
 * Animates the CSS-based bar columns from height 0% to target heights
 */
function animateBarCharts() {
    const bars = document.querySelectorAll('.bar-chart-bar');
    bars.forEach(bar => {
        const targetHeight = bar.getAttribute('data-height');
        
        // Reset height to 0 first
        bar.style.height = '0%';
        
        // Trigger reflow/animation delay
        setTimeout(() => {
            bar.style.height = `${targetHeight}%`;
        }, 150);
    });
}

/**
 * Setup SVG Line chart strokes path transitions
 */
function animateLineChart() {
    const path = document.querySelector('.chart-line');
    const area = document.querySelector('.chart-area');
    if (!path) return;

    // Get the length of the path for dasharray animation
    const pathLength = path.getTotalLength();
    
    // Set up path stroke properties for transition
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    
    // Animate path stroke-dashoffset
    setTimeout(() => {
        path.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)';
        path.style.strokeDashoffset = '0';
    }, 200);

    // Animate points scaling sequentially
    const points = document.querySelectorAll('.chart-point');
    points.forEach((point, index) => {
        point.setAttribute('r', '0');
        setTimeout(() => {
            point.style.transition = 'r 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            point.setAttribute('r', '5');
        }, 800 + (index * 150));
    });
}

/**
 * Animate the gauge indicator values
 */
function animateGauge() {
    const gaugeFill = document.querySelector('.gauge-fill');
    if (!gaugeFill) return;

    // Circumference of semi-circle arc (pi * r) -> r = 80 => 251.3
    const maxCircumference = 251.3;
    
    // Set initial dasharray to show nothing (offset = full length)
    gaugeFill.style.strokeDasharray = `${maxCircumference} ${maxCircumference}`;
    gaugeFill.style.strokeDashoffset = maxCircumference;

    const targetVelocity = parseInt(gaugeFill.getAttribute('data-value') || '32');
    const maxVelocity = 60;
    const ratio = targetVelocity / maxVelocity;
    
    // Calculate new offset: mapping 0-1 ratio to 251.3 - 0 offset range
    const targetOffset = maxCircumference * (1 - ratio);

    setTimeout(() => {
        gaugeFill.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
        gaugeFill.style.strokeDashoffset = targetOffset;
    }, 300);
}

/**
 * Smooth counting effect for dashboard KPIs
 */
function animateCounters() {
    const counters = document.querySelectorAll('[data-counter-target]');
    
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-counter-target'));
        const prefix = counter.getAttribute('data-counter-prefix') || '';
        const suffix = counter.getAttribute('data-counter-suffix') || '';
        const duration = 1200; // ms
        const steps = 60;
        const stepTime = duration / steps;
        
        let current = 0;
        const increment = target / steps;
        let stepCount = 0;

        const timer = setInterval(() => {
            current += increment;
            stepCount++;
            
            if (stepCount >= steps) {
                clearInterval(timer);
                counter.innerHTML = `${prefix}${target}${suffix}`;
            } else {
                // Round depending on decimal requirement
                const formatted = Number.isInteger(target) ? Math.floor(current) : current.toFixed(1);
                counter.innerHTML = `${prefix}${formatted}${suffix}`;
            }
        }, stepTime);
    });
}

/**
 * Palette tuning for dark mode switching
 */
function adjustChartColorsForTheme(theme) {
    const path = document.querySelector('.chart-line');
    const points = document.querySelectorAll('.chart-point');
    
    if (!path) return;

    if (theme === 'dark') {
        path.style.stroke = '#38bdf8'; // sky blue for dark mode primary
        points.forEach(p => p.style.stroke = '#38bdf8');
    } else {
        path.style.stroke = '#002046'; // primary brand police blue
        points.forEach(p => p.style.stroke = '#002046');
    }
}
