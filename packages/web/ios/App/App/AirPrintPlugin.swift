import Foundation
import Capacitor

@objc(AirPrintPlugin)
public class AirPrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AirPrintPlugin"
    public let jsName = "AirPrint"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    @objc func print(_ call: CAPPluginCall) {
        let html = call.getString("html") ?? ""
        let jobName = call.getString("jobName") ?? "SkyTrack"

        if html.isEmpty {
            call.reject("html parameter is required")
            return
        }

        DispatchQueue.main.async {
            let printController = UIPrintInteractionController.shared
            let printInfo = UIPrintInfo(dictionary: nil)
            printInfo.outputType = .general
            printInfo.jobName = jobName
            printController.printInfo = printInfo

            let formatter = UIMarkupTextPrintFormatter(markupText: html)
            formatter.perPageContentInsets = UIEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)
            printController.printFormatter = formatter

            let completion: UIPrintInteractionController.CompletionHandler = { _, completed, printError in
                if let printError = printError {
                    call.reject("Print error: \(printError.localizedDescription)")
                } else if completed {
                    call.resolve(["completed": true])
                } else {
                    call.resolve(["completed": false, "cancelled": true])
                }
            }

            let keyWindow = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first(where: { $0.isKeyWindow })
                ?? UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .flatMap { $0.windows }
                    .first

            if let rootView = keyWindow?.rootViewController?.view {
                printController.present(from: rootView.bounds, in: rootView, animated: true, completionHandler: completion)
            } else {
                printController.present(animated: true, completionHandler: completion)
            }
        }
    }
}
