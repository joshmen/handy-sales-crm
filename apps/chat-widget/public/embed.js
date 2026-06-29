/**
 * embed.js : loader del widget "Preguntale a Handy" para cualquier sitio.
 *
 * Uso (una sola etiqueta, diferida, sin acoplarse al React del host):
 *   <script async src="https://TU-WIDGET/embed.js"></script>
 *
 * Inyecta un iframe aislado (origen del widget) anclado abajo a la derecha. El
 * iframe deriva su origen del src de este script. El widget avisa por postMessage
 * cuando se abre/cierra para que el iframe se redimensione (cerrado = solo la
 * burbuja, abierto = panel). No bloquea el resto de la pagina cuando esta cerrado.
 */
(function () {
  'use strict';

  if (window.__handyWidgetLoaded) return;
  window.__handyWidgetLoaded = true;

  var current = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  var origin = '';
  try { origin = new URL(current.src).origin; } catch (e) { return; }

  var CLOSED = { w: '112px', h: '112px' };
  var OPEN = { w: '400px', h: '680px' };

  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed';
  iframe.title = 'Chat de Handy Suites';
  iframe.setAttribute('aria-label', 'Chat de Handy Suites');
  iframe.allowTransparency = true;
  iframe.style.cssText = [
    'position:fixed',
    'bottom:0',
    'right:0',
    'border:0',
    'width:' + CLOSED.w,
    'height:' + CLOSED.h,
    'max-width:100vw',
    'max-height:100vh',
    'z-index:2147483000',
    'background:transparent',
    'box-shadow:none',
    'transition:width .25s ease, height .25s ease'
  ].join(';');

  function mount() { if (document.body) document.body.appendChild(iframe); }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  window.addEventListener('message', function (e) {
    if (origin && e.origin !== origin) return;
    var d = e.data;
    if (!d || d.source !== 'handysuites-widget') return;
    if (d.open) {
      iframe.style.width = OPEN.w;
      iframe.style.height = OPEN.h;
    } else {
      iframe.style.width = CLOSED.w;
      iframe.style.height = CLOSED.h;
    }
  });
})();
