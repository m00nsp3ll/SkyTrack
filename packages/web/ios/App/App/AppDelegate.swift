import UIKit
import WebKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
        application.registerForRemoteNotifications()

        // AirPrint bridge'i WebView'a inject et (Capacitor plugin sistemi remote URL'de çalışmıyor)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.setupAirPrintBridge()
        }

        return true
    }

    // MARK: - AirPrint Native Bridge
    private func setupAirPrintBridge() {
        guard let webView = self.getWebView() else {
            // WebView henüz hazır değilse tekrar dene
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { self.setupAirPrintBridge() }
            return
        }

        // JS handler ekle
        webView.configuration.userContentController.add(AirPrintHandler(), name: "airprint")

        // JS'e bridge fonksiyonunu inject et
        let js = """
        window._nativeAirPrint = function(html, jobName) {
            return new Promise(function(resolve, reject) {
                window._airprintResolve = resolve;
                window._airprintReject = reject;
                window.webkit.messageHandlers.airprint.postMessage({html: html, jobName: jobName || 'SkyTrack'});
            });
        };
        console.log('[AirPrint] Native bridge ready');
        """
        webView.evaluateJavaScript(js) { _, error in
            if let error = error {
                print("[AirPrint] JS inject error: \(error)")
            } else {
                print("[AirPrint] Bridge injected successfully")
            }
        }
    }

    private func getWebView() -> WKWebView? {
        let window = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })
        if let bridgeVC = window?.rootViewController as? CAPBridgeViewController {
            return bridgeVC.bridge?.webView
        }
        return nil
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs registration failed: \(error.localizedDescription)")
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("FCM Token: \(token)")

        // NotificationCenter ile native tarafta bildir
        NotificationCenter.default.post(
            name: Notification.Name("FCMToken"),
            object: nil,
            userInfo: ["token": token]
        )

        // Capacitor WebView'a JavaScript ile token'ı gönder
        // Birden fazla delay ile dene (WebView hazır olmayabilir)
        let delays: [Double] = [2.0, 5.0, 10.0, 20.0]
        for delay in delays {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                let window = UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .flatMap { $0.windows }
                    .first(where: { $0.isKeyWindow })
                if let rootVC = window?.rootViewController {
                    if let bridgeVC = rootVC as? CAPBridgeViewController {
                        let js = """
                        window._nativeFCMToken = '\(token)';
                        window.dispatchEvent(new CustomEvent('fcmToken', { detail: '\(token)' }));
                        window.dispatchEvent(new CustomEvent('nativeFCMToken', { detail: '\(token)' }));
                        """
                        bridgeVC.bridge?.webView?.evaluateJavaScript(js) { _, error in
                            if let error = error {
                                print("[FCM] JS eval error at \\(delay)s: \\(error)")
                            } else {
                                print("[FCM] token injected to WebView at \\(delay)s")
                            }
                        }
                    }
                }
            }
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        print("Notification tapped: \(userInfo)")
        completionHandler()
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        UIApplication.shared.applicationIconBadgeNumber = 0
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// MARK: - AirPrint WKScriptMessageHandler
class AirPrintHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let html = body["html"] as? String, !html.isEmpty else {
            resolveJS(message.webView, success: false, error: "html parameter required")
            return
        }

        let jobName = body["jobName"] as? String ?? "SkyTrack"

        DispatchQueue.main.async {
            let printController = UIPrintInteractionController.shared
            let printInfo = UIPrintInfo(dictionary: nil)
            printInfo.outputType = .general
            printInfo.jobName = jobName
            printController.printInfo = printInfo

            let formatter = UIMarkupTextPrintFormatter(markupText: html)
            formatter.perPageContentInsets = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
            printController.printFormatter = formatter

            let webView = message.webView

            let completion: UIPrintInteractionController.CompletionHandler = { _, completed, printError in
                if let printError = printError {
                    self.resolveJS(webView, success: false, error: printError.localizedDescription)
                } else {
                    self.resolveJS(webView, success: completed, error: nil)
                }
            }

            // Her zaman yazıcı seçme dialog'u göster (iOS son yazıcıyı otomatik hatırlar)
            let keyWindow = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first(where: { $0.isKeyWindow })
                ?? UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .flatMap { $0.windows }
                    .first

            if let rootView = keyWindow?.rootViewController?.view {
                let centerRect = CGRect(x: rootView.bounds.midX - 1, y: 50, width: 2, height: 2)
                printController.present(from: centerRect, in: rootView, animated: true, completionHandler: completion)
            } else {
                printController.present(animated: true, completionHandler: completion)
            }
        }
    }

    private func resolveJS(_ webView: WKWebView?, success: Bool, error: String?) {
        DispatchQueue.main.async {
            if success {
                webView?.evaluateJavaScript("window._airprintResolve && window._airprintResolve({completed: true})", completionHandler: nil)
            } else if let error = error {
                webView?.evaluateJavaScript("window._airprintReject && window._airprintReject(new Error('\(error)'))", completionHandler: nil)
            } else {
                webView?.evaluateJavaScript("window._airprintResolve && window._airprintResolve({completed: false, cancelled: true})", completionHandler: nil)
            }
        }
    }
}
