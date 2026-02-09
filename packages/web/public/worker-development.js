/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./service-worker/index.ts":
/*!*********************************!*\
  !*** ./service-worker/index.ts ***!
  \*********************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/// <reference lib=\"webworker\" />\n// Push notification handler\nself.addEventListener(\"push\", (event)=>{\n    if (!event.data) {\n        console.log(\"Push event received but no data\");\n        return;\n    }\n    try {\n        const data = event.data.json();\n        var _data_requireInteraction;\n        const options = {\n            body: data.body || \"\",\n            icon: data.icon || \"/icons/icon-192x192.png\",\n            badge: data.badge || \"/icons/icon-72x72.png\",\n            vibrate: data.vibrate || [\n                200,\n                100,\n                200\n            ],\n            tag: data.tag || \"default\",\n            requireInteraction: (_data_requireInteraction = data.requireInteraction) !== null && _data_requireInteraction !== void 0 ? _data_requireInteraction : true,\n            data: {\n                url: data.url || \"/\",\n                ...data.data\n            },\n            actions: data.actions || []\n        };\n        event.waitUntil(self.registration.showNotification(data.title || \"SkyTrack\", options));\n    } catch (error) {\n        console.error(\"Error parsing push data:\", error);\n    }\n});\n// Notification click handler\nself.addEventListener(\"notificationclick\", (event)=>{\n    var _event_notification_data;\n    event.notification.close();\n    const url = ((_event_notification_data = event.notification.data) === null || _event_notification_data === void 0 ? void 0 : _event_notification_data.url) || \"/\";\n    event.waitUntil(self.clients.matchAll({\n        type: \"window\",\n        includeUncontrolled: true\n    }).then((clientList)=>{\n        // Check if there's already an open window we can focus\n        for (const client of clientList){\n            if (client.url.includes(self.location.origin) && \"focus\" in client) {\n                client.focus();\n                // Navigate to the notification URL\n                if (\"navigate\" in client) {\n                    client.navigate(url);\n                }\n                return;\n            }\n        }\n        // No open window, open a new one\n        if (self.clients.openWindow) {\n            return self.clients.openWindow(url);\n        }\n    }));\n});\n// Notification close handler (optional analytics)\nself.addEventListener(\"notificationclose\", (event)=>{\n    console.log(\"Notification closed:\", event.notification.tag);\n});\n// Background sync for offline actions (optional)\nself.addEventListener(\"sync\", (event)=>{\n    if (event.tag === \"sync-pending-actions\") {\n        event.waitUntil(syncPendingActions());\n    }\n});\nasync function syncPendingActions() {\n    // Get pending actions from IndexedDB and sync them\n    console.log(\"Syncing pending actions...\");\n}\n\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zZXJ2aWNlLXdvcmtlci9pbmRleC50cyIsIm1hcHBpbmdzIjoiO0FBQUEsaUNBQWlDO0FBSWpDLDRCQUE0QjtBQUM1QkEsS0FBS0MsZ0JBQWdCLENBQUMsUUFBUSxDQUFDQztJQUM3QixJQUFJLENBQUNBLE1BQU1DLElBQUksRUFBRTtRQUNmQyxRQUFRQyxHQUFHLENBQUM7UUFDWjtJQUNGO0lBRUEsSUFBSTtRQUNGLE1BQU1GLE9BQU9ELE1BQU1DLElBQUksQ0FBQ0csSUFBSTtZQVFOSDtRQU50QixNQUFNSSxVQUErQjtZQUNuQ0MsTUFBTUwsS0FBS0ssSUFBSSxJQUFJO1lBQ25CQyxNQUFNTixLQUFLTSxJQUFJLElBQUk7WUFDbkJDLE9BQU9QLEtBQUtPLEtBQUssSUFBSTtZQUNyQkMsU0FBU1IsS0FBS1EsT0FBTyxJQUFJO2dCQUFDO2dCQUFLO2dCQUFLO2FBQUk7WUFDeENDLEtBQUtULEtBQUtTLEdBQUcsSUFBSTtZQUNqQkMsb0JBQW9CVixDQUFBQSwyQkFBQUEsS0FBS1Usa0JBQWtCLGNBQXZCVixzQ0FBQUEsMkJBQTJCO1lBQy9DQSxNQUFNO2dCQUNKVyxLQUFLWCxLQUFLVyxHQUFHLElBQUk7Z0JBQ2pCLEdBQUdYLEtBQUtBLElBQUk7WUFDZDtZQUNBWSxTQUFTWixLQUFLWSxPQUFPLElBQUksRUFBRTtRQUM3QjtRQUVBYixNQUFNYyxTQUFTLENBQ2JoQixLQUFLaUIsWUFBWSxDQUFDQyxnQkFBZ0IsQ0FBQ2YsS0FBS2dCLEtBQUssSUFBSSxZQUFZWjtJQUVqRSxFQUFFLE9BQU9hLE9BQU87UUFDZGhCLFFBQVFnQixLQUFLLENBQUMsNEJBQTRCQTtJQUM1QztBQUNGO0FBRUEsNkJBQTZCO0FBQzdCcEIsS0FBS0MsZ0JBQWdCLENBQUMscUJBQXFCLENBQUNDO1FBRzlCQTtJQUZaQSxNQUFNbUIsWUFBWSxDQUFDQyxLQUFLO0lBRXhCLE1BQU1SLE1BQU1aLEVBQUFBLDJCQUFBQSxNQUFNbUIsWUFBWSxDQUFDbEIsSUFBSSxjQUF2QkQsK0NBQUFBLHlCQUF5QlksR0FBRyxLQUFJO0lBRTVDWixNQUFNYyxTQUFTLENBQ2JoQixLQUFLdUIsT0FBTyxDQUFDQyxRQUFRLENBQUM7UUFBRUMsTUFBTTtRQUFVQyxxQkFBcUI7SUFBSyxHQUFHQyxJQUFJLENBQUMsQ0FBQ0M7UUFDekUsdURBQXVEO1FBQ3ZELEtBQUssTUFBTUMsVUFBVUQsV0FBWTtZQUMvQixJQUFJQyxPQUFPZixHQUFHLENBQUNnQixRQUFRLENBQUM5QixLQUFLK0IsUUFBUSxDQUFDQyxNQUFNLEtBQUssV0FBV0gsUUFBUTtnQkFDbEVBLE9BQU9JLEtBQUs7Z0JBQ1osbUNBQW1DO2dCQUNuQyxJQUFJLGNBQWNKLFFBQVE7b0JBQ3ZCQSxPQUF3QkssUUFBUSxDQUFDcEI7Z0JBQ3BDO2dCQUNBO1lBQ0Y7UUFDRjtRQUVBLGlDQUFpQztRQUNqQyxJQUFJZCxLQUFLdUIsT0FBTyxDQUFDWSxVQUFVLEVBQUU7WUFDM0IsT0FBT25DLEtBQUt1QixPQUFPLENBQUNZLFVBQVUsQ0FBQ3JCO1FBQ2pDO0lBQ0Y7QUFFSjtBQUVBLGtEQUFrRDtBQUNsRGQsS0FBS0MsZ0JBQWdCLENBQUMscUJBQXFCLENBQUNDO0lBQzFDRSxRQUFRQyxHQUFHLENBQUMsd0JBQXdCSCxNQUFNbUIsWUFBWSxDQUFDVCxHQUFHO0FBQzVEO0FBRUEsaURBQWlEO0FBQ2pEWixLQUFLQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUNDO0lBQzdCLElBQUlBLE1BQU1VLEdBQUcsS0FBSyx3QkFBd0I7UUFDeENWLE1BQU1jLFNBQVMsQ0FBQ29CO0lBQ2xCO0FBQ0Y7QUFFQSxlQUFlQTtJQUNiLG1EQUFtRDtJQUNuRGhDLFFBQVFDLEdBQUcsQ0FBQztBQUNkO0FBRVUiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vc2VydmljZS13b3JrZXIvaW5kZXgudHM/YTM0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBsaWI9XCJ3ZWJ3b3JrZXJcIiAvPlxuXG5kZWNsYXJlIGNvbnN0IHNlbGY6IFNlcnZpY2VXb3JrZXJHbG9iYWxTY29wZTtcblxuLy8gUHVzaCBub3RpZmljYXRpb24gaGFuZGxlclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdwdXNoJywgKGV2ZW50KSA9PiB7XG4gIGlmICghZXZlbnQuZGF0YSkge1xuICAgIGNvbnNvbGUubG9nKCdQdXNoIGV2ZW50IHJlY2VpdmVkIGJ1dCBubyBkYXRhJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YS5qc29uKCk7XG5cbiAgICBjb25zdCBvcHRpb25zOiBOb3RpZmljYXRpb25PcHRpb25zID0ge1xuICAgICAgYm9keTogZGF0YS5ib2R5IHx8ICcnLFxuICAgICAgaWNvbjogZGF0YS5pY29uIHx8ICcvaWNvbnMvaWNvbi0xOTJ4MTkyLnBuZycsXG4gICAgICBiYWRnZTogZGF0YS5iYWRnZSB8fCAnL2ljb25zL2ljb24tNzJ4NzIucG5nJyxcbiAgICAgIHZpYnJhdGU6IGRhdGEudmlicmF0ZSB8fCBbMjAwLCAxMDAsIDIwMF0sXG4gICAgICB0YWc6IGRhdGEudGFnIHx8ICdkZWZhdWx0JyxcbiAgICAgIHJlcXVpcmVJbnRlcmFjdGlvbjogZGF0YS5yZXF1aXJlSW50ZXJhY3Rpb24gPz8gdHJ1ZSxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgdXJsOiBkYXRhLnVybCB8fCAnLycsXG4gICAgICAgIC4uLmRhdGEuZGF0YSxcbiAgICAgIH0sXG4gICAgICBhY3Rpb25zOiBkYXRhLmFjdGlvbnMgfHwgW10sXG4gICAgfTtcblxuICAgIGV2ZW50LndhaXRVbnRpbChcbiAgICAgIHNlbGYucmVnaXN0cmF0aW9uLnNob3dOb3RpZmljYXRpb24oZGF0YS50aXRsZSB8fCAnU2t5VHJhY2snLCBvcHRpb25zKVxuICAgICk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcGFyc2luZyBwdXNoIGRhdGE6JywgZXJyb3IpO1xuICB9XG59KTtcblxuLy8gTm90aWZpY2F0aW9uIGNsaWNrIGhhbmRsZXJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbm90aWZpY2F0aW9uY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgZXZlbnQubm90aWZpY2F0aW9uLmNsb3NlKCk7XG5cbiAgY29uc3QgdXJsID0gZXZlbnQubm90aWZpY2F0aW9uLmRhdGE/LnVybCB8fCAnLyc7XG5cbiAgZXZlbnQud2FpdFVudGlsKFxuICAgIHNlbGYuY2xpZW50cy5tYXRjaEFsbCh7IHR5cGU6ICd3aW5kb3cnLCBpbmNsdWRlVW5jb250cm9sbGVkOiB0cnVlIH0pLnRoZW4oKGNsaWVudExpc3QpID0+IHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZXJlJ3MgYWxyZWFkeSBhbiBvcGVuIHdpbmRvdyB3ZSBjYW4gZm9jdXNcbiAgICAgIGZvciAoY29uc3QgY2xpZW50IG9mIGNsaWVudExpc3QpIHtcbiAgICAgICAgaWYgKGNsaWVudC51cmwuaW5jbHVkZXMoc2VsZi5sb2NhdGlvbi5vcmlnaW4pICYmICdmb2N1cycgaW4gY2xpZW50KSB7XG4gICAgICAgICAgY2xpZW50LmZvY3VzKCk7XG4gICAgICAgICAgLy8gTmF2aWdhdGUgdG8gdGhlIG5vdGlmaWNhdGlvbiBVUkxcbiAgICAgICAgICBpZiAoJ25hdmlnYXRlJyBpbiBjbGllbnQpIHtcbiAgICAgICAgICAgIChjbGllbnQgYXMgV2luZG93Q2xpZW50KS5uYXZpZ2F0ZSh1cmwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTm8gb3BlbiB3aW5kb3csIG9wZW4gYSBuZXcgb25lXG4gICAgICBpZiAoc2VsZi5jbGllbnRzLm9wZW5XaW5kb3cpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuY2xpZW50cy5vcGVuV2luZG93KHVybCk7XG4gICAgICB9XG4gICAgfSlcbiAgKTtcbn0pO1xuXG4vLyBOb3RpZmljYXRpb24gY2xvc2UgaGFuZGxlciAob3B0aW9uYWwgYW5hbHl0aWNzKVxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdub3RpZmljYXRpb25jbG9zZScsIChldmVudCkgPT4ge1xuICBjb25zb2xlLmxvZygnTm90aWZpY2F0aW9uIGNsb3NlZDonLCBldmVudC5ub3RpZmljYXRpb24udGFnKTtcbn0pO1xuXG4vLyBCYWNrZ3JvdW5kIHN5bmMgZm9yIG9mZmxpbmUgYWN0aW9ucyAob3B0aW9uYWwpXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ3N5bmMnLCAoZXZlbnQpID0+IHtcbiAgaWYgKGV2ZW50LnRhZyA9PT0gJ3N5bmMtcGVuZGluZy1hY3Rpb25zJykge1xuICAgIGV2ZW50LndhaXRVbnRpbChzeW5jUGVuZGluZ0FjdGlvbnMoKSk7XG4gIH1cbn0pO1xuXG5hc3luYyBmdW5jdGlvbiBzeW5jUGVuZGluZ0FjdGlvbnMoKSB7XG4gIC8vIEdldCBwZW5kaW5nIGFjdGlvbnMgZnJvbSBJbmRleGVkREIgYW5kIHN5bmMgdGhlbVxuICBjb25zb2xlLmxvZygnU3luY2luZyBwZW5kaW5nIGFjdGlvbnMuLi4nKTtcbn1cblxuZXhwb3J0IHt9O1xuIl0sIm5hbWVzIjpbInNlbGYiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJkYXRhIiwiY29uc29sZSIsImxvZyIsImpzb24iLCJvcHRpb25zIiwiYm9keSIsImljb24iLCJiYWRnZSIsInZpYnJhdGUiLCJ0YWciLCJyZXF1aXJlSW50ZXJhY3Rpb24iLCJ1cmwiLCJhY3Rpb25zIiwid2FpdFVudGlsIiwicmVnaXN0cmF0aW9uIiwic2hvd05vdGlmaWNhdGlvbiIsInRpdGxlIiwiZXJyb3IiLCJub3RpZmljYXRpb24iLCJjbG9zZSIsImNsaWVudHMiLCJtYXRjaEFsbCIsInR5cGUiLCJpbmNsdWRlVW5jb250cm9sbGVkIiwidGhlbiIsImNsaWVudExpc3QiLCJjbGllbnQiLCJpbmNsdWRlcyIsImxvY2F0aW9uIiwib3JpZ2luIiwiZm9jdXMiLCJuYXZpZ2F0ZSIsIm9wZW5XaW5kb3ciLCJzeW5jUGVuZGluZ0FjdGlvbnMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./service-worker/index.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	!function() {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = function() {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: function(script) { return script; }
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	!function() {
/******/ 		__webpack_require__.ts = function(script) { return __webpack_require__.tt().createScript(script); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	!function() {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push(function(options) {
/******/ 			var originalFactory = options.factory;
/******/ 			options.factory = function(moduleObject, moduleExports, webpackRequire) {
/******/ 				var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				var cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : function() {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./service-worker/index.ts");
/******/ 	
/******/ })()
;