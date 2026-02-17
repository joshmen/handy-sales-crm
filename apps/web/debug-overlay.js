/**
 * Debug script to identify blocking overlays
 * Run this in the browser DevTools console (F12 -> Console)
 */

// Find all fixed position elements that could be blocking
function findBlockingElements() {
  const allElements = document.querySelectorAll('*');
  const fixedElements = [];

  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const position = style.position;
    const zIndex = parseInt(style.zIndex) || 0;
    const pointerEvents = style.pointerEvents;
    const display = style.display;
    const visibility = style.visibility;
    const opacity = parseFloat(style.opacity);

    if ((position === 'fixed' || position === 'absolute') && display !== 'none' && visibility !== 'hidden') {
      const rect = el.getBoundingClientRect();
      const coversScreen = rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5;

      if (coversScreen || (rect.width === window.innerWidth && rect.height === window.innerHeight)) {
        fixedElements.push({
          element: el,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          position,
          zIndex,
          pointerEvents,
          opacity,
          width: rect.width,
          height: rect.height,
          rect
        });
      }
    }
  });

  // Sort by z-index (highest first)
  fixedElements.sort((a, b) => b.zIndex - a.zIndex);

  console.log('=== POTENTIAL BLOCKING ELEMENTS ===');
  console.log('Found', fixedElements.length, 'fixed elements covering the screen');

  fixedElements.forEach((item, index) => {
    console.log(`\n--- Element ${index + 1} ---`);
    console.log('Tag:', item.tagName);
    console.log('ID:', item.id || '(none)');
    console.log('Class:', item.className || '(none)');
    console.log('Z-Index:', item.zIndex);
    console.log('Pointer Events:', item.pointerEvents);
    console.log('Opacity:', item.opacity);
    console.log('Size:', Math.round(item.width) + 'x' + Math.round(item.height));
    console.log('Element:', item.element);

    // Highlight the element temporarily
    const oldOutline = item.element.style.outline;
    item.element.style.outline = '3px solid red';
    setTimeout(() => {
      item.element.style.outline = oldOutline;
    }, 3000);
  });

  return fixedElements;
}

// Run the function
const blocking = findBlockingElements();

// Quick fix: remove blocking elements temporarily
console.log('\n=== QUICK FIX ===');
console.log('To temporarily remove blocking elements, run:');
console.log('blocking.forEach(b => b.element.style.display = "none")');
